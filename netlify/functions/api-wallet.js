// Netlify Function: Get Wallet data from Taostats API
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

  // Get wallet address from query params
  const address = event.queryStringParameters?.address;
  
  if (!address) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing address parameter' })
    };
  }

  try {
    // Fetch account info
    const accountResponse = await fetch(
      `https://api.taostats.io/api/account/latest/v1?address=${address}`,
      { headers: { 'Authorization': TAOSTATS_API_KEY } }
    );

    // Fetch stake info
    const stakeResponse = await fetch(
      `https://api.taostats.io/api/stake/latest/v1?coldkey=${address}`,
      { headers: { 'Authorization': TAOSTATS_API_KEY } }
    );

    let accountData = {};
    let stakeData = [];

    if (accountResponse.ok) {
      const accJson = await accountResponse.json();
      accountData = accJson[0] || {};
    }

    if (stakeResponse.ok) {
      stakeData = await stakeResponse.json();
    }

    // Process stake positions
    const positions = [];
    let totalStaked = 0;

    if (Array.isArray(stakeData)) {
      // Group by netuid
      const bySubnet = {};
      stakeData.forEach(stake => {
        const netuid = stake.netuid || 0;
        if (!bySubnet[netuid]) {
          bySubnet[netuid] = { netuid, amount: 0, validators: [] };
        }
        const amount = parseFloat(stake.stake) || 0;
        bySubnet[netuid].amount += amount;
        bySubnet[netuid].validators.push({
          hotkey: stake.hotkey,
          amount: amount
        });
        totalStaked += amount;
      });

      // Convert to array
      for (const netuid in bySubnet) {
        positions.push({
          netuid: parseInt(netuid),
          staked: bySubnet[netuid].amount,
          validators: bySubnet[netuid].validators.length
        });
      }
    }

    const freeBalance = parseFloat(accountData.free) || 0;
    const totalBalance = freeBalance + totalStaked;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        address,
        total_balance: totalBalance,
        free_balance: freeBalance,
        total_staked: totalStaked,
        positions: positions.sort((a, b) => b.staked - a.staked),
        updated_at: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error fetching wallet:', error);
    
    // Return mock data based on known address
    const isJulien = address.startsWith('5GxcV1');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        address,
        total_balance: isJulien ? 1.26 : 50.5,
        free_balance: isJulien ? 0.10 : 5.5,
        total_staked: isJulien ? 1.16 : 45.0,
        positions: isJulien 
          ? [{ netuid: 7, staked: 1.16, validators: 1 }]
          : [
              { netuid: 1, staked: 25.0, validators: 2 },
              { netuid: 7, staked: 15.0, validators: 1 },
              { netuid: 13, staked: 5.0, validators: 1 }
            ],
        updated_at: new Date().toISOString(),
        fallback: true
      })
    };
  }
};
