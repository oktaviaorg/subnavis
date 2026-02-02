// TAO Wallet PWA
// Version 0.1.0

const TAO_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd';
let TAO_PRICE_USD = 450; // Default, will fetch real price

// State
let wallet = null;
let balance = null;
let stakes = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/wallet/sw.js');
      console.log('Service Worker registered');
    } catch (err) {
      console.log('SW registration failed:', err);
    }
  }
  
  // Fetch TAO price
  fetchTaoPrice();
  
  // Load wallet
  await loadWallet();
  
  // Check for install prompt
  checkInstallPrompt();
});

// Fetch real TAO price
async function fetchTaoPrice() {
  try {
    const response = await fetch(TAO_PRICE_API);
    const data = await response.json();
    if (data.bittensor?.usd) {
      TAO_PRICE_USD = data.bittensor.usd;
    }
  } catch (err) {
    console.log('Price fetch failed, using default');
  }
}

// Load wallet from localStorage
async function loadWallet() {
  const stored = localStorage.getItem('tao_wallet');
  
  if (stored) {
    wallet = JSON.parse(stored);
    await fetchBalance();
    renderWallet();
  } else {
    renderNoWallet();
  }
}

// Fetch balance from Bittensor
async function fetchBalance() {
  try {
    const response = await fetch(`https://subnavis.io/.netlify/functions/api-wallet?address=${wallet.address}`);
    const data = await response.json();
    
    if (data.total_balance !== undefined) {
      balance = {
        free: data.free_balance || 0,
        staked: data.total_staked || 0,
        total: data.total_balance || 0
      };
      // Convert positions to stakes format
      stakes = (data.positions || []).map(p => ({
        subnet: p.netuid,
        amount: p.staked,
        validator: `${p.validators} validator${p.validators > 1 ? 's' : ''}`
      }));
    }
  } catch (err) {
    console.error('Failed to fetch balance:', err);
    // Use demo data if fetch fails
    balance = { free: 0, staked: 0, total: 0 };
    stakes = [];
  }
}

// Render wallet view
function renderWallet() {
  const app = document.getElementById('app');
  const totalTao = balance ? balance.total : 0;
  const freeTao = balance ? balance.free : 0;
  const totalUsd = totalTao * TAO_PRICE_USD;
  
  app.innerHTML = `
    <!-- Account Card -->
    <div class="account-card">
      <div class="account-name">${wallet.name || 'My Wallet'}</div>
      <div class="account-address" onclick="copyAddress()">${wallet.address}</div>
      
      <div class="balance-section">
        <div class="balance-label">Total Balance</div>
        <div class="balance-tao">${totalTao.toFixed(4)} τ</div>
        <div class="balance-usd">≈ $${totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="actions">
      <button class="action-btn" onclick="showSend()">
        <div class="action-icon">↑</div>
        <div class="action-label">Send</div>
      </button>
      <button class="action-btn" onclick="showReceive()">
        <div class="action-icon">↓</div>
        <div class="action-label">Receive</div>
      </button>
      <button class="action-btn" onclick="openStaking()">
        <div class="action-icon">📊</div>
        <div class="action-label">Stake</div>
      </button>
    </div>
    
    <!-- Balance Breakdown -->
    <div class="section-title">
      <span>Balance Breakdown</span>
    </div>
    
    <div class="stake-item">
      <div class="stake-info">
        <div class="subnet-badge" style="background: #3b82f6;">FREE</div>
        <div class="stake-name">Available</div>
      </div>
      <div class="stake-amount">
        <div class="stake-tao">${freeTao.toFixed(4)} τ</div>
        <div class="stake-usd">$${(freeTao * TAO_PRICE_USD).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
      </div>
    </div>
    
    <!-- Staked Positions -->
    <div class="section-title" style="margin-top: 20px;">
      <span>Staked Positions</span>
      <span>${stakes.length}</span>
    </div>
    
    ${stakes.length > 0 ? stakes.map(stake => `
      <div class="stake-item">
        <div class="stake-info">
          <div class="subnet-badge">SN${stake.subnet}</div>
          <div class="stake-name">${stake.validator || 'Validator'}</div>
        </div>
        <div class="stake-amount">
          <div class="stake-tao">${stake.amount.toFixed(4)} τ</div>
          <div class="stake-usd">$${(stake.amount * TAO_PRICE_USD).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
      </div>
    `).join('') : `
      <div class="stake-item">
        <div class="stake-info">
          <div class="stake-name" style="color: rgba(255,255,255,0.5)">No staked positions yet</div>
        </div>
      </div>
    `}
    
    <!-- Refresh Button -->
    <button class="btn-secondary" style="margin-top: 24px;" onclick="refreshBalance()">
      🔄 Refresh Balance
    </button>
  `;
}

// Render no wallet view
function renderNoWallet() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="no-wallet">
      <div class="no-wallet-icon">🔐</div>
      <h2>Welcome to TAO Wallet</h2>
      <p>The native wallet for Bittensor ecosystem. Track your TAO, view stakes, and connect to dApps.</p>
      
      <button class="btn-primary" onclick="createWallet()">
        Create New Wallet
      </button>
      <button class="btn-secondary" onclick="importWallet()">
        Import Existing Address
      </button>
    </div>
  `;
}

// Create new wallet (watch-only for PWA)
function createWallet() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="no-wallet">
      <h2>⚠️ PWA Limitation</h2>
      <p>For security, seed phrase generation requires the desktop extension. This PWA is <strong>watch-only</strong> — you can track any TAO address.</p>
      
      <button class="btn-primary" onclick="importWallet()">
        Track an Address
      </button>
      <button class="btn-secondary" onclick="renderNoWallet()">
        Back
      </button>
    </div>
  `;
}

// Import wallet (watch-only)
function importWallet() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="no-wallet">
      <h2>Track TAO Address</h2>
      <p>Enter any Bittensor address to track its balance and staking positions.</p>
      
      <input type="text" id="tao-address" placeholder="5..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
      
      <input type="text" id="wallet-name" placeholder="Label (optional)">
      
      <button class="btn-primary" onclick="doImport()">
        Track Address
      </button>
      
      <div style="margin: 20px 0; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 12px;">Try an example:</p>
        <button class="btn-secondary" onclick="loadExample('taostats')" style="font-size: 14px; padding: 12px; margin-bottom: 8px;">
          📊 Taostats Validator
        </button>
        <button class="btn-secondary" onclick="loadExample('baby-tao')" style="font-size: 14px; padding: 12px; margin-bottom: 8px;">
          🍼 Baby TAO (SN49)
        </button>
        <button class="btn-secondary" onclick="loadExample('tao5')" style="font-size: 14px; padding: 12px;">
          🔷 tao5 Validator
        </button>
      </div>
      
      <button class="btn-secondary" onclick="renderNoWallet()" style="margin-top: 12px;">
        Back
      </button>
    </div>
  `;
  
  // Focus input
  setTimeout(() => document.getElementById('tao-address').focus(), 100);
}

// Load example wallet
function loadExample(example) {
  const examples = {
    'baby-tao': {
      address: '5FL781vfkLNnYBUi58JnhZ3r2waHDMiehxRhzcMaMWvKDfXf',
      name: 'Baby TAO (SN49)'
    },
    'taostats': {
      address: '5GcCZ2BPXBjgG88tXJCEtkbdg2hNrPbL4EFfbiVRvBZdSQDC',
      name: 'Taostats Validator'
    },
    'tao5': {
      address: '5EJAqczgzCMvWcmXhKMZH4vMS5gPy8BjeuHjz5o5yN6RYzX2',
      name: 'tao5 Validator'
    }
  };
  
  const ex = examples[example];
  if (ex) {
    document.getElementById('tao-address').value = ex.address;
    document.getElementById('wallet-name').value = ex.name;
    showToast('✓ Example loaded - tap Track!');
  }
}

// Do import
async function doImport() {
  const address = document.getElementById('tao-address').value.trim();
  const name = document.getElementById('wallet-name').value.trim() || 'My Wallet';
  
  // Validate TAO address (starts with 5, 48 chars)
  if (!address.startsWith('5') || address.length < 47) {
    showToast('❌ Invalid TAO address (should start with 5)');
    return;
  }
  
  const newWallet = {
    name: name,
    address: address,
    created: Date.now(),
    watchOnly: true
  };
  
  localStorage.setItem('tao_wallet', JSON.stringify(newWallet));
  wallet = newWallet;
  
  showToast('✓ Address added!');
  await fetchBalance();
  renderWallet();
}

// Copy address
function copyAddress() {
  navigator.clipboard.writeText(wallet.address);
  showToast('✓ Address copied!');
}

// Refresh balance
async function refreshBalance() {
  showToast('🔄 Refreshing...');
  await fetchTaoPrice();
  await fetchBalance();
  renderWallet();
  showToast('✓ Balance updated!');
}

// Show receive modal
function showReceive() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'receiveModal';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Receive TAO</h3>
        <button class="modal-close" onclick="document.getElementById('receiveModal').remove()">×</button>
      </div>
      
      <div class="qr-placeholder" id="qrCode"></div>
      
      <p style="text-align:center; font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:16px; word-break:break-all;">
        ${wallet.address}
      </p>
      
      <button class="btn-primary" onclick="copyAddress(); document.getElementById('receiveModal').remove();">
        📋 Copy Address
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Generate QR code (using simple text for now)
  const qrDiv = document.getElementById('qrCode');
  qrDiv.innerHTML = `<div style="background:#fff; color:#000; padding:20px; text-align:center; font-size:10px; word-break:break-all; max-width:200px;">${wallet.address}</div>`;
}

// Show send (not supported in watch-only)
function showSend() {
  showToast('⚠️ Watch-only mode — use desktop extension to send');
}

// Open staking page
function openStaking() {
  window.open('https://subnavis.io/dashboard', '_blank');
}

// Settings
function showSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'settingsModal';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Settings</h3>
        <button class="modal-close" onclick="document.getElementById('settingsModal').remove()">×</button>
      </div>
      
      <p style="color:rgba(255,255,255,0.6); margin-bottom:20px;">TAO Wallet PWA v0.1.0</p>
      
      <button class="btn-secondary" style="margin-bottom:12px;" onclick="importWallet(); document.getElementById('settingsModal').remove();">
        📝 Change Address
      </button>
      
      <button class="btn-secondary" style="margin-bottom:12px; border-color:#ff6b6b; color:#ff6b6b;" onclick="clearWallet()">
        🗑️ Clear Wallet Data
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Clear wallet
function clearWallet() {
  if (confirm('Remove tracked address? This cannot be undone.')) {
    localStorage.removeItem('tao_wallet');
    wallet = null;
    balance = null;
    stakes = [];
    document.getElementById('settingsModal')?.remove();
    renderNoWallet();
    showToast('✓ Wallet cleared');
  }
}

// Toast notification
function showToast(message) {
  // Remove existing toast
  document.querySelector('.toast')?.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 2500);
}

// PWA Install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installPrompt').classList.add('show');
});

function checkInstallPrompt() {
  // Show iOS install instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  if (isIOS && !isStandalone) {
    setTimeout(() => {
      const prompt = document.getElementById('installPrompt');
      prompt.querySelector('p').textContent = 'Tap Share → "Add to Home Screen" for the full app experience!';
      prompt.classList.add('show');
    }, 3000);
  }
}

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      deferredPrompt = null;
      document.getElementById('installPrompt').classList.remove('show');
    });
  } else {
    // iOS - just dismiss
    dismissInstall();
  }
}

function dismissInstall() {
  document.getElementById('installPrompt').classList.remove('show');
}
