const puppeteer = require("puppeteer");
const axios = require("axios");
const cron = require("node-cron");

const graphQLendpoint = "https://api.winters.lat/graphql";
const queryId =
  "cfd13620d7a93c932643d3d1221b56328c1da5a98e3600a234ad9a0d92fc0bc0"; // Replace with actual query ID

// Step 1: Fetch product IDs and slugs
const warmProductCache = async () => {
  let allIds = []; // Array to store database IDs
  let allSlugs = []; // Array to store slugs for each
  let hasNextPage = true;
  let endCursor = null;

  console.log("🔥 Starting cache warmer...");

  // Fetching all the product databaseIds and slugs
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
        const databaseId = node.databaseId; // Fetching databaseId
        const slug = node.products.productSlug; // Fetching productSlug from the correct path
        if (databaseId != null && slug != null) {
          allIds.push(databaseId); // Push databaseId to array
          allSlugs.push(slug); // Push productSlug to array
        }
      });

      hasNextPage = data.products.pageInfo.hasNextPage;
      endCursor = data.products.pageInfo.endCursor;
    } catch (err) {
      console.error("Error fetching product list:", err.message);
      break;
    }
  }

  console.log(
    `✅ Found ${allIds.length} products (by ID) and slugs. Warming cache...`
  );

  // Step 2: Launch Puppeteer browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Step 3: Add custom headers to requests
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    // Modify request headers to add the Cache-Control header
    const modifiedHeaders = Object.assign({}, request.headers(), {
      "Cache-Control":
        "public, max-age=60, s-maxage=60, stale-while-revalidate=999999999999999999999999",
    });

    request.continue({ headers: modifiedHeaders });
  });

  // Step 4: Loop through all slugs and warm the cache by visiting product pages
  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i];
    const slug = allSlugs[i];

    try {
      // Construct the URL for the product page using the slug
      const productUrl = `https://www.winters.lat/productos/${slug}`;

      // Log the URL we're visiting
      console.log(`🚀 Visiting product page: ${productUrl}`);

      // Navigate to the product page with the modified headers
      await page.goto(productUrl, { waitUntil: "networkidle2" });

      console.log(`✅ Cache warmed for product ID: ${id} with slug: ${slug}`);
    } catch (err) {
      console.error(
        `Error warming cache for product ID ${id} (slug: ${slug}):`,
        err.message
      );
    }
  }

  // Step 5: Close the browser after warming cache for all products
  await browser.close();

  console.log("✅ All cache warming tasks are complete.");
};

// Run cache warmer every 1 minute
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
