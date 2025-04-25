const puppeteer = require("puppeteer-core"); // Keep puppeteer-core
const axios = require("axios");
const cron = require("node-cron");
const path = require("path"); // Import path module

const graphQLendpoint = "https://api.winters.lat/graphql";
const allProductsQuery =
  "cfd13620d7a93c932643d3d1221b56328c1da5a98e3600a234ad9a0d92fc0bc0";
const getCatalogsBrochureQuery =
  "9a1281d91957d56c729efa6e6c7517f2450f1b86f598fe8793ec35d080680c41";
const getManualsIDquery =
  "58240fe0c6a2ccb6a6fb897c5479575ab64bf423f8d2eedd464ba6817d3af9ff";
const getEventsIDquery =
  "9661201502b31a09d1d48ba9fc13923a05b3c17907cb3b7592f2f5844589490f";
const getProjectReferencesquery =
  "0402adbd5635adfc6ab5b9d16e344a92a5b47c7c00ccf1045f73004a90ee63d3";

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
        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 120000, // 120 seconds timeout
        });
        console.log(`✅ Cache warmed for page: ${url}`);
      } catch (err) {
        console.error(`Error warming cache for page ${url}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error in warming other pages cache:", err.message);
  }
};

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

  // Launch Puppeteer with the correct executablePath
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH, // <- Use the env variable!
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const modifiedHeaders = Object.assign({}, request.headers(), {
      "Cache-Control":
        "public, max-age=60, s-maxage=60, stale-while-revalidate=999999999999999999999999",
    });
    request.continue({ headers: modifiedHeaders });
  });

  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i];
    const slug = allSlugs[i];
    try {
      const productUrl = `https://www.winters.lat/productos/${slug}`;
      console.log(`🚀 Visiting product page: ${productUrl}`);
      await page.goto(productUrl, {
        waitUntil: "networkidle2",
        timeout: 120000, // 120 seconds timeout
      });
      console.log(`✅ Cache warmed for product: ${productUrl}`);
    } catch (err) {
      console.error(`Error warming cache for product ${productUrl}:`, err.message);
    }
  }

  await browser.close();
};

// Cron job to run every 6 hours
cron.schedule("0 */6 * * *", () => {
  console.log("Running cache warmer every 6 hours...");
  warmProductCache();
  otherPagesToBeWarmed();
});

// EXECUTE IMMEDATLEY FOR TESTING
(async () => {
  console.log("Executing immediately for testing...");
  await warmProductCache();
  await otherPagesToBeWarmed();
})();
