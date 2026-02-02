// TAO Wallet PWA v2 - Phantom-level UX
// Features: Multi-wallet, Pull-to-refresh, Animations, Charts

const APP_VERSION = '2.0.0';
const API_BASE = 'https://subnavis.io/.netlify/functions';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// State
let state = {
  wallets: [],
  activeWalletIndex: 0,
  balance: null,
  positions: [],
  activity: [],
  taoPrice: 450,
  priceChange24h: 0,
  priceHistory: [],
  isLoading: true,
  currentTab: 'home'
};

// ============ INIT ============

async function init() {
  // Load saved wallets
  const saved = localStorage.getItem('tao_wallets');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      state.wallets = data.wallets || [];
      state.activeWalletIndex = data.activeIndex || 0;
    } catch (e) {}
  }
  
  // Fetch price
  await fetchPrice();
  
  // If has wallets, load data and show main UI
  if (state.wallets.length > 0) {
    await loadWalletData();
    renderMainUI();
  } else {
    renderOnboarding();
  }
  
  // Setup pull-to-refresh
  setupPullToRefresh();
  
  // Periodic price refresh
  setInterval(fetchPrice, 60000);
}

// ============ API ============

async function fetchPrice() {
  try {
    const res = await fetch(`${COINGECKO_API}/simple/price?ids=bittensor&vs_currencies=usd&include_24hr_change=true`);
    const data = await res.json();
    state.taoPrice = data.bittensor?.usd || 450;
    state.priceChange24h = data.bittensor?.usd_24h_change || 0;
  } catch (e) {
    console.error('Price fetch error:', e);
  }
}

async function fetchBalance(address) {
  try {
    const res = await fetch(`${API_BASE}/api-wallet?address=${address}`);
    return await res.json();
  } catch (e) {
    console.error('Balance fetch error:', e);
    return null;
  }
}

async function loadWalletData() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (!wallet) return;
  
  state.isLoading = true;
  
  const data = await fetchBalance(wallet.address);
  if (data) {
    state.balance = {
      total: data.total_balance || 0,
      free: data.free_balance || 0,
      staked: data.total_staked || 0
    };
    state.positions = data.positions || [];
  }
  
  // Mock activity for now
  state.activity = [
    { type: 'receive', amount: 1.5, time: Date.now() - 3600000, from: '5Gx...' },
    { type: 'stake', amount: 10, time: Date.now() - 86400000, subnet: 1 },
    { type: 'send', amount: 2.3, time: Date.now() - 172800000, to: '5Hy...' }
  ];
  
  // Generate mock price history
  state.priceHistory = generateMockPriceHistory();
  
  state.isLoading = false;
}

function generateMockPriceHistory() {
  const points = [];
  let price = state.taoPrice;
  for (let i = 24; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * 20;
    price = Math.max(price + variance, 100);
    points.push(price);
  }
  // Ensure last point is current price
  points[points.length - 1] = state.taoPrice;
  return points;
}

// ============ STORAGE ============

function saveWallets() {
  localStorage.setItem('tao_wallets', JSON.stringify({
    wallets: state.wallets,
    activeIndex: state.activeWalletIndex
  }));
}

// ============ UI HELPERS ============

function $(id) {
  return document.getElementById(id);
}

function haptic() {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

function showToast(message, type = 'default') {
  const toast = $('toast');
  toast.innerHTML = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function shortAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatTAO(amount) {
  return amount.toFixed(4);
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ============ RENDERING ============

function renderOnboarding() {
  const app = $('app');
  app.innerHTML = `
    <div class="onboarding">
      <div class="onboarding-icon">τ</div>
      <h1 class="onboarding-title">TAO Wallet</h1>
      <p class="onboarding-desc">The simplest way to manage your Bittensor assets. Stake, swap, and track your TAO.</p>
      <div class="onboarding-buttons">
        <button class="btn btn-primary" onclick="showCreateWallet()">Create New Wallet</button>
        <button class="btn btn-secondary" onclick="showImportWallet()">Import Wallet</button>
        <button class="btn btn-ghost" onclick="showTrackAddress()">Track Address</button>
      </div>
    </div>
  `;
}

function renderMainUI() {
  const wallet = state.wallets[state.activeWalletIndex];
  const balance = state.balance || { total: 0, free: 0, staked: 0 };
  const totalUSD = balance.total * state.taoPrice;
  const isPositive = state.priceChange24h >= 0;
  
  const app = $('app');
  app.innerHTML = `
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <div class="wallet-selector" onclick="showWalletSelector()">
          <div class="wallet-avatar">${(wallet.name || 'W')[0].toUpperCase()}</div>
          <span class="wallet-name">${wallet.name || 'Wallet'}</span>
          <span class="wallet-chevron">▼</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-btn" onclick="showScanQR()">📷</button>
        <button class="icon-btn" onclick="showSettings()">⚙️</button>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="main" id="mainContent">
      <div class="ptr-indicator" id="ptrIndicator">
        <div class="ptr-spinner"></div>
      </div>
      
      <!-- Balance Card -->
      <div class="balance-card">
        <div class="balance-label">Total Balance</div>
        <div class="balance-amount" id="balanceAmount">
          ${state.isLoading ? '<div class="skeleton skeleton-balance"></div>' : formatTAO(balance.total) + ' τ'}
        </div>
        <div class="balance-usd">${formatUSD(totalUSD)}</div>
        <div class="balance-change ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '↑' : '↓'} ${Math.abs(state.priceChange24h).toFixed(2)}% (24h)
        </div>
        
        <!-- Mini Chart -->
        <div class="mini-chart">
          <canvas class="chart-canvas" id="priceChart"></canvas>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="quick-actions">
        <div class="quick-action" onclick="haptic(); showReceive()">
          <div class="quick-action-icon">↓</div>
          <span class="quick-action-label">Receive</span>
        </div>
        <div class="quick-action" onclick="haptic(); showSend()">
          <div class="quick-action-icon">↑</div>
          <span class="quick-action-label">Send</span>
        </div>
        <div class="quick-action" onclick="haptic(); showStake()">
          <div class="quick-action-icon">📊</div>
          <span class="quick-action-label">Stake</span>
        </div>
        <div class="quick-action" onclick="haptic(); showSwap()">
          <div class="quick-action-icon">🔄</div>
          <span class="quick-action-label">Swap</span>
        </div>
      </div>
      
      <!-- Assets Section -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Assets</h2>
        </div>
        <div class="asset-list">
          <div class="asset-item" onclick="showAssetDetail('tao')">
            <div class="asset-icon">τ</div>
            <div class="asset-info">
              <div class="asset-name">TAO</div>
              <div class="asset-subtitle">Available</div>
            </div>
            <div class="asset-values">
              <div class="asset-amount">${formatTAO(balance.free)}</div>
              <div class="asset-usd">${formatUSD(balance.free * state.taoPrice)}</div>
            </div>
          </div>
          ${balance.staked > 0 ? `
          <div class="asset-item" onclick="showStakeDetail()">
            <div class="asset-icon" style="background: linear-gradient(135deg, #00d4aa, #00a8cc);">🔒</div>
            <div class="asset-info">
              <div class="asset-name">Staked TAO</div>
              <div class="asset-subtitle">${state.positions.length} position${state.positions.length > 1 ? 's' : ''}</div>
            </div>
            <div class="asset-values">
              <div class="asset-amount">${formatTAO(balance.staked)}</div>
              <div class="asset-usd">${formatUSD(balance.staked * state.taoPrice)}</div>
            </div>
          </div>
          ` : ''}
        </div>
      </section>
      
      ${state.positions.length > 0 ? `
      <!-- Staking Positions -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Staking</h2>
          <span class="section-link" onclick="showAllStakes()">See all</span>
        </div>
        <div class="asset-list">
          ${state.positions.slice(0, 3).map(pos => `
            <div class="asset-item">
              <div class="asset-icon subnet">SN${pos.netuid}</div>
              <div class="asset-info">
                <div class="asset-name">Subnet ${pos.netuid}</div>
                <div class="asset-subtitle">${pos.validator_name || shortAddress(pos.hotkey || '5...')}</div>
              </div>
              <div class="asset-values">
                <div class="asset-amount">${formatTAO(pos.staked)}</div>
                <div class="asset-usd">${formatUSD(pos.staked * state.taoPrice)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
      ` : ''}
      
      <!-- Activity Section -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Activity</h2>
          <span class="section-link" onclick="showAllActivity()">See all</span>
        </div>
        ${state.activity.length > 0 ? `
        <div class="asset-list">
          ${state.activity.slice(0, 3).map(act => `
            <div class="activity-item">
              <div class="activity-icon ${act.type}">${act.type === 'receive' ? '↓' : act.type === 'send' ? '↑' : '📊'}</div>
              <div class="activity-info">
                <div class="activity-type">${act.type === 'receive' ? 'Received' : act.type === 'send' ? 'Sent' : 'Staked'}</div>
                <div class="activity-time">${timeAgo(act.time)}</div>
              </div>
              <div class="activity-amount ${act.type}">${act.type === 'receive' ? '+' : act.type === 'send' ? '-' : ''}${formatTAO(act.amount)} τ</div>
            </div>
          `).join('')}
        </div>
        ` : '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No activity yet</p>'}
      </section>
      
      <div style="height: 20px;"></div>
    </main>
    
    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <div class="nav-item active" onclick="switchTab('home')">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Home</span>
      </div>
      <div class="nav-item" onclick="switchTab('stake')">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Stake</span>
      </div>
      <div class="nav-item" onclick="switchTab('swap')">
        <span class="nav-icon">🔄</span>
        <span class="nav-label">Swap</span>
      </div>
      <div class="nav-item" onclick="switchTab('activity')">
        <span class="nav-icon">📜</span>
        <span class="nav-label">Activity</span>
      </div>
    </nav>
  `;
  
  // Draw chart
  setTimeout(() => drawMiniChart(), 100);
}

// ============ CHART ============

function drawMiniChart() {
  const canvas = $('priceChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);
  
  const data = state.priceHistory;
  if (data.length < 2) return;
  
  const w = rect.width;
  const h = rect.height;
  const padding = 4;
  
  const min = Math.min(...data) * 0.98;
  const max = Math.max(...data) * 1.02;
  const range = max - min;
  
  ctx.clearRect(0, 0, w, h);
  
  // Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(171, 159, 242, 0.3)');
  gradient.addColorStop(1, 'rgba(171, 159, 242, 0)');
  
  // Fill
  ctx.beginPath();
  ctx.moveTo(padding, h);
  
  data.forEach((price, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - ((price - min) / range) * (h - padding * 2);
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  });
  
  ctx.lineTo(w - padding, h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Line
  ctx.beginPath();
  data.forEach((price, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - ((price - min) / range) * (h - padding * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#ab9ff2';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  // Current price dot
  const lastX = w - padding;
  const lastY = h - padding - ((data[data.length - 1] - min) / range) * (h - padding * 2);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ab9ff2';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(171, 159, 242, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ============ MODALS ============

function showModal(title, content) {
  const modals = $('modals');
  modals.innerHTML = `
    <div class="modal-overlay active" onclick="closeModal(event)">
      <div class="modal-sheet" onclick="event.stopPropagation()">
        <div class="modal-handle"></div>
        <h2 class="modal-title">${title}</h2>
        ${content}
      </div>
    </div>
  `;
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => $('modals').innerHTML = '', 300);
  }
}

// ============ WALLET ACTIONS ============

function showWalletSelector() {
  haptic();
  showModal('Wallets', `
    <div class="asset-list">
      ${state.wallets.map((w, i) => `
        <div class="asset-item ${i === state.activeWalletIndex ? 'active' : ''}" onclick="selectWallet(${i})">
          <div class="wallet-avatar">${(w.name || 'W')[0].toUpperCase()}</div>
          <div class="asset-info">
            <div class="asset-name">${w.name || 'Wallet ' + (i + 1)}</div>
            <div class="asset-subtitle">${shortAddress(w.address)}</div>
          </div>
          ${i === state.activeWalletIndex ? '<span style="color: var(--success);">✓</span>' : ''}
        </div>
      `).join('')}
    </div>
    <button class="btn btn-secondary" style="margin-top: 16px;" onclick="showAddWallet()">+ Add Wallet</button>
  `);
}

function selectWallet(index) {
  state.activeWalletIndex = index;
  saveWallets();
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  loadWalletData().then(renderMainUI);
}

function showAddWallet() {
  showModal('Add Wallet', `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <button class="btn btn-primary" onclick="showCreateWallet()">Create New</button>
      <button class="btn btn-secondary" onclick="showImportWallet()">Import Seed</button>
      <button class="btn btn-secondary" onclick="showTrackAddress()">Track Address</button>
    </div>
  `);
}

function showCreateWallet() {
  showModal('Create Wallet', `
    <div class="input-group">
      <label class="input-label">Wallet Name</label>
      <input type="text" class="input-field" id="walletName" placeholder="My Wallet" maxlength="20">
    </div>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px; line-height: 1.5;">
      ⚠️ This is a demo. In production, a secure seed phrase would be generated and encrypted locally.
    </p>
    <button class="btn btn-primary" onclick="createDemoWallet()">Create Wallet</button>
  `);
}

function createDemoWallet() {
  const name = $('walletName')?.value || 'Wallet';
  // Demo: generate fake address
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '5';
  for (let i = 0; i < 47; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  
  state.wallets.push({ name, address: addr, created: Date.now(), watchOnly: false });
  state.activeWalletIndex = state.wallets.length - 1;
  saveWallets();
  
  showToast('✅ Wallet created!', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  loadWalletData().then(renderMainUI);
}

function showImportWallet() {
  showModal('Import Wallet', `
    <div class="input-group">
      <label class="input-label">Wallet Name</label>
      <input type="text" class="input-field" id="importName" placeholder="My Wallet" maxlength="20">
    </div>
    <div class="input-group">
      <label class="input-label">Seed Phrase (12 or 24 words)</label>
      <textarea class="input-field" id="importSeed" placeholder="word1 word2 word3..." style="height: 100px;"></textarea>
    </div>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px; line-height: 1.5;">
      🔒 Your seed phrase is encrypted locally and never leaves your device.
    </p>
    <button class="btn btn-primary" onclick="importWallet()">Import</button>
  `);
}

function importWallet() {
  const name = $('importName')?.value || 'Imported';
  const seed = $('importSeed')?.value?.trim();
  
  if (!seed || seed.split(/\s+/).length < 12) {
    showToast('❌ Invalid seed phrase', 'error');
    return;
  }
  
  // Demo: derive fake address from seed
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '5';
  for (let i = 0; i < 47; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  
  state.wallets.push({ name, address: addr, created: Date.now(), watchOnly: false });
  state.activeWalletIndex = state.wallets.length - 1;
  saveWallets();
  
  showToast('✅ Wallet imported!', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  loadWalletData().then(renderMainUI);
}

function showTrackAddress() {
  showModal('Track Address', `
    <div class="input-group">
      <label class="input-label">Wallet Name</label>
      <input type="text" class="input-field" id="trackName" placeholder="Whale Wallet" maxlength="20">
    </div>
    <div class="input-group">
      <label class="input-label">TAO Address (starts with 5)</label>
      <input type="text" class="input-field" id="trackAddress" placeholder="5...">
    </div>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px;">
      👀 Read-only mode. You can view balances but not send or stake.
    </p>
    <button class="btn btn-primary" onclick="trackAddress()">Track</button>
  `);
}

function trackAddress() {
  const name = $('trackName')?.value || 'Tracked';
  const address = $('trackAddress')?.value?.trim();
  
  if (!address || !address.startsWith('5') || address.length < 47) {
    showToast('❌ Invalid address', 'error');
    return;
  }
  
  state.wallets.push({ name, address, created: Date.now(), watchOnly: true });
  state.activeWalletIndex = state.wallets.length - 1;
  saveWallets();
  
  showToast('✅ Address tracked!', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  loadWalletData().then(renderMainUI);
}

// ============ RECEIVE / SEND ============

function showReceive() {
  const wallet = state.wallets[state.activeWalletIndex];
  showModal('Receive TAO', `
    <div class="qr-container" id="qrCode">
      <canvas width="180" height="180"></canvas>
    </div>
    <div class="address-display" onclick="copyAddress()">${wallet.address}</div>
    <p class="copy-hint">Tap address to copy</p>
    <button class="btn btn-secondary" style="margin-top: 20px;" onclick="shareAddress()">Share</button>
  `);
  
  // Generate QR code (simple placeholder - would use qrcode.js in production)
  setTimeout(() => {
    const canvas = document.querySelector('#qrCode canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      // Draw placeholder pattern
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (Math.random() > 0.5) {
            ctx.fillRect(i * 20, j * 20, 18, 18);
          }
        }
      }
    }
  }, 100);
}

function copyAddress() {
  const wallet = state.wallets[state.activeWalletIndex];
  navigator.clipboard.writeText(wallet.address);
  haptic();
  showToast('📋 Address copied!', 'success');
}

function shareAddress() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (navigator.share) {
    navigator.share({
      title: 'My TAO Address',
      text: wallet.address
    });
  } else {
    copyAddress();
  }
}

function showSend() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (wallet.watchOnly) {
    showModal('Read-Only Mode', `
      <p style="text-align: center; color: var(--text-secondary); margin-bottom: 24px;">
        🔒 This wallet is in read-only mode.<br>Import your seed phrase to send TAO.
      </p>
      <button class="btn btn-primary" onclick="showImportWallet()">Import Wallet</button>
      <button class="btn btn-ghost" style="margin-top: 12px;" onclick="closeModal(event)">Cancel</button>
    `);
    return;
  }
  
  showModal('Send TAO', `
    <div class="input-group">
      <label class="input-label">Recipient Address</label>
      <input type="text" class="input-field" id="sendAddress" placeholder="5...">
    </div>
    <div class="input-group">
      <label class="input-label">Amount (τ)</label>
      <input type="number" class="input-field" id="sendAmount" placeholder="0.00" step="0.0001">
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="btn btn-secondary" style="flex:1; padding: 10px;" onclick="setSendAmount(0.25)">25%</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px;" onclick="setSendAmount(0.5)">50%</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px;" onclick="setSendAmount(1)">Max</button>
      </div>
    </div>
    <p style="color: var(--text-tertiary); font-size: 13px; margin-bottom: 20px;">
      Network fee: ~0.0001 τ
    </p>
    <button class="btn btn-primary" onclick="confirmSend()">Continue</button>
  `);
}

function setSendAmount(ratio) {
  const balance = state.balance?.free || 0;
  $('sendAmount').value = (balance * ratio - 0.0001).toFixed(4);
}

function confirmSend() {
  const address = $('sendAddress')?.value?.trim();
  const amount = parseFloat($('sendAmount')?.value);
  
  if (!address || !address.startsWith('5')) {
    showToast('❌ Invalid address', 'error');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showToast('❌ Invalid amount', 'error');
    return;
  }
  
  showModal('Confirm Send', `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 36px; font-weight: 700; margin-bottom: 8px;">${amount} τ</div>
      <div style="color: var(--text-secondary);">${formatUSD(amount * state.taoPrice)}</div>
    </div>
    <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="color: var(--text-tertiary); font-size: 12px; margin-bottom: 4px;">To</div>
      <div style="font-family: monospace; font-size: 13px; word-break: break-all;">${address}</div>
    </div>
    <p style="color: var(--warning); font-size: 13px; text-align: center; margin-bottom: 20px;">
      ⚠️ Demo mode - transactions are simulated
    </p>
    <button class="btn btn-primary" onclick="executeSend('${address}', ${amount})">Confirm & Send</button>
  `);
}

function executeSend(address, amount) {
  haptic();
  showToast('✅ Transaction sent! (Demo)', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
}

// ============ STAKE / SWAP ============

function showStake() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (wallet.watchOnly) {
    showModal('Read-Only Mode', `
      <p style="text-align: center; color: var(--text-secondary); margin-bottom: 24px;">
        🔒 This wallet is in read-only mode.<br>Import your seed phrase to stake TAO.
      </p>
      <button class="btn btn-primary" onclick="showImportWallet()">Import Wallet</button>
      <button class="btn btn-ghost" style="margin-top: 12px;" onclick="closeModal(event)">Cancel</button>
    `);
    return;
  }
  
  showModal('Stake TAO', `
    <p style="color: var(--text-secondary); margin-bottom: 20px; text-align: center;">
      Earn rewards by staking your TAO with validators on different subnets.
    </p>
    <div class="asset-list">
      <div class="asset-item" onclick="showSubnetStake(1)">
        <div class="asset-icon subnet">SN1</div>
        <div class="asset-info">
          <div class="asset-name">Text Generation</div>
          <div class="asset-subtitle">~18% APY</div>
        </div>
        <span style="color: var(--success);">→</span>
      </div>
      <div class="asset-item" onclick="showSubnetStake(8)">
        <div class="asset-icon subnet">SN8</div>
        <div class="asset-info">
          <div class="asset-name">Time Series</div>
          <div class="asset-subtitle">~22% APY</div>
        </div>
        <span style="color: var(--success);">→</span>
      </div>
      <div class="asset-item" onclick="showSubnetStake(19)">
        <div class="asset-icon subnet">SN19</div>
        <div class="asset-info">
          <div class="asset-name">Vision</div>
          <div class="asset-subtitle">~15% APY</div>
        </div>
        <span style="color: var(--success);">→</span>
      </div>
    </div>
    <button class="btn btn-secondary" style="margin-top: 16px;" onclick="showAllSubnets()">View All Subnets</button>
  `);
}

function showSubnetStake(netuid) {
  showToast(`📊 Subnet ${netuid} staking coming soon!`);
}

function showSwap() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (wallet.watchOnly) {
    showModal('Read-Only Mode', `
      <p style="text-align: center; color: var(--text-secondary); margin-bottom: 24px;">
        🔒 This wallet is in read-only mode.<br>Import your seed phrase to swap.
      </p>
      <button class="btn btn-primary" onclick="showImportWallet()">Import Wallet</button>
      <button class="btn btn-ghost" style="margin-top: 12px;" onclick="closeModal(event)">Cancel</button>
    `);
    return;
  }
  
  showModal('Swap', `
    <p style="color: var(--text-secondary); margin-bottom: 20px; text-align: center;">
      Swap between TAO and subnet tokens (dTAO).
    </p>
    <div class="asset-list">
      <div class="asset-item" onclick="startSwap('TAO', 'dTAO')">
        <div class="asset-icon">τ</div>
        <div class="asset-info">
          <div class="asset-name">TAO → dTAO</div>
          <div class="asset-subtitle">Swap to subnet tokens</div>
        </div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="startSwap('dTAO', 'TAO')">
        <div class="asset-icon subnet">α</div>
        <div class="asset-info">
          <div class="asset-name">dTAO → TAO</div>
          <div class="asset-subtitle">Swap to native TAO</div>
        </div>
        <span>→</span>
      </div>
    </div>
    <p style="color: var(--text-tertiary); font-size: 12px; text-align: center; margin-top: 16px;">
      Swap fee: 0.3%
    </p>
  `);
}

function startSwap(from, to) {
  showToast(`🔄 ${from} → ${to} swap coming soon!`);
}

// ============ SETTINGS ============

function showSettings() {
  haptic();
  const wallet = state.wallets[state.activeWalletIndex];
  
  showModal('Settings', `
    <div class="asset-list">
      <div class="asset-item" onclick="showWalletSettings()">
        <div class="asset-icon">👛</div>
        <div class="asset-info">
          <div class="asset-name">Wallet Settings</div>
          <div class="asset-subtitle">Name, export, delete</div>
        </div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showSecuritySettings()">
        <div class="asset-icon">🔐</div>
        <div class="asset-info">
          <div class="asset-name">Security</div>
          <div class="asset-subtitle">Password, biometrics</div>
        </div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showNetworkSettings()">
        <div class="asset-icon">🌐</div>
        <div class="asset-info">
          <div class="asset-name">Network</div>
          <div class="asset-subtitle">RPC, explorer</div>
        </div>
        <span>→</span>
      </div>
    </div>
    <div style="text-align: center; margin-top: 24px; color: var(--text-tertiary); font-size: 12px;">
      TAO Wallet v${APP_VERSION}
    </div>
  `);
}

function showWalletSettings() {
  showToast('⚙️ Wallet settings coming soon!');
}

function showSecuritySettings() {
  showToast('🔐 Security settings coming soon!');
}

function showNetworkSettings() {
  showToast('🌐 Network settings coming soon!');
}

function showScanQR() {
  showToast('📷 QR scanner coming soon!');
}

// ============ TAB NAVIGATION ============

function switchTab(tab) {
  haptic();
  state.currentTab = tab;
  
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  if (tab === 'home') {
    renderMainUI();
  } else if (tab === 'stake') {
    showStake();
  } else if (tab === 'swap') {
    showSwap();
  } else if (tab === 'activity') {
    showAllActivity();
  }
}

function showAllActivity() {
  showModal('Activity', `
    ${state.activity.length > 0 ? `
    <div class="asset-list">
      ${state.activity.map(act => `
        <div class="activity-item">
          <div class="activity-icon ${act.type}">${act.type === 'receive' ? '↓' : act.type === 'send' ? '↑' : '📊'}</div>
          <div class="activity-info">
            <div class="activity-type">${act.type === 'receive' ? 'Received' : act.type === 'send' ? 'Sent' : 'Staked'}</div>
            <div class="activity-time">${timeAgo(act.time)}</div>
          </div>
          <div class="activity-amount ${act.type}">${act.type === 'receive' ? '+' : act.type === 'send' ? '-' : ''}${formatTAO(act.amount)} τ</div>
        </div>
      `).join('')}
    </div>
    ` : '<p style="color: var(--text-tertiary); text-align: center; padding: 40px;">No activity yet</p>'}
  `);
}

function showAllStakes() {
  showModal('Staking Positions', `
    <div class="asset-list">
      ${state.positions.map(pos => `
        <div class="asset-item">
          <div class="asset-icon subnet">SN${pos.netuid}</div>
          <div class="asset-info">
            <div class="asset-name">Subnet ${pos.netuid}</div>
            <div class="asset-subtitle">${pos.validator_name || shortAddress(pos.hotkey || '5...')}</div>
          </div>
          <div class="asset-values">
            <div class="asset-amount">${formatTAO(pos.staked)}</div>
            <div class="asset-usd">${formatUSD(pos.staked * state.taoPrice)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primary" style="margin-top: 16px;" onclick="showStake()">Stake More</button>
  `);
}

// ============ PULL TO REFRESH ============

function setupPullToRefresh() {
  let startY = 0;
  let pulling = false;
  
  document.addEventListener('touchstart', (e) => {
    const main = $('mainContent');
    if (main && main.scrollTop === 0) {
      startY = e.touches[0].pageY;
      pulling = true;
    }
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    const diff = e.touches[0].pageY - startY;
    const indicator = $('ptrIndicator');
    if (diff > 0 && diff < 100 && indicator) {
      indicator.style.transform = `translateY(${diff - 40}px)`;
      indicator.style.opacity = Math.min(diff / 60, 1);
    }
  }, { passive: true });
  
  document.addEventListener('touchend', async () => {
    if (!pulling) return;
    pulling = false;
    
    const indicator = $('ptrIndicator');
    if (indicator && parseFloat(indicator.style.opacity) >= 1) {
      indicator.classList.add('visible');
      haptic();
      await loadWalletData();
      renderMainUI();
      showToast('✅ Refreshed!');
    }
    
    if (indicator) {
      indicator.style.transform = '';
      indicator.style.opacity = '';
      indicator.classList.remove('visible');
    }
  });
}

// ============ START ============

document.addEventListener('DOMContentLoaded', init);

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
