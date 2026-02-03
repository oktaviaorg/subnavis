let taoPrice = 0;
let wallets = [];

// Load on start
document.addEventListener('DOMContentLoaded', async () => {
  await loadPrice();
  await loadWallets();
  renderWallets();
});

async function loadPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd,eur&include_24hr_change=true');
    const data = await res.json();
    taoPrice = data.bittensor.usd;
    const change = data.bittensor.usd_24h_change;
    
    document.getElementById('taoPrice').textContent = `$${taoPrice.toFixed(2)}`;
    const changeEl = document.getElementById('priceChange');
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}% (24h)`;
    changeEl.className = `price-change ${change >= 0 ? 'up' : 'down'}`;
  } catch (e) {
    document.getElementById('taoPrice').textContent = 'Error';
    document.getElementById('priceChange').textContent = 'Could not load price';
  }
}

async function loadWallets() {
  return new Promise(resolve => {
    chrome.storage.local.get(['wallets'], (result) => {
      wallets = result.wallets || [];
      resolve();
    });
  });
}

function saveWallets() {
  chrome.storage.local.set({ wallets });
}

async function fetchBalance(address) {
  try {
    const res = await fetch(`https://taostats.io/api/account/${address}/balance`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return parseFloat(data.balance) / 1e9; // Convert from rao to TAO
  } catch (e) {
    // Fallback: try different API
    try {
      const res2 = await fetch(`https://api.subquery.network/sq/moltbot/bittensor-mainnet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ account(id: "${address}") { balance } }`
        })
      });
      const data2 = await res2.json();
      if (data2.data?.account?.balance) {
        return parseFloat(data2.data.account.balance) / 1e9;
      }
    } catch (e2) {}
    return null;
  }
}

async function renderWallets() {
  const container = document.getElementById('walletList');
  
  if (wallets.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#8b8f9a;padding:20px;">No wallets yet.<br>Add one below!</div>';
    document.getElementById('totalBox').style.display = 'none';
    return;
  }

  container.innerHTML = '<div class="loading">Fetching balances...</div>';
  
  let totalTao = 0;
  let html = '';
  
  for (const w of wallets) {
    const balance = await fetchBalance(w.address);
    const balanceDisplay = balance !== null ? balance.toFixed(4) : '?';
    const usdDisplay = balance !== null ? (balance * taoPrice).toFixed(2) : '?';
    
    if (balance !== null) totalTao += balance;
    
    html += `
      <div class="wallet">
        <button class="remove-btn" onclick="removeWallet('${w.address}')">&times;</button>
        <div class="wallet-name">${w.name}</div>
        <div class="wallet-balance">${balanceDisplay} τ</div>
        <div class="wallet-usd">≈ $${usdDisplay}</div>
        <div class="wallet-addr">${w.address.slice(0,8)}...${w.address.slice(-8)}</div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  document.getElementById('totalBox').style.display = 'block';
  document.getElementById('totalTao').textContent = `${totalTao.toFixed(4)} τ`;
  document.getElementById('totalUsd').textContent = `≈ $${(totalTao * taoPrice).toFixed(2)}`;
}

function showAddForm() {
  document.getElementById('addForm').classList.add('show');
  document.getElementById('addBtn').style.display = 'none';
  document.getElementById('walletName').focus();
}

function addWallet() {
  const name = document.getElementById('walletName').value.trim();
  const address = document.getElementById('walletAddr').value.trim();
  
  if (!name || !address) {
    alert('Please fill both fields');
    return;
  }
  
  if (!address.startsWith('5') || address.length < 40) {
    alert('Invalid TAO address');
    return;
  }
  
  if (wallets.some(w => w.address === address)) {
    alert('Wallet already added');
    return;
  }
  
  wallets.push({ name, address });
  saveWallets();
  
  document.getElementById('walletName').value = '';
  document.getElementById('walletAddr').value = '';
  document.getElementById('addForm').classList.remove('show');
  document.getElementById('addBtn').style.display = 'block';
  
  renderWallets();
}

function removeWallet(address) {
  if (confirm('Remove this wallet?')) {
    wallets = wallets.filter(w => w.address !== address);
    saveWallets();
    renderWallets();
  }
}
