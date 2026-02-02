// Netlify Function: Create Stripe Checkout Session
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const PRICES = {
  navigator_monthly: 'price_1SwS6KCaL6l0sZ1hvzhYssjG',
  captain_monthly: 'price_1SwS6UCaL6l0sZ1hNQ0ymbGm'
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
    const { plan, email } = JSON.parse(event.body || '{}');

    if (!plan || !PRICES[plan]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid plan. Use: navigator_monthly or captain_monthly' })
      };
    }

    // Create Stripe Checkout Session
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('success_url', 'https://subnavis.io/dashboard.html?subscribed=true');
    params.append('cancel_url', 'https://subnavis.io/pricing.html?cancelled=true');
    params.append('line_items[0][price]', PRICES[plan]);
    params.append('line_items[0][quantity]', '1');
    params.append('allow_promotion_codes', 'true');  // Enable promo codes for influencers
    
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
    console.error('Checkout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
};
