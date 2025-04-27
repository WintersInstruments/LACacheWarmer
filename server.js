const puppeteerExtra = require("puppeteer-extra");
const puppeteerCore = require("puppeteer-core");
const puppeteerExtraPluginStealth = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const cron = require("node-cron");
const path = require("path");

const graphQLendpoint = "https://api.winters.lat/graphql";
const allProductsQuery =
  "cfd13620d7a93c932643d3d1221b56328c1da5a98e3600a234ad9a0d92fc0bc0";

// Apply the stealth plugin to puppeteer-extra
puppeteerExtra.use(puppeteerExtraPluginStealth());

// Function to visit and warm other pages' cache
const otherPagesToBeWarmed = async (page) => {
  const pagesToWarm = [
    "https://www.winters.lat/productos/eventos",
    "https://www.winters.lat/proyectos",
    "https://www.winters.lat/catalogos-y-folletos",
    "https://www.winters.lat/manuales",
  ];

  try {
    // Loop through all the pages
    for (const url of pagesToWarm) {
      try {
        console.log(`🚀 Visiting page: ${url}`);

        // Set request interception with proper headers **before** navigating
        await page.setRequestInterception(true);
        page.on("request", (request) => {
          if (request.url().includes("api.winters.lat")) {
            const modifiedHeaders = Object.assign({}, request.headers(), {
              "Cache-Control":
                "public, max-age=300, s-maxage=300, stale-while-revalidate=999999999999999999999999", // Cache-Control header
              Vary: "Origin, Accept-Encoding", // Vary header
              Referer: "https://www.winters.lat", // Referer header
              Origin: "https://www.winters.lat", // Origin header
            });
            request.continue({ headers: modifiedHeaders });
          } else {
            request.continue(); // Continue without modifying headers for other requests
          }
        });

        // Now go to the page with the cache control headers
        await page.goto(url, {
          waitUntil: "networkidle2", // Ensure that the page finishes loading
          timeout: 20000, // 20 seconds timeout
        });
        console.log(`✅ Cache warmed for page: ${url}`);
      } catch (err) {
        console.error(`Error warming cache for page ${url}:`, err.message);
      }

      // Add a 2-second interval between requests
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay
    }
  } catch (err) {
    console.error("Error in warming other pages cache:", err.message);
  }
};

// Function to warm product cache
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
          queryId: allProductsQuery,
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

  const chromiumPath = path.join(
    process.env.GITHUB_WORKSPACE,
    "chromium/chrome-linux/chrome"
  );
  
  // Launch Puppeteer with stealth plugin
  const browser = await puppeteerExtra.launch({
    headless: true,
    executablePath: chromiumPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Set request interception **before** navigating to ensure all requests are captured
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.url().includes("api.winters.lat")) {
      // Modify headers only for URLs that include www.winters.lat
      const modifiedHeaders = Object.assign({}, request.headers(), {
        "Cache-Control":
          "public, max-age=300, s-maxage=300, stale-while-revalidate=999999999999999999999999", // Cache-Control header
        Referer: "https://www.winters.lat", // Referer header
      });
      request.continue({ headers: modifiedHeaders });
    } else {
      request.continue(); // Continue without modifying headers for other requests
    }
  });

  // Warm cache for each product slug
  for (const slug of allSlugs) {
    try {
      await page.goto(`https://www.winters.lat/productos/${slug}`, {
        waitUntil: "networkidle2",
        timeout: 20000,
      });
      console.log(`✅ Cache warmed for product: ${slug}`);
    } catch (err) {
      console.error(`Error warming cache for product ${slug}:`, err.message);
    }

    // Add a 2-second interval between requests
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay
  }

  await browser.close();
};

module.exports = { warmProductCache, otherPagesToBeWarmed };
