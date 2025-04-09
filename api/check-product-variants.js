const { shopify, getSession } = require('./lib/shopify');

// Maximum number of variants allowed per product in Shopify
const MAX_VARIANTS = 100;

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
  
  try {
    const { shop, product_id } = req.query;
    
    if (!shop || !product_id) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }
    
    // Clean up the shop parameter
    const cleanShop = shop.replace(/\/$/, '');
    
    // Get shop session
    const session = await getSession(cleanShop);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized. Please authenticate first.' });
    }
    
    console.log('Checking variants for product:', product_id);
    
    // Create a client using the correct approach for Shopify API v11
    const client = new shopify.clients.Rest({
      session: session
    });
    
    // Get product information to check variant count
    const productResponse = await client.get({
      path: `products/${product_id}`,
      type: shopify.clients.Rest.DataType.JSON
    });
    
    if (!productResponse.body || !productResponse.body.product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = productResponse.body.product;
    const variantsCount = product.variants ? product.variants.length : 0;
    
    console.log(`Current variant count for product ${product_id}: ${variantsCount} of ${MAX_VARIANTS}`);
    
    // Return the variant count information
    return res.status(200).json({ 
      productTitle: product.title,
      variantsCount: variantsCount,
      maxVariants: MAX_VARIANTS,
      isApproachingLimit: variantsCount >= 95,
      cleanupThreshold: 95
    });
  } catch (error) {
    console.error('Error checking product variants:', error.message);
    return res.status(500).json({ error: error.message });
  }
}; 