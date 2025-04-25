const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 3000;

const graphQLendpoint = "https://api.winters.lat/graphql";
const queryId = "cfd13620d7a93c932643d3d1221b56328c1da5a98e3600a234ad9a0d92fc0bc0";

// Fetch product slugs
const warmProductCache = async () => {
  console.log("🔥 Starting cache warmer...");

  let hasNextPage = true;
  let endCursor = null;
  let slugs = [];

  while (hasNextPage) {
    try {
      const response = await axios.get(graphQLendpoint, {
        params: {
          queryId,
          variables: JSON.stringify({
            first: 50,
            after: endCursor,
          }),
        },
      });

      const data = response.data.data;
      const products = data.products.nodes;

      products.forEach((node) => {
        if (node.slug) slugs.push(node.slug);
      });

      hasNextPage = data.products.pageInfo.hasNextPage;
      endCursor = data.products.pageInfo.endCursor;

    } catch (err) {
      console.error("❌ Error fetching product data:", err.message);
      return;
    }
  }

  // Launch Puppeteer using bundled Chromium
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  for (const slug of slugs) {
    const url = `https://winters.lat/product/${slug}`;
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle2' });
      const headers = response.headers();

      const cfStatus = headers['cf-cache-status'] || 'N/A';
      const xCache = headers['x-cache'] || 'N/A';

      console.log(`✅ Visited ${slug} | cf-cache-status: ${cfStatus}, x-cache: ${xCache}`);
    } catch (err) {
      console.error(`❌ Error loading ${url}:`, err.message);
    }
  }

  await browser.close();
  console.log("🧊 Done warming cache.");
};

// Schedule to run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log("⏰ Running scheduled cache warmer...");
  try {
    await warmProductCache();
  } catch (err) {
    console.error("💥 Error running scheduled cache warmer:", err);
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Cache warmer is up!');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
