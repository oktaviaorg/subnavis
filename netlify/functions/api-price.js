// Netlify Function: Get TAO Price from Taostats API
const TAOSTATS_API_KEY = 'tao-7525a19d-5392-42f5-b854-7aae224818a7:82ca85cf';

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

  try {
    const response = await fetch('https://api.taostats.io/api/price/latest/v1', {
      headers: { 'Authorization': TAOSTATS_API_KEY }
    });

    if (!response.ok) {
      throw new Error(`Taostats API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract relevant data
    const priceData = data[0] || {};
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        price: parseFloat(priceData.price) || 0,
        change_24h: parseFloat(priceData.percent_change_24h) || 0,
        volume_24h: parseFloat(priceData.volume_24h) || 0,
        market_cap: parseFloat(priceData.market_cap) || 0,
        updated_at: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error fetching price:', error);
    
    // Return fallback data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        price: 285,
        change_24h: -8.5,
        volume_24h: 45000000,
        market_cap: 2500000000,
        updated_at: new Date().toISOString(),
        fallback: true
      })
    };
  }
};
