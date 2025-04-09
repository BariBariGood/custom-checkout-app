# Custom Checkout App for Shopify

A serverless application that enables custom product variants based on dimensions, perfect for made-to-measure products like blinds, curtains, or custom furniture. This app calculates dynamic pricing based on dimensions and creates custom product variants on-the-fly.

## Features

- 🛠️ Creates custom variants based on exact dimensions
- 💰 Calculates prices dynamically based on measurements
- 🔄 Manages variant limits automatically
- 🚀 Built on Vercel serverless architecture
- 🔒 Secure Shopify API integration

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Integration with Shopify](#integration-with-shopify)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [File Structure](#file-structure)

## Prerequisites

- Node.js 14.x or higher
- Vercel account (free tier works fine)
- Shopify Partner account
- Shopify store with admin API access

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/custom-checkout-app.git
   cd custom-checkout-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET=your_api_secret
   SCOPES=write_products,read_products
   HOST=https://your-vercel-app-url.vercel.app
   ```

## Configuration

### Creating a Shopify App

1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Navigate to Apps > Create App
3. Choose "Public App"
4. Fill in App details:
   - Name: Custom Variant Creator (or your preferred name)
   - App URL: Your Vercel deployment URL
   - Allowed redirection URLs: 
     - `https://your-vercel-url.vercel.app/auth/callback`
5. Under "API scopes" select:
   - `write_products`
   - `read_products`
6. Save the app
7. Copy the API Key and API Secret Key to your `.env` file

## Deployment

This app is designed to run on Vercel's serverless platform:

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy to Vercel:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

5. Set environment variables in Vercel:
   - Go to your project on Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Add the same variables from your `.env` file

## Integration with Shopify

### Installing the App on Your Store

1. Navigate to: `https://your-vercel-url.vercel.app/auth?shop=your-store.myshopify.com`
2. Complete the OAuth flow to install the app

### Adding to Your Product Pages

Add this script to your product page template:

```html
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Only run on product pages with specific tags (e.g., "custom-size")
    if (meta.product && meta.product.tags.includes('custom-size')) {
      // Create the custom size selector UI
      const container = document.createElement('div');
      container.className = 'custom-size-selector';
      container.innerHTML = `
        <h3>Select Custom Size</h3>
        <div class="dimensions-container">
          <div class="dimension-group">
            <label>Width:</label>
            <input type="number" id="width_in" min="1" value="24"> inches
            <select id="width_frac">
              <option value="0">0</option>
              <option value="1">1/16</option>
              <option value="2">2/16</option>
              <option value="4">4/16</option>
              <option value="8" selected>8/16</option>
              <option value="12">12/16</option>
            </select>
          </div>
          <div class="dimension-group">
            <label>Height:</label>
            <input type="number" id="height_in" min="1" value="36"> inches
            <select id="height_frac">
              <option value="0" selected>0</option>
              <option value="1">1/16</option>
              <option value="2">2/16</option>
              <option value="4">4/16</option>
              <option value="8">8/16</option>
              <option value="12">12/16</option>
            </select>
          </div>
        </div>
        <div class="price-display">
          <p>Calculated Price: <span id="calculated-price">$0.00</span></p>
        </div>
        <button id="create-variant" class="button">Create Custom Size</button>
      `;
      
      // Insert before the Add to Cart button
      const addToCartButton = document.querySelector('form[action="/cart/add"]');
      if (addToCartButton) {
        addToCartButton.parentNode.insertBefore(container, addToCartButton);
        
        // Initialize pricing calculation
        initCustomSizeSelector(meta.product.id);
      }
    }
  });
  
  function initCustomSizeSelector(productId) {
    // Get elements
    const widthIn = document.getElementById('width_in');
    const widthFrac = document.getElementById('width_frac');
    const heightIn = document.getElementById('height_in');
    const heightFrac = document.getElementById('height_frac');
    const priceDisplay = document.getElementById('calculated-price');
    const createButton = document.getElementById('create-variant');
    
    // Calculate price function
    function calculatePrice() {
      // Get the dimension inputs (in inches)
      var wIn = parseFloat(widthIn.value) || 0;
      var wSix = parseFloat(widthFrac.value) || 0;
      var hIn = parseFloat(heightIn.value) || 0;
      var hSix = parseFloat(heightFrac.value) || 0;
      
      // Calculate total inches combining whole inches and sixteenths
      var totalWidthInches = wIn + (wSix / 16);
      var totalHeightInches = hIn + (hSix / 16);
      
      // Convert inches to centimeters for the formula (1 inch = 2.54 cm)
      var totalWidthCm = totalWidthInches * 2.54;
      var totalHeightCm = totalHeightInches * 2.54;
      
      // Apply the blinds pricing formula
      var basePrice = ((totalWidthCm * totalHeightCm * (18 / 10000)) + 60) * 2 * 1.1;
      
      // Calculate the final discounted price (60% off the base price)
      var discountedPrice = basePrice / 0.4;
      
      // Display the final price
      priceDisplay.innerText = '$' + Number(discountedPrice).toFixed(2);
      
      return discountedPrice;
    }
    
    // Add event listeners
    [widthIn, widthFrac, heightIn, heightFrac].forEach(function(el) {
      el.addEventListener('change', calculatePrice);
      el.addEventListener('input', calculatePrice);
    });
    
    // Create variant button click
    createButton.addEventListener('click', async function() {
      createButton.disabled = true;
      createButton.innerText = 'Creating...';
      
      try {
        const response = await fetch('/create-custom-variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop: window.Shopify.shop,
            product_id: productId,
            dimensions: {
              width_in: parseInt(widthIn.value),
              width_frac: parseInt(widthFrac.value),
              height_in: parseInt(heightIn.value),
              height_frac: parseInt(heightFrac.value)
            }
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.custom_variant_id) {
          // Add the variant to cart
          const formData = new FormData();
          formData.append('id', data.custom_variant_id);
          formData.append('quantity', 1);
          
          fetch('/cart/add.js', {
            method: 'POST',
            body: formData
          })
          .then(res => res.json())
          .then(() => {
            window.location.href = '/cart';
          });
        } else {
          alert('Error creating custom variant: ' + (data.error || 'Unknown error'));
          createButton.disabled = false;
          createButton.innerText = 'Create Custom Size';
        }
      } catch (error) {
        alert('Error: ' + error.message);
        createButton.disabled = false;
        createButton.innerText = 'Create Custom Size';
      }
    });
    
    // Initial price calculation
    calculatePrice();
  }
</script>

<style>
  .custom-size-selector {
    margin: 2rem 0;
    padding: 1.5rem;
    border: 1px solid #e8e8e8;
    border-radius: 5px;
    background: #f9f9f9;
  }
  .dimensions-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .dimension-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .dimension-group input[type="number"] {
    width: 5rem;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  .price-display {
    font-size: 1.2rem;
    font-weight: bold;
    margin: 1rem 0;
  }
</style>

## API Endpoints

This application provides the following API endpoints:

### `/api/test`

- **Method**: GET
- **Purpose**: Testing interface for the custom variant creation
- **URL**: `https://your-vercel-url.vercel.app/api/test?shop=your-store.myshopify.com`

### `/check-product-variants`

- **Method**: GET
- **Purpose**: Check the current variant count for a product
- **Parameters**:
  - `shop`: Your Shopify store domain
  - `product_id`: The ID of the product to check
- **Example Response**:
  ```json
  {
    "variantsCount": 23,
    "maxVariants": 100
  }
  ```

### `/create-custom-variant`

- **Method**: POST
- **Purpose**: Create a custom variant for a product
- **Body**:
  ```json
  {
    "shop": "your-store.myshopify.com",
    "product_id": "123456789",
    "dimensions": {
      "width_in": 24,
      "width_frac": 8,
      "height_in": 36,
      "height_frac": 0
    },
    "custom_price": "129.99" // Optional, calculated if omitted
  }
  ```
- **Example Response**:
  ```json
  {
    "custom_variant_id": "40934905839742"
  }
  ```

## Testing

1. Navigate to `https://your-vercel-url.vercel.app/api/test?shop=your-store.myshopify.com`
2. Enter a product ID from your store
3. Set dimensions and test variant creation

## Customization

### Pricing Formula

The pricing formula is defined in both the test interface and integration code. To customize it:

1. Locate the `calculatePrice()` function
2. Modify the formula to match your pricing needs:
   ```js
   // Current formula for blinds:
   var basePrice = ((totalWidthCm * totalHeightCm * (18 / 10000)) + 60) * 2 * 1.1;
   var discountedPrice = basePrice / 0.4;
   ```

### Dimension Options

To change the fractional dimensions available:

1. Modify the option values in the select elements:
   ```html
   <select id="width_frac">
     <option value="0">0</option>
     <!-- Add or remove options as needed -->
   </select>
   ```

## Troubleshooting

### Common Issues

#### Authentication Errors
- Ensure your Shopify API key and secret are correct
- Check that the redirect URL is correctly set in your Shopify app settings

#### Variant Creation Fails
- Verify the product ID is valid
- Ensure the product has not reached the variant limit (100 variants maximum)
- Check that your app has proper scopes (`write_products`)

#### Price Calculation Issues
- Review the pricing formula in the code
- Ensure all dimension inputs are properly parsed as numbers

### Debug Mode

For additional debugging:

1. Enable debug logging in the Shopify API client:
   ```js
   logger: { level: 3 } // 3 = debug level
   ```

2. Check Vercel logs via CLI:
   ```bash
   vercel logs your-app-name
   ```

## Development

For local development:

1. Install Vercel CLI if not already installed:
   ```bash
   npm install -g vercel
   ```

2. Run locally:
   ```bash
   vercel dev
   ```

3. Access the local server at `http://localhost:3000`

## File Structure

```
custom-checkout-app/
├── api/                  # Serverless API functions
│   ├── test.js           # Testing interface
│   ├── create-custom-variant.js  # Variant creation endpoint
│   ├── check-product-variants.js # Variant counting endpoint
│   └── lib/              # Shared utilities
│       └── shopify.js    # Shopify API helpers
├── index.js              # Express fallback (not used in Vercel)
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (gitignored)
└── README.md             # Documentation
```

## Security Considerations

- Never expose your Shopify API secret key
- Use HTTPS for all communications
- Implement rate limiting to prevent abuse
- Validate all input data before processing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please open an issue on GitHub or contact the maintainer. 