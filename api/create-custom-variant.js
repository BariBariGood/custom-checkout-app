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
    
    console.log('Session found for shop:', cleanShop);
    console.log('Creating variant for product:', product_id);
    
    // Create variant data
    const variantData = {
      variant: {
        option1: `${dimensions.width_in}" ${dimensions.width_frac}/16 x ${dimensions.height_in}" ${dimensions.height_frac}/16`,
        price: custom_price.toString(),
        sku: `CUSTOM-${dimensions.width_in}-${dimensions.width_frac}-${dimensions.height_in}-${dimensions.height_frac}`,
        inventory_policy: 'continue',
        requires_shipping: true
      }
    };
    
    console.log('Variant data:', JSON.stringify(variantData));
    
    try {
      // Use direct REST request to create variant
      // This bypasses the REST resources for more control
      console.log('Making REST request to Shopify API...');
      const response = await shopify.rest.request({
        method: "POST",
        path: `products/${product_id}/variants`,
        data: variantData,
        session
      });
      
      if (response.body && response.body.variant) {
        console.log('Variant created successfully:', response.body.variant.id);
        return res.status(200).json({ custom_variant_id: response.body.variant.id });
      } else {
        console.error('Unexpected response structure:', JSON.stringify(response, null, 2));
        return res.status(500).json({ error: 'Unexpected response structure from Shopify API' });
      }
    } catch (error) {
      console.error('Shopify API Error:', error.message);
      console.error('Error details:', error);
      
      // Check if there's GraphQL error details
      if (error.response && error.response.body) {
        console.error('Response body:', JSON.stringify(error.response.body, null, 2));
      }
      
      return res.status(500).json({ 
        error: `Shopify API Error: ${error.message}`,
        details: error.response ? JSON.stringify(error.response.body) : 'No response details'
      });
    }
  } catch (error) {
    console.error('Error creating custom variant:', error.message);
    return res.status(500).json({ error: error.message });
  }
}; 