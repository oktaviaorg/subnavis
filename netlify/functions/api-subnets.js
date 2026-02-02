// Netlify Function: Get Subnets data from Taostats API
const TAOSTATS_API_KEY = 'tao-7525a19d-5392-42f5-b854-7aae224818a7:82ca85cf';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const response = await fetch('https://api.taostats.io/api/subnet/latest/v1', {
      headers: { 'Authorization': TAOSTATS_API_KEY }
    });

    if (!response.ok) {
      throw new Error(`Taostats API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Process and sort by emission
    const subnets = data.map(s => ({
      netuid: s.netuid,
      name: s.name || `Subnet ${s.netuid}`,
      emission: parseFloat(s.emission) || 0,
      price: parseFloat(s.price) || 0,
      total_stake: parseFloat(s.total_stake) || 0,
      owner: s.owner || null
    })).sort((a, b) => b.emission - a.emission);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        subnets: subnets.slice(0, 20), // Top 20
        total_count: subnets.length,
        updated_at: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error fetching subnets:', error);
    
    // Return fallback data
    const fallbackSubnets = [
      { netuid: 1, name: 'Apex', emission: 4.2, price: 12.50 },
      { netuid: 7, name: 'Subvortex', emission: 3.8, price: 8.30 },
      { netuid: 8, name: 'Taoshi', emission: 3.5, price: 15.20 },
      { netuid: 13, name: 'Dataverse', emission: 3.2, price: 6.80 },
      { netuid: 18, name: 'Cortex', emission: 2.9, price: 4.50 },
      { netuid: 19, name: 'Inference', emission: 2.7, price: 9.10 },
      { netuid: 21, name: 'Omega', emission: 2.5, price: 7.20 },
      { netuid: 28, name: 'Foundry', emission: 2.3, price: 5.60 },
      { netuid: 32, name: 'ITS', emission: 2.1, price: 3.80 },
      { netuid: 37, name: 'Finetuning', emission: 1.9, price: 11.30 },
      { netuid: 44, name: 'SocialTensor', emission: 1.7, price: 2.90 },
      { netuid: 49, name: 'Autocast', emission: 1.5, price: 4.20 },
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        subnets: fallbackSubnets,
        total_count: 64,
        updated_at: new Date().toISOString(),
        fallback: true
      })
    };
  }
};
