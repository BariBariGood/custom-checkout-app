const { getSession } = require('./lib/shopify');

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
    return res.status(400).send('Missing shop parameter. Use /test?shop=your-store.myshopify.com');
  }
  
  // Clean up the shop parameter - remove any trailing slashes
  shop = shop.replace(/\/$/, '');
    
  // If the shop contains https:// or http://, extract just the domain
  if (shop.includes('//')) {
    shop = shop.split('//')[1];
  }
  
  // Simple HTML form to test the API
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Custom Variant Creation</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #5c6ac4; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #4959bd; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; }
        .price-display { font-size: 1.2em; font-weight: bold; margin-top: 20px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>Test Custom Variant Creation</h1>
      <div id="result"></div>
      <form id="testForm">
        <div class="form-group">
          <label for="product_id">Product ID:</label>
          <input type="text" id="product_id" name="product_id" required>
          <button type="button" id="checkProduct" style="width: auto; margin-top: 10px;">Check Variant Count</button>
          <div id="variantStatus" style="margin-top: 10px; padding: 8px; border-radius: 4px; display: none;"></div>
        </div>
        <div class="form-group">
          <label for="width_in">Width (Inches):</label>
          <input type="number" id="width_in" name="width_in" min="1" value="24" required>
        </div>
        <div class="form-group">
          <label for="width_frac">Width (Sixteenths):</label>
          <select id="width_frac" name="width_frac">
            <option value="0">0</option>
            <option value="1">1/16</option>
            <option value="2">2/16</option>
            <option value="4">4/16</option>
            <option value="8" selected>8/16</option>
            <option value="12">12/16</option>
          </select>
        </div>
        <div class="form-group">
          <label for="height_in">Height (Inches):</label>
          <input type="number" id="height_in" name="height_in" min="1" value="36" required>
        </div>
        <div class="form-group">
          <label for="height_frac">Height (Sixteenths):</label>
          <select id="height_frac" name="height_frac">
            <option value="0" selected>0</option>
            <option value="1">1/16</option>
            <option value="2">2/16</option>
            <option value="4">4/16</option>
            <option value="8">8/16</option>
            <option value="12">12/16</option>
          </select>
        </div>

        <div class="price-display">
          Calculated Price: <span id="calculated-price">$0.00</span>
        </div>

        <div class="form-group">
          <label for="custom_price">Override Price (optional):</label>
          <input type="text" id="custom_price" name="custom_price" placeholder="Leave blank to use calculated price">
        </div>
        <button type="submit">Create Variant</button>
      </form>

      <script>
        // Formats a number as a dollar currency string
        function formatMoney(amount) {
          return '$' + Number(amount).toFixed(2);
        }

        function calculatePrice() {
          // Get the dimension inputs (in inches)
          var wIn = parseFloat(document.getElementById('width_in').value) || 0;
          var wSix = parseFloat(document.getElementById('width_frac').value) || 0;
          var hIn = parseFloat(document.getElementById('height_in').value) || 0;
          var hSix = parseFloat(document.getElementById('height_frac').value) || 0;
          
          // Calculate total inches combining whole inches and sixteenths
          var totalWidthInches = wIn + (wSix / 16);
          var totalHeightInches = hIn + (hSix / 16);
          
          // Convert inches to centimeters for the formula (1 inch = 2.54 cm)
          var totalWidthCm = totalWidthInches * 2.54;
          var totalHeightCm = totalHeightInches * 2.54;
          
          // Apply the blinds pricing formula:
          // basePrice = ((width_cm * height_cm * (18 / 10000)) + 60) * 2 * 1.1
          var basePrice = ((totalWidthCm * totalHeightCm * (18 / 10000)) + 60) * 2 * 1.1;
          
          // Calculate the final discounted price (60% off the base price).
          // (Dividing by 0.4 gives you the final price.)
          var discountedPrice = basePrice / 0.4;
          
          // Display the final price
          document.getElementById('calculated-price').innerText = formatMoney(discountedPrice);
          
          return discountedPrice;
        }

        // Add event listeners for dimension changes
        ['width_in', 'width_frac', 'height_in', 'height_frac'].forEach(function(id) {
          document.getElementById(id).addEventListener('change', calculatePrice);
          document.getElementById(id).addEventListener('input', calculatePrice);
        });

        // Calculate initial price
        calculatePrice();

        // Store the shop value from server
        const shopDomain = "${shop}";

        // Add variant count checker
        document.getElementById('checkProduct').addEventListener('click', async () => {
          const productId = document.getElementById('product_id').value;
          const statusDiv = document.getElementById('variantStatus');
          
          if (!productId) {
            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = '#FFEBEE';
            statusDiv.textContent = 'Please enter a product ID first';
            return;
          }
          
          statusDiv.style.display = 'block';
          statusDiv.style.backgroundColor = '#E8F5E9';
          statusDiv.textContent = 'Checking variant count...';
          
          try {
            const response = await fetch('/check-product-variants?shop=' + encodeURIComponent(shopDomain) + '&product_id=' + productId);
            const data = await response.json();
            
            if (response.ok) {
              const percentFull = (data.variantsCount / data.maxVariants) * 100;
              let bgColor = '#E8F5E9'; // Green for safe
              
              if (percentFull >= 95) {
                bgColor = '#FFEBEE'; // Red for danger
              } else if (percentFull >= 80) {
                bgColor = '#FFF8E1'; // Yellow for warning
              }
              
              statusDiv.style.backgroundColor = bgColor;
              statusDiv.innerHTML = '<strong>Variant count:</strong> ' + data.variantsCount + ' of ' + data.maxVariants + '<br>' +
                '<div style="width: 100%; height: 10px; background-color: #eee; border-radius: 5px; margin-top: 5px;">' +
                '<div style="width: ' + percentFull + '%; height: 10px; background-color: ' + bgColor + '; border-radius: 5px;"></div>' +
                '</div>' +
                (percentFull >= 95 ? '<p style="color: #D32F2F; margin: 5px 0 0;">Warning: Approaching variant limit! Oldest variants will be removed.</p>' : '');
            } else {
              statusDiv.style.backgroundColor = '#FFEBEE';
              statusDiv.textContent = 'Error: ' + (data.error || 'Could not check variants');
            }
          } catch (error) {
            statusDiv.style.backgroundColor = '#FFEBEE';
            statusDiv.textContent = 'Error: ' + error.message;
          }
        });

        document.getElementById('testForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = '<p>Creating variant...</p>';
          
          const formData = {
            shop: shopDomain,
            product_id: document.getElementById('product_id').value,
            dimensions: {
              width_in: parseInt(document.getElementById('width_in').value),
              width_frac: parseInt(document.getElementById('width_frac').value),
              height_in: parseInt(document.getElementById('height_in').value),
              height_frac: parseInt(document.getElementById('height_frac').value)
            },
            custom_price: document.getElementById('custom_price').value || null
          };
          
          try {
            const response = await fetch('/create-custom-variant', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
              resultDiv.innerHTML = '<p style="color: green">✅ Variant created successfully!</p>' +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } else {
              resultDiv.innerHTML = '<p style="color: red">❌ Error creating variant</p>' +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<p style="color: red">❌ Error: ' + error.message + '</p>';
          }
        });
      </script>
    </body>
    </html>
  `);
}; 