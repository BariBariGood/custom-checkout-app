# Custom Checkout App for Shopify

A Node.js application that enhances your Shopify store's checkout process by allowing custom product variants based on dimensions.

## Features

- Create custom product variants on-the-fly
- Define custom pricing for special dimensions
- Simplify the checkout process for custom-sized products

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your `.env` file with your Shopify API credentials:
   ```
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET=your_api_secret
   SCOPES=read_products,write_products
   SHOPIFY_ACCESS_TOKEN=your_access_token
   HOST=your-app-hostname.com
   PORT=3000
   ```

## Running the App

Development mode with auto-restart:
```
npm run dev
```

Production mode:
```
npm start
```

## API Endpoints

### Create Custom Variant
`POST /create_custom_variant`

Request body:
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
  "custom_price": "149.99"
}
```

Response:
```json
{
  "custom_variant_id": "987654321"
}
```

## Next Steps

1. Implement proper session management
2. Add authentication flow for the Shopify store
3. Create a frontend interface for the app 