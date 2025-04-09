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
      </style>
    </head>
    <body>
      <h1>Test Custom Variant Creation</h1>
      <div id="result"></div>
      <form id="testForm">
        <div class="form-group">
          <label for="product_id">Product ID:</label>
          <input type="text" id="product_id" name="product_id" required>
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
        <div class="form-group">
          <label for="custom_price">Price:</label>
          <input type="text" id="custom_price" name="custom_price" value="149.99" required>
        </div>
        <button type="submit">Create Variant</button>
      </form>

      <script>
        document.getElementById('testForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = '<p>Creating variant...</p>';
          
          const formData = {
            shop: "${shop}",
            product_id: document.getElementById('product_id').value,
            dimensions: {
              width_in: parseInt(document.getElementById('width_in').value),
              width_frac: parseInt(document.getElementById('width_frac').value),
              height_in: parseInt(document.getElementById('height_in').value),
              height_frac: parseInt(document.getElementById('height_frac').value)
            },
            custom_price: document.getElementById('custom_price').value
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