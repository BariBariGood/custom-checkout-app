const { getSession } = require('./lib/shopify');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle the actual request
  if (req.method === 'GET') {
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
    
    // If we still don't have a shop
    if (!shop) {
      return res.status(200).send(`
        <h1>Custom Checkout App</h1>
        <p>Please visit <code>/shop?shop=your-store.myshopify.com</code> to use this app.</p>
        <p>Example: <a href="/shop?shop=q3j10w-hp.myshopify.com">/shop?shop=q3j10w-hp.myshopify.com</a></p>
      `);
    }
    
    // Clean up the shop parameter - remove any trailing slashes
    shop = shop.replace(/\/$/, '');
    
    // If the shop contains https:// or http://, extract just the domain
    if (shop.includes('//')) {
      shop = shop.split('//')[1];
    }
    
    const session = await getSession(shop);
    
    if (!session) {
      return res.redirect(`/auth?shop=${shop}`);
    }
    
    return res.status(200).send(`
      <h1>Custom Checkout App</h1>
      <p>Your shop <strong>${shop}</strong> is authenticated.</p>
      <p>You can now use the custom variant creation API.</p>
      <p><a href="/test?shop=${shop}">Test Variant Creation</a></p>
    `);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}; 