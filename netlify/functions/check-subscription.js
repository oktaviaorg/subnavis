// Netlify Function: Check user subscription status
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

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
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    // Search for customer by email
    const customerResponse = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
      }
    );
    
    const customers = await customerResponse.json();
    
    if (!customers.data || customers.data.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          plan: 'explorer',
          planName: 'Explorer',
          status: 'free',
          email: email
        })
      };
    }

    const customerId = customers.data[0].id;

    // Get active subscriptions
    const subResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
      }
    );
    
    const subscriptions = await subResponse.json();

    // Also check trialing subscriptions
    const trialResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=trialing&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
      }
    );
    
    const trialSubs = await trialResponse.json();
    
    const allSubs = [...(subscriptions.data || []), ...(trialSubs.data || [])];

    if (allSubs.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          plan: 'explorer',
          planName: 'Explorer',
          status: 'free',
          email: email
        })
      };
    }

    // Determine plan from price
    const sub = allSubs[0];
    const priceId = sub.items?.data?.[0]?.price?.id;
    
    let plan = 'explorer';
    let planName = 'Explorer';
    
    // Navigator prices
    if (priceId === 'price_1SwS6KCaL6l0sZ1hvzhYssjG') {
      plan = 'navigator';
      planName = 'Navigator';
    }
    // Captain prices
    else if (priceId === 'price_1SwS6UCaL6l0sZ1hNQ0ymbGm') {
      plan = 'captain';
      planName = 'Captain';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        plan: plan,
        planName: planName,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        trialEnd: sub.trial_end,
        email: email
      })
    };

  } catch (error) {
    console.error('Subscription check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check subscription' })
    };
  }
};
