const { shopify, storeSession } = require('./lib/shopify');

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
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });
    
    // Store session
    const { session } = callbackResponse;
    await storeSession(session);
    
    // Clean any host parameter
    let host = req.query.host || '';
    if (host) {
      host = `&host=${host}`;
    }
    
    // Redirect to shop home
    return res.redirect(`/shop?shop=${session.shop}${host}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).send('Error during auth callback: ' + error.message);
  }
}; 