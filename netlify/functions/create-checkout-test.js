// Netlify Function: Create Stripe Checkout Session (TEST MODE)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY_TEST;

// TEST mode prices (need to create them)
const PRICES = {
  navigator_monthly: 'price_test_navigator',
  captain_monthly: 'price_test_captain'
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { plan, email } = JSON.parse(event.body || '{}');

    // First, create products and prices in test mode if they don't exist
    // For now, create them on the fly
    
    const amount = plan === 'navigator_monthly' ? 1500 : 3900;
    const productName = plan === 'navigator_monthly' ? 'Subnavis Navigator (TEST)' : 'Subnavis Captain (TEST)';

    // Create a one-time price for testing
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('success_url', 'https://subnavis.io/dashboard.html?subscribed=true&test=true');
    params.append('cancel_url', 'https://subnavis.io/pricing.html?cancelled=true');
    params.append('line_items[0][price_data][currency]', 'eur');
    params.append('line_items[0][price_data][product_data][name]', productName);
    params.append('line_items[0][price_data][unit_amount]', amount.toString());
    params.append('line_items[0][price_data][recurring][interval]', 'month');
    params.append('line_items[0][quantity]', '1');
    
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
      console.error('Stripe error:', session.error);
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
        url: session.url,
        test: true
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
