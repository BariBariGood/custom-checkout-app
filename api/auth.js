const { shopify } = require('./lib/shopify');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Extract shop parameter from various formats
  let shop = req.query.shop;
  
  // If shop is not in the standard format, try to extract it from other patterns
  if (!shop) {
    // Check if the shop was passed directly as a query parameter without 'shop='
    const queryKeys = Object.keys(req.query);
    if (queryKeys.length > 0) {
      const possibleShop = queryKeys[0];
      if (possibleShop.includes('myshopify.com')) {
        shop = possibleShop.replace('/', ''); // Remove trailing slash if any
      }
    }
  }
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter. Use /auth?shop=your-store.myshopify.com');
  }
  
  // Clean up the shop parameter - remove any trailing slashes
  shop = shop.replace(/\/$/, '');
  
  // If the shop contains https:// or http://, extract just the domain
  if (shop.includes('//')) {
    shop = shop.split('//')[1];
  }
  
  try {
    // Create auth URL
    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: '/auth/callback',
      isOnline: false,
    });
    
    return res.redirect(authUrl);
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: error.message });
  }
}; 