const puppeteer = require('puppeteer-core'); // Keep puppeteer-core
const axios = require('axios');
const cron = require('node-cron');

const graphQLendpoint = "https://api.winters.lat/graphql";
const queryId = "cfd13620d7a93c932643d3d1221b56328c1da5a98e3600a234ad9a0d92fc0bc0"; 

const warmProductCache = async () => {
  let allIds = [];
  let allSlugs = [];
  let hasNextPage = true;
  let endCursor = null;

  console.log("🔥 Starting cache warmer...");

  while (hasNextPage) {
    try {
      const response = await axios.get(graphQLendpoint, {
        params: {
          queryId: queryId,
          variables: JSON.stringify({
            first: 50,
            after: endCursor,
          }),
        },
      });

      const data = response.data.data;
      const products = data.products.nodes;

      products.forEach((node) => {
        const databaseId = node.databaseId;
        const slug = node.products.productSlug;
        if (databaseId != null && slug != null) {
          allIds.push(databaseId);
          allSlugs.push(slug);
        }
      });

      hasNextPage = data.products.pageInfo.hasNextPage;
      endCursor = data.products.pageInfo.endCursor;
    } catch (err) {
      console.error("Error fetching product list:", err.message);
      break;
    }
  }

  console.log(`✅ Found ${allIds.length} products. Warming cache...`);

  // Launch Puppeteer with executablePath pointing to the downloaded Chromium or Chrome binary
  const browser = await puppeteer.launch({
    headless: true, // run in headless mode (no GUI)
    executablePath: '/usr/bin/chromium',  // Path for Chromium installed in Render  // Adjust the path for Chrome/Chromium on your machine
    // On Linux, it might be something like: '/usr/bin/chromium-browser'
    // On macOS, it might be something like: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const modifiedHeaders = Object.assign({}, request.headers(), {
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=999999999999999999999999",
    });
    request.continue({ headers: modifiedHeaders });
  });

  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i];
    const slug = allSlugs[i];
    try {
      const productUrl = `https://www.winters.lat/productos/${slug}`;
      console.log(`🚀 Visiting product page: ${productUrl}`);
      await page.goto(productUrl, { waitUntil: "networkidle2" });
      console.log(`✅ Cache warmed for product ID: ${id} with slug: ${slug}`);
    } catch (err) {
      console.error(`Error warming cache for product ID ${id} (slug: ${slug}):`, err.message);
    }
  }

  await browser.close();
  console.log("✅ All cache warming tasks are complete.");
};

// Run the cache warmer every 3 hours
cron.schedule("0 */3 * * *", async () => {
  console.log("⏰ Running scheduled cache warmer...");
  try {
    await warmProductCache();
  } catch (err) {
    console.error("💥 Error running scheduled cache warmer:", err);
  }
});

// START IMMEDIATELY FOR TESTING
warmProductCache();
