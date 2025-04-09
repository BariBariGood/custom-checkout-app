// This file exists for backward compatibility but is not used in Vercel deployment
// The actual serverless functions are in the /api directory

console.log('This app is designed for Vercel serverless deployment.');
console.log('Please deploy this app to Vercel using `vercel` command.');
console.log('For local development, use `vercel dev`');

// If someone tries to run this file directly, let them know how to properly use it
if (require.main === module) {
  console.log('\nIf you want to run this app locally with Express:');
  console.log('1. Install vercel CLI: npm i -g vercel');
  console.log('2. Run locally: vercel dev');
}

// index.js
const express = require('express');
const bodyParser = require('body-parser');
const { shopifyApi, ApiVersion, Session } = require('@shopify/shopify-api');
const { restResources } = require('@shopify/shopify-api/rest/admin/2023-07');
const { shopifyApiNodeAdapter } = require('@shopify/shopify-api/adapters/node');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// In-memory session storage (replace with a proper database in production)
const sessions = {};

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(','),
  hostName: process.env.HOST.replace(/^https?:\/\//, ''),
  apiVersion: ApiVersion.July23, // Using July 2023 API version
  isEmbeddedApp: true,
  restResources,
  customAdapterOptions: {},
  billing: undefined, // or configure billing
  userAgentPrefix: 'custom-checkout-app',
  logger: { level: 0 }, // 0 = disabled, 1 = errors, 2 = warnings, 3 = debug
  // Use the Node adapter
  adapter: shopifyApiNodeAdapter,
});

// Auth callback route
app.get('/auth/callback', async (req, res) => {
  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });
    
    // Save session
    const { session } = callbackResponse;
    sessions[session.shop] = session;
    
    res.redirect(`/?shop=${session.shop}&host=${req.query.host}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Error during auth callback');
  }
});

// Auth start route
app.get('/auth', async (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }
  
  // Create auth URL
  const authUrl = await shopify.auth.begin({
    shop,
    callbackPath: '/auth/callback',
    isOnline: false,
  });
  
  res.redirect(authUrl);
});

// Helper function to get a session
async function getSession(shop) {
  // Check if we have a session stored
  if (sessions[shop]) {
    return sessions[shop];
  }
  
  // For development testing
  if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.NODE_ENV === 'development') {
    return new Session({
      shop,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    });
  }
  
  return null;
}

// Middleware to check if shop is authenticated
const withAuth = async (req, res, next) => {
  const { shop } = req.body || req.query;
  
  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter' });
  }
  
  const session = await getSession(shop);
  
  if (!session) {
    return res.redirect(`/auth?shop=${shop}`);
  }
  
  req.session = session;
  next();
};

// Index route
app.get('/', async (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.send(`
      <h1>Custom Checkout App</h1>
      <p>Please visit /auth?shop=your-store.myshopify.com to install this app.</p>
    `);
  }
  
  const session = await getSession(shop);
  
  if (!session) {
    return res.redirect(`/auth?shop=${shop}`);
  }
  
  res.send('Custom Checkout App is running. Your shop is authenticated.');
});

// Endpoint to create a custom variant.
app.post('/create_custom_variant', withAuth, async (req, res) => {
  try {
    const { shop, product_id, dimensions, custom_price } = req.body;
    
    if (!product_id || !dimensions || !custom_price) {
      return res.status(400).json({ error: 'Missing required data.' });
    }

    // Create a Shopify REST client.
    const client = new shopify.clients.Rest({
      session: req.session,
    });

    // Prepare variant data.
    // Here, option1 describes the dimensions; adjust as needed.
    const variantData = {
      variant: {
        option1: `${dimensions.width_in}" ${dimensions.width_frac}/16 x ${dimensions.height_in}" ${dimensions.height_frac}/16`,
        price: custom_price.toString(), // Ensure price is a string, e.g., "29.99"
        sku: `CUSTOM-${dimensions.width_in}-${dimensions.width_frac}-${dimensions.height_in}-${dimensions.height_frac}`,
        inventory_policy: 'continue',
        requires_shipping: true
      }
    };

    // Call the Admin API to create the variant.
    const response = await client.post({
      path: `products/${product_id}/variants`,
      data: variantData,
    });

    const newVariant = response.body.variant;
    if (!newVariant) {
      throw new Error('Variant creation failed');
    }
    res.json({ custom_variant_id: newVariant.id });
  } catch (error) {
    console.error('Error creating custom variant:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
