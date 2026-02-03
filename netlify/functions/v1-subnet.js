/**
 * SubNavis API v1 - Single Subnet Endpoint
 * GET /api/v1/subnet/:id
 * 
 * Returns detailed info for a specific subnet
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
    // Get subnet ID from path
    const pathParts = event.path.split('/');
    const subnetId = pathParts[pathParts.length - 1];

    if (!subnetId || isNaN(parseInt(subnetId))) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid subnet ID',
          message: 'Please provide a valid subnet ID (e.g., /api/v1/subnet/1)'
        })
      };
    }

    // Fetch all subnets (TaoStats doesn't have single subnet endpoint)
    const response = await fetch(
      'https://api.taostats.io/api/subnet/latest/v1',
      {
        headers: {
          'Authorization': TAOSTATS_API_KEY
        }
      }
    );
    const data = await response.json();

    // Find specific subnet
    const subnet = data.data?.find(s => s.netuid === parseInt(subnetId));

    if (!subnet) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Subnet not found',
          message: `Subnet ${subnetId} does not exist`
        })
      };
    }

    // Fetch validators for this subnet
    let validators = [];
    try {
      const valResponse = await fetch(
        `https://api.taostats.io/api/validator/latest/v1?netuid=${subnetId}`,
        {
          headers: {
            'Authorization': TAOSTATS_API_KEY
          }
        }
      );
      const valData = await valResponse.json();
      validators = valData.data?.slice(0, 10) || []; // Top 10 validators
    } catch (e) {
      // Validators fetch failed, continue without
    }

    const responseBody = {
      success: true,
      data: {
        id: subnet.netuid,
        name: subnet.name || `Subnet ${subnet.netuid}`,
        description: subnet.description || null,
        owner: subnet.owner || null,
        
        // Metrics
        metrics: {
          emission: subnet.emission || 0,
          emission_pct: subnet.emission_pct || 0,
          apy: subnet.apy || null,
          total_stake: subnet.total_stake || null,
          perf_24h: subnet.change_24h || null,
          perf_7d: subnet.change_7d || null
        },
        
        // Network params
        params: {
          tempo: subnet.tempo || null,
          difficulty: subnet.difficulty || null,
          immunity_period: subnet.immunity_period || null,
          max_validators: subnet.max_n || null,
          min_stake: subnet.min_stake || null
        },
        
        // Counts
        counts: {
          validators: subnet.validators_count || validators.length || null,
          miners: subnet.miners_count || null
        },
        
        // Top validators
        top_validators: validators.map(v => ({
          hotkey: v.hotkey,
          coldkey: v.coldkey,
          stake: v.stake,
          trust: v.trust,
          consensus: v.consensus
        })),
        
        // Links
        links: {
          taostats: `https://taostats.io/subnets/${subnetId}`,
          subnavis: `https://subnavis.io/subnet/${subnetId}`
        },
        
        updated_at: subnet.updated_at || new Date().toISOString()
      },
      api: {
        version: 'v1',
        endpoint: `/subnet/${subnetId}`,
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
        error: 'Failed to fetch subnet data',
        message: error.message
      })
    };
  }
};
