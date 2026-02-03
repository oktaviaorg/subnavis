/**
 * SubNavis API v1 - Subnets Endpoint
 * GET /api/v1/subnets
 * GET /api/v1/subnets?sort=perf_7d|numeric|apy
 * 
 * Returns all Bittensor subnets with computed metrics
 */

const TAOSTATS_API_KEY = 'tao-7525a19d-5392-42f5-b854-7aae224818a7:82ca85cf';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get query params
    const params = event.queryStringParameters || {};
    const sort = params.sort || 'perf_7d'; // Default: performance 7 days
    const limit = parseInt(params.limit) || 100;

    // Fetch subnets from TaoStats
    const response = await fetch(
      'https://api.taostats.io/api/subnet/latest/v1',
      {
        headers: {
          'Authorization': TAOSTATS_API_KEY
        }
      }
    );
    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response from TaoStats');
    }

    // Process and enrich subnet data
    let subnets = data.data.map(subnet => ({
      id: subnet.netuid,
      name: subnet.name || `Subnet ${subnet.netuid}`,
      description: subnet.description || null,
      owner: subnet.owner || null,
      emission: subnet.emission || 0,
      emission_pct: subnet.emission_pct || 0,
      tempo: subnet.tempo || null,
      difficulty: subnet.difficulty || null,
      immunity_period: subnet.immunity_period || null,
      max_validators: subnet.max_n || null,
      min_stake: subnet.min_stake || null,
      // Calculated fields
      apy: subnet.apy || calculateAPY(subnet),
      perf_24h: subnet.change_24h || null,
      perf_7d: subnet.change_7d || null,
      validators_count: subnet.validators_count || null,
      miners_count: subnet.miners_count || null,
      total_stake: subnet.total_stake || null,
      updated_at: subnet.updated_at || new Date().toISOString()
    }));

    // Sort subnets
    switch (sort) {
      case 'numeric':
        subnets.sort((a, b) => a.id - b.id);
        break;
      case 'apy':
        subnets.sort((a, b) => (b.apy || 0) - (a.apy || 0));
        break;
      case 'emission':
        subnets.sort((a, b) => (b.emission_pct || 0) - (a.emission_pct || 0));
        break;
      case 'perf_7d':
      default:
        subnets.sort((a, b) => (b.perf_7d || 0) - (a.perf_7d || 0));
        break;
    }

    // Apply limit
    subnets = subnets.slice(0, limit);

    const responseBody = {
      success: true,
      data: {
        count: subnets.length,
        sort: sort,
        subnets: subnets
      },
      api: {
        version: 'v1',
        endpoint: '/subnets',
        params: {
          sort: 'perf_7d | numeric | apy | emission',
          limit: 'number (default: 100)'
        },
        docs: 'https://subnavis.io/developers'
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseBody, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch subnets data',
        message: error.message
      })
    };
  }
};

// Helper function to calculate APY from emission data
function calculateAPY(subnet) {
  if (!subnet.emission || !subnet.total_stake) return null;
  // Simplified APY calculation
  const dailyEmission = subnet.emission;
  const yearlyEmission = dailyEmission * 365;
  const apy = (yearlyEmission / subnet.total_stake) * 100;
  return Math.round(apy * 100) / 100;
}
