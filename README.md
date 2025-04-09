# Custom Checkout App for Shopify

A serverless application deployed on Vercel that enhances your Shopify store's checkout process by allowing custom product variants based on dimensions.

## Features

- Create custom product variants on-the-fly
- Define custom pricing for special dimensions
- Simplify the checkout process for custom-sized products
- Built as serverless functions for Vercel deployment

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
   HOST=your-app-hostname.vercel.app
   NODE_ENV=production
   ```

## Local Development

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Setup Vercel for local development:
   ```
   vercel login
   vercel link
   ```

3. Pull environment variables:
   ```
   vercel env pull
   ```

4. Run the app locally:
   ```
   npm run dev
   ```

## Deploying to Vercel

1. Make sure you've installed and configured the Vercel CLI:
   ```
   npm install -g vercel
   vercel login
   ```

2. Connect your project to Vercel (if not already):
   ```
   vercel link
   ```

3. Set up your environment variables:
   ```
   vercel env add SHOPIFY_API_KEY
   vercel env add SHOPIFY_API_SECRET
   vercel env add SCOPES
   vercel env add SHOPIFY_ACCESS_TOKEN
   vercel env add HOST
   vercel env add NODE_ENV
   ```

4. Deploy to preview:
   ```
   vercel
   ```

5. Deploy to production:
   ```
   vercel --prod
   ```

## API Endpoints

### Create Custom Variant
`POST /create-custom-variant`

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

## Testing

Visit `/test?shop=your-store.myshopify.com` to test the variant creation functionality.

## Serverless Architecture

The app is built as serverless functions:

- `/api/index.js` - Home page
- `/api/auth.js` - Authentication start
- `/api/auth-callback.js` - Authentication callback
- `/api/create-custom-variant.js` - Custom variant creation
- `/api/test.js` - Test interface

## Session Storage

By default, this app uses in-memory session storage, which is not suitable for production use with serverless functions. For production, you should implement persistent session storage:

1. Create a Vercel KV store:
   ```
   vercel kv create
   ```

2. Connect it to your project:
   ```
   vercel kv connect
   ```

3. Update the session management code in `api/lib/shopify.js` to use Vercel KV.

## Shopify App Registration

1. Go to your Shopify Partner Dashboard
2. Create a new Custom App
3. Configure the App URL to match your Vercel deployment URL
4. Configure the Allowed redirection URLs: 
   - `https://your-app-hostname.vercel.app/auth/callback`
5. Install the app on your store to get an access token 