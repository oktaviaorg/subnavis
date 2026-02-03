/**
 * SubNavis API v1 - Price Endpoint
 * GET /api/v1/price
 * 
 * Returns TAO price aggregated from multiple sources
 */

const COINGECKO_API_KEY = 'CG-J44TTNXaFUQiU5RygpD45CZH';
const TAOSTATS_API_KEY = 'tao-7525a19d-5392-42f5-b854-7aae224818a7:82ca85cf';

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Fetch from CoinGecko
    const cgResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd,eur&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
      {
        headers: {
          'x-cg-demo-api-key': COINGECKO_API_KEY
        }
      }
    );
    const cgData = await cgResponse.json();

    // Fetch from TaoStats for additional data
    const tsResponse = await fetch(
      'https://api.taostats.io/api/price/latest/v1?asset=tao',
      {
        headers: {
          'Authorization': TAOSTATS_API_KEY
        }
      }
    );
    const tsData = await tsResponse.json();

    // Build response
    const response = {
      success: true,
      data: {
        symbol: 'TAO',
        name: 'Bittensor',
        price: {
          usd: cgData.bittensor?.usd || null,
          eur: cgData.bittensor?.eur || null
        },
        change_24h: {
          usd: cgData.bittensor?.usd_24h_change || null,
          eur: cgData.bittensor?.eur_24h_change || null
        },
        volume_24h: {
          usd: cgData.bittensor?.usd_24h_vol || null
        },
        market_cap: {
          usd: cgData.bittensor?.usd_market_cap || null
        },
        taostats: tsData.data || null,
        sources: ['coingecko', 'taostats'],
        updated_at: new Date().toISOString()
      },
      api: {
        version: 'v1',
        endpoint: '/price',
        docs: 'https://subnavis.io/developers'
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch price data',
        message: error.message
      })
    };
  }
};
