const { shopify, getSession } = require('./lib/shopify');

// Maximum number of variants allowed per product in Shopify
const MAX_VARIANTS = 100;
// Threshold to trigger cleanup (e.g., when 95% full)
const CLEANUP_THRESHOLD = 95;
// Number of variants to remove when cleanup is triggered
const VARIANTS_TO_REMOVE = 10;

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
    
    if (!shop || !product_id || !dimensions) {
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
    
    // Create a client using the correct approach for Shopify API v11
    const client = new shopify.clients.Rest({
      session: session
    });
    
    // First, check the current number of variants for this product
    try {
      // Get product information including variants count
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
      
      // If we're approaching the limit, delete some older variants
      if (variantsCount >= CLEANUP_THRESHOLD) {
        console.log(`Approaching variant limit. Will remove ${VARIANTS_TO_REMOVE} oldest variants.`);
        
        // Get all variants for this product
        const variantsResponse = await client.get({
          path: `products/${product_id}/variants`,
          type: shopify.clients.Rest.DataType.JSON
        });
        
        if (variantsResponse.body && variantsResponse.body.variants) {
          // Sort variants by created_at (oldest first)
          const variants = variantsResponse.body.variants.sort((a, b) => {
            return new Date(a.created_at) - new Date(b.created_at);
          });
          
          // Delete the oldest variants
          const variantsToDelete = variants.slice(0, VARIANTS_TO_REMOVE);
          
          console.log(`Removing ${variantsToDelete.length} variants to make space`);
          
          // Delete each variant
          for (const variant of variantsToDelete) {
            try {
              await client.delete({
                path: `products/${product_id}/variants/${variant.id}`,
                type: shopify.clients.Rest.DataType.JSON
              });
              console.log(`Deleted variant ${variant.id}`);
            } catch (error) {
              console.error(`Error deleting variant ${variant.id}:`, error.message);
              // Continue with other deletions even if this one failed
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking product variants:', error.message);
      // Continue with variant creation even if cleanup failed
    }
    
    // Calculate price using the blinds pricing formula
    // 1. Convert dimensions to total inches
    const totalWidthInches = dimensions.width_in + (dimensions.width_frac / 16);
    const totalHeightInches = dimensions.height_in + (dimensions.height_frac / 16);
    
    // 2. Convert inches to centimeters (1 inch = 2.54 cm)
    const totalWidthCm = totalWidthInches * 2.54;
    const totalHeightCm = totalHeightInches * 2.54;
    
    // 3. Apply the blinds pricing formula:
    //    basePrice = ((width_cm * height_cm * (18 / 10000)) + 60) * 2 * 1.1
    const basePrice = ((totalWidthCm * totalHeightCm * (18 / 10000)) + 60) * 2 * 1.1;
    
    // 4. Calculate the final discounted price (60% off the base price)
    //    (Dividing by 0.4 gives you the final price)
    const calculatedPrice = (basePrice / 0.4).toFixed(2);
    
    // Use either the calculated price or the provided custom price
    const finalPrice = custom_price || calculatedPrice.toString();
    
    console.log(`Calculated price: $${calculatedPrice} (${totalWidthInches}" × ${totalHeightInches}")`);
    
    // Prepare variant data
    const variantData = {
      variant: {
        option1: `${dimensions.width_in}" ${dimensions.width_frac}/16 x ${dimensions.height_in}" ${dimensions.height_frac}/16`,
        price: finalPrice,
        sku: `CUSTOM-${dimensions.width_in}-${dimensions.width_frac}-${dimensions.height_in}-${dimensions.height_frac}`,
        inventory_policy: 'continue',
        requires_shipping: true
      }
    };
    
    console.log('Variant data:', JSON.stringify(variantData));
    
    try {
      // Make the POST request to create a variant
      const response = await client.post({
        path: `products/${product_id}/variants`,
        data: variantData,
        type: shopify.clients.Rest.DataType.JSON
      });
      
      console.log('Response status:', response.status);
      
      if (response.body && response.body.variant) {
        console.log('Variant created successfully:', response.body.variant.id);
        return res.status(200).json({ 
          custom_variant_id: response.body.variant.id,
          calculated_price: calculatedPrice,
          dimensions: {
            width_inches: totalWidthInches,
            height_inches: totalHeightInches,
            width_cm: totalWidthCm,
            height_cm: totalHeightCm
          }
        });
      } else {
        console.error('Unexpected response structure:', JSON.stringify(response, null, 2));
        return res.status(500).json({ error: 'Unexpected response from Shopify API' });
      }
    } catch (error) {
      console.error('Shopify API Error:', error.message);
      return res.status(500).json({ 
        error: `Shopify API Error: ${error.message}`,
        details: error.response ? JSON.stringify(error.response) : 'No response details'
      });
    }
  } catch (error) {
    console.error('Error creating custom variant:', error.message);
    return res.status(500).json({ error: error.message });
  }
}; 