// api/lib/shopify.js
const { shopifyApi, ApiVersion, Session, DataType } = require('@shopify/shopify-api');
const { restResources } = require('@shopify/shopify-api/rest/admin/2023-07');
const { shopifyApiNodeAdapter } = require('@shopify/shopify-api/adapters/node');
require('dotenv').config();

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(','),
  hostName: process.env.HOST.replace(/^https?:\/\//, ''),
  apiVersion: ApiVersion.July23, // Using July 2023 API version
  isEmbeddedApp: false, // For custom checkout apps, this should be false
  customAdapterOptions: {},
  billing: undefined,
  userAgentPrefix: 'custom-checkout-app',
  logger: { level: 3 }, // Increase logging level for debugging: 0=disabled, 1=errors, 2=warnings, 3=debug
  adapter: shopifyApiNodeAdapter,
  // Include REST resources
  rest: {
    resources: restResources
  }
});

// Make the DataType available on the shopify.clients.Rest object
// This is important for making proper API calls
shopify.clients = shopify.clients || {};
shopify.clients.Rest = shopify.clients.Rest || {};
shopify.clients.Rest.DataType = DataType;

// In-memory session storage
const SESSIONS = {};

// Simple session management functions
async function storeSession(session) {
  SESSIONS[session.shop] = JSON.stringify(session);
  return true;
}

async function loadSession(shop) {
  const sessionData = SESSIONS[shop];
  if (!sessionData) {
    return undefined;
  }
  
  const sessionObj = JSON.parse(sessionData);
  return new Session(sessionObj);
}

async function getSession(shop) {
  // Try to load from session store first
  const session = await loadSession(shop);
  if (session) {
    return session;
  }
  
  // For development/testing - create a direct session with access token
  if (process.env.SHOPIFY_ACCESS_TOKEN) {
    const devSession = new Session({
      shop,
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
      isOnline: false,
    });
    
    // Store the session for future use
    await storeSession(devSession);
    return devSession;
  }
  
  return null;
}

module.exports = {
  shopify,
  getSession,
  storeSession,
  Session
}; 