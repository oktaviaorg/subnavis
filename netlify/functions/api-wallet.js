// Netlify Function: Get Wallet data from Taostats API
const TAOSTATS_API_KEY = 'tao-7525a19d-5392-42f5-b854-7aae224818a7:82ca85cf';

// Convert rao to TAO (1 TAO = 1e9 rao)
const raoToTao = (rao) => parseFloat(rao || 0) / 1e9;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const address = event.queryStringParameters?.address;
  
  if (!address) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing address parameter' })
    };
  }

  try {
    // Fetch account info from Taostats
    const accountResponse = await fetch(
      `https://api.taostats.io/api/account/latest/v1?address=${address}`,
      { headers: { 'Authorization': TAOSTATS_API_KEY } }
    );

    if (!accountResponse.ok) {
      throw new Error(`Taostats API error: ${accountResponse.status}`);
    }

    const accJson = await accountResponse.json();
    
    // Handle Taostats pagination format: { pagination: {}, data: [] }
    const accountData = accJson.data?.[0] || accJson[0] || {};

    // Parse balances (values are in rao = 1e-9 TAO)
    const freeBalance = raoToTao(accountData.balance_free);
    const stakedBalance = raoToTao(accountData.balance_staked);
    const totalBalance = raoToTao(accountData.balance_total);

    // Parse alpha balances (staking positions per subnet)
    const positions = [];
    const alphaBalances = accountData.alpha_balances || [];
    
    // Group by netuid
    const bySubnet = {};
    alphaBalances.forEach(alpha => {
      const netuid = alpha.netuid;
      const amountTao = raoToTao(alpha.balance_as_tao);
      
      if (!bySubnet[netuid]) {
        bySubnet[netuid] = { netuid, staked: 0, validators: 0 };
      }
      bySubnet[netuid].staked += amountTao;
      bySubnet[netuid].validators += 1;
    });

    // Convert to sorted array
    for (const netuid in bySubnet) {
      if (bySubnet[netuid].staked > 0.0001) { // Filter dust
        positions.push(bySubnet[netuid]);
      }
    }
    positions.sort((a, b) => b.staked - a.staked);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        address,
        total_balance: totalBalance,
        free_balance: freeBalance,
        total_staked: stakedBalance,
        positions: positions.slice(0, 20), // Top 20 positions
        updated_at: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error fetching wallet:', error.message);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        address,
        total_balance: 0,
        free_balance: 0,
        total_staked: 0,
        positions: [],
        updated_at: new Date().toISOString(),
        error: error.message
      })
    };
  }
};
