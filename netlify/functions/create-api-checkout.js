// Netlify Function: Create Stripe Checkout Session for API Plans
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// API Plan Prices - À configurer dans Stripe Dashboard
// Stripe Dashboard > Products > Create Product > Add Price
const API_PRICES = {
  // Builder - €5/month
  builder_monthly: process.env.STRIPE_PRICE_BUILDER || 'price_builder_monthly',
  builder_yearly: process.env.STRIPE_PRICE_BUILDER_YEARLY || 'price_builder_yearly',
  
  // Degen - €15/month  
  degen_monthly: process.env.STRIPE_PRICE_DEGEN || 'price_degen_monthly',
  degen_yearly: process.env.STRIPE_PRICE_DEGEN_YEARLY || 'price_degen_yearly',
  
  // Whale - €49/month
  whale_monthly: process.env.STRIPE_PRICE_WHALE || 'price_whale_monthly',
  whale_yearly: process.env.STRIPE_PRICE_WHALE_YEARLY || 'price_whale_yearly'
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { plan, billing = 'monthly', email } = JSON.parse(event.body || '{}');
    
    const priceKey = `${plan}_${billing}`;

    if (!plan || !API_PRICES[priceKey]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid plan',
          validPlans: ['builder', 'degen', 'whale'],
          validBilling: ['monthly', 'yearly']
        })
      };
    }

    const priceId = API_PRICES[priceKey];
    
    // Check if price ID is configured
    if (priceId.startsWith('price_') && priceId.includes('_monthly')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Stripe prices not configured yet. Please set up products in Stripe Dashboard.',
          setup_instructions: 'Create products in Stripe Dashboard and add price IDs to Netlify env vars'
        })
      };
    }

    // Create Stripe Checkout Session
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('success_url', 'https://subnavis.io/api-success.html?session_id={CHECKOUT_SESSION_ID}');
    params.append('cancel_url', 'https://subnavis.io/api-pricing.html?cancelled=true');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('allow_promotion_codes', 'true');
    
    // Add metadata for API key generation
    params.append('metadata[product_type]', 'api');
    params.append('metadata[plan]', plan);
    params.append('metadata[billing]', billing);
    
    if (email) {
      params.append('customer_email', email);
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await response.json();

    if (session.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: session.error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      })
    };

  } catch (error) {
    console.error('API Checkout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
};
