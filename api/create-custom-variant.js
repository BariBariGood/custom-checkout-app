const { shopify, getSession } = require('./lib/shopify');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { shop, product_id, dimensions, custom_price } = req.body;
    
    if (!shop || !product_id || !dimensions || !custom_price) {
      return res.status(400).json({ error: 'Missing required data.' });
    }
    
    // Clean up the shop parameter
    const cleanShop = shop.replace(/\/$/, '');
    
    // Get shop session
    const session = await getSession(cleanShop);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized. Please authenticate first.' });
    }
    
    // Create a Shopify REST client
    const client = shopify.clients.rest({
      session,
    });
    
    // Prepare variant data
    const variantData = {
      variant: {
        option1: `${dimensions.width_in}" ${dimensions.width_frac}/16 x ${dimensions.height_in}" ${dimensions.height_frac}/16`,
        price: custom_price.toString(),
        sku: `CUSTOM-${dimensions.width_in}-${dimensions.width_frac}-${dimensions.height_in}-${dimensions.height_frac}`,
        inventory_policy: 'continue',
        requires_shipping: true
      }
    };
    
    console.log('Creating variant with data:', JSON.stringify(variantData));
    
    // Call the Admin API to create the variant
    const response = await client.post({
      path: `products/${product_id}/variants`,
      data: variantData,
    });
    
    const newVariant = response.body.variant;
    
    if (!newVariant) {
      throw new Error('Variant creation failed');
    }
    
    console.log('Variant created successfully:', newVariant.id);
    return res.status(200).json({ custom_variant_id: newVariant.id });
  } catch (error) {
    console.error('Error creating custom variant:', error);
    return res.status(500).json({ error: error.message });
  }
}; 