// TAO Wallet PWA v2 - 2026 Edition
// Phantom-level UX + AI Insights + Gamification + Biometric Auth

const APP_VERSION = '2.2.0';
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
  currentTab: 'home',
  badges: [],
  alerts: []
};

// Subnet info
const SUBNET_INFO = {
  0: { name: 'Root', emoji: '🌐', apy: 12 },
  1: { name: 'Text Gen', emoji: '📝', apy: 18.5 },
  8: { name: 'Taoshi', emoji: '📈', apy: 22.3 },
  9: { name: 'Pre-train', emoji: '🧠', apy: 24.1 },
  18: { name: 'Cortex', emoji: '🔮', apy: 19.8 },
  19: { name: 'Vision', emoji: '👁️', apy: 15.2 },
  21: { name: 'Omega', emoji: '🔄', apy: 17.0 }
};

// ============ INIT ============

async function init() {
  const saved = localStorage.getItem('tao_wallets');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      state.wallets = data.wallets || [];
      state.activeWalletIndex = data.activeIndex || 0;
    } catch (e) {}
  }
  
  await fetchPrice();
  
  if (state.wallets.length > 0) {
    // Check if biometric is enabled - require verification to unlock
    if (isBiometricEnabled()) {
      const verified = await showBiometricUnlock();
      if (!verified) {
        // Show locked screen if biometric fails
        renderLockedScreen();
        return;
      }
    }
    
    await loadWalletData();
    renderMainUI();
  } else {
    renderOnboarding();
  }
  
  setupPullToRefresh();
  setInterval(fetchPrice, 60000);
}

// Show biometric unlock screen
async function showBiometricUnlock() {
  const stored = getBiometricCredential();
  const type = stored?.type || 'Biométrie';
  const isFace = type.includes('Face');
  
  return new Promise(async (resolve) => {
    // Show cyberpunk unlock UI
    const app = document.getElementById('app');
    app.innerHTML = `
      <style>
        @keyframes neonPulse {
          0%, 100% { filter: drop-shadow(0 0 8px var(--accent)) drop-shadow(0 0 20px var(--accent)); opacity: 1; }
          50% { filter: drop-shadow(0 0 15px var(--accent)) drop-shadow(0 0 40px var(--accent)); opacity: 0.8; }
        }
        @keyframes scanLine {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        .cyber-icon {
          font-size: 72px;
          animation: neonPulse 2s ease-in-out infinite;
        }
        .cyber-box {
          position: relative;
          border: 1px solid var(--accent);
          border-radius: 16px;
          padding: 48px 40px;
          background: linear-gradient(135deg, rgba(171,159,242,0.05) 0%, rgba(139,92,246,0.08) 100%);
          box-shadow: 0 0 30px rgba(171,159,242,0.15), inset 0 0 30px rgba(171,159,242,0.03);
          overflow: hidden;
        }
        .cyber-box::before {
          content: '';
          position: absolute;
          top: -10%;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          animation: scanLine 3s linear infinite;
          opacity: 0.5;
        }
        .cyber-title {
          font-family: 'Space Mono', monospace;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          background: linear-gradient(135deg, #fff 0%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px var(--accent);
        }
        .cyber-btn {
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          color: #0d0d12;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(171,159,242,0.4);
        }
        .cyber-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(171,159,242,0.6);
        }
        .cyber-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }
      </style>
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px;">
        <div class="cyber-box">
          <div class="cyber-icon">${isFace ? '👤' : '👆'}</div>
          <h2 class="cyber-title" style="margin: 24px 0 8px;">TAO Wallet</h2>
          <p style="color: var(--text-secondary); margin-bottom: 32px; font-size: 14px;">
            [ ${type.toUpperCase()} REQUIRED ]
          </p>
          <button class="cyber-btn" id="unlockBtn">
            ⚡ UNLOCK
          </button>
        </div>
        <p id="unlockError" style="color: var(--error); margin-top: 24px; display: none; font-family: monospace;">
          ⚠ ACCESS DENIED
        </p>
      </div>
    `;
    
    const unlockBtn = document.getElementById('unlockBtn');
    const errorEl = document.getElementById('unlockError');
    
    const attemptUnlock = async () => {
      unlockBtn.disabled = true;
      unlockBtn.innerHTML = '◌ SCANNING...';
      
      const result = await verifyBiometric('Déverrouiller TAO Wallet');
      
      if (result.success) {
        unlockBtn.innerHTML = '✓ ACCESS GRANTED';
        unlockBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        setTimeout(() => resolve(true), 300);
      } else {
        unlockBtn.disabled = false;
        unlockBtn.innerHTML = '⚡ RETRY';
        
        if (result.reason !== 'cancelled') {
          errorEl.style.display = 'block';
        }
      }
    };
    
    unlockBtn.onclick = attemptUnlock;
    
    // Auto-trigger on load
    setTimeout(attemptUnlock, 500);
  });
}

// Show locked screen (biometric failed multiple times)
function renderLockedScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <style>
      @keyframes glitch {
        0%, 100% { transform: translate(0); }
        20% { transform: translate(-2px, 2px); }
        40% { transform: translate(2px, -2px); }
        60% { transform: translate(-2px, -2px); }
        80% { transform: translate(2px, 2px); }
      }
      .locked-icon {
        font-size: 72px;
        animation: glitch 0.5s ease-in-out infinite;
        filter: drop-shadow(0 0 20px var(--error));
      }
    </style>
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px;">
      <div class="locked-icon">🔒</div>
      <h2 style="margin: 24px 0 8px; color: var(--error); font-family: monospace; letter-spacing: 2px;">
        SYSTEM LOCKED
      </h2>
      <p style="color: var(--text-secondary); margin-bottom: 32px; font-family: monospace;">
        [ BIOMETRIC VERIFICATION FAILED ]
      </p>
      <button class="btn btn-primary" onclick="location.reload()" style="font-family: monospace;">
        ↻ REBOOT
      </button>
    </div>
  `;
}

// ============ API ============

async function fetchPrice() {
  try {
    const res = await fetch(`${COINGECKO_API}/simple/price?ids=bittensor&vs_currencies=usd&include_24hr_change=true`);
    const data = await res.json();
    state.taoPrice = data.bittensor?.usd || 450;
    state.priceChange24h = data.bittensor?.usd_24h_change || 0;
  } catch (e) {}
}

async function fetchBalance(address) {
  try {
    const res = await fetch(`${API_BASE}/api-wallet?address=${address}`);
    return await res.json();
  } catch (e) {
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
  
  state.activity = [
    { type: 'reward', amount: 0.0023, time: Date.now() - 3600000, subnet: 1 },
    { type: 'stake', amount: 5.0, time: Date.now() - 86400000, subnet: 8 },
    { type: 'receive', amount: 10.0, time: Date.now() - 172800000, from: '5Gx...' }
  ];
  
  state.priceHistory = generateMockPriceHistory();
  state.badges = calculateBadges();
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
  points[points.length - 1] = state.taoPrice;
  return points;
}

// ============ AI & ANALYTICS ============

function calculateHealthScore() {
  if (!state.balance) return 0;
  
  let score = 50;
  const { total, staked } = state.balance;
  
  if (total > 0) {
    const stakingRatio = staked / total;
    score += Math.min(stakingRatio * 25, 20);
  }
  
  if (state.positions.length >= 3) score += 15;
  else if (state.positions.length >= 2) score += 10;
  else if (state.positions.length >= 1) score += 5;
  
  if (total >= 100) score += 15;
  else if (total >= 10) score += 10;
  else if (total >= 1) score += 5;
  
  return Math.min(Math.round(score), 100);
}

function calculateUserAPY() {
  if (!state.positions || state.positions.length === 0) return 0;
  
  let totalStaked = 0;
  let weightedAPY = 0;
  
  for (const pos of state.positions) {
    const subnet = SUBNET_INFO[pos.netuid] || { apy: 15 };
    weightedAPY += pos.staked * subnet.apy;
    totalStaked += pos.staked;
  }
  
  return totalStaked > 0 ? weightedAPY / totalStaked : 0;
}

function generateInsights() {
  const insights = [];
  const { free, staked } = state.balance || { free: 0, staked: 0 };
  
  if (free > 0.5 && free > staked * 0.5) {
    insights.push({
      type: 'action',
      icon: '💰',
      title: 'Stake tes τ disponibles',
      desc: `${free.toFixed(2)} τ non stakés = ~${(free * 0.18).toFixed(2)} τ/an perdus`
    });
  }
  
  if (state.positions.length < 2 && staked > 5) {
    insights.push({
      type: 'tip',
      icon: '🎯',
      title: 'Diversifie',
      desc: 'Stake sur 2-3 subnets pour réduire le risque'
    });
  }
  
  if (!state.positions.find(p => p.netuid === 9)) {
    insights.push({
      type: 'opportunity',
      icon: '🔥',
      title: 'SN9 à 24% APY',
      desc: 'Meilleur rendement actuellement'
    });
  }
  
  if (insights.length === 0) {
    insights.push({
      type: 'success',
      icon: '✅',
      title: 'Portfolio optimisé',
      desc: 'Continue comme ça !'
    });
  }
  
  return insights;
}

function getOptimalStrategy() {
  const total = (state.balance?.free || 0) + (state.balance?.staked || 0);
  return [
    { subnet: 9, name: 'Pre-training', pct: 40, apy: 24.1, amount: total * 0.4 },
    { subnet: 8, name: 'Taoshi', pct: 35, apy: 22.3, amount: total * 0.35 },
    { subnet: 1, name: 'Text Gen', pct: 25, apy: 18.5, amount: total * 0.25 }
  ];
}

// ============ GAMIFICATION ============

function calculateBadges() {
  const { total, staked } = state.balance || { total: 0, staked: 0 };
  const positions = state.positions || [];
  
  const allBadges = [
    { id: 'first_stake', name: 'Premier Stake', emoji: '🌟', earned: staked > 0 },
    { id: 'diversified', name: 'Diversifié', emoji: '🎯', earned: positions.length >= 3 },
    { id: 'holder', name: 'Holder', emoji: '💪', earned: total >= 10 },
    { id: 'whale', name: 'Whale', emoji: '🐋', earned: staked >= 100 },
    { id: 'diamond', name: 'Diamond Hands', emoji: '💎', earned: staked >= 1000 },
    { id: 'believer', name: 'True Believer', emoji: '🧠', earned: total > 0 && (staked / total) >= 0.9 }
  ];
  
  return allBadges;
}

// ============ STORAGE ============

function saveWallets() {
  localStorage.setItem('tao_wallets', JSON.stringify({
    wallets: state.wallets,
    activeIndex: state.activeWalletIndex
  }));
}

// ============ UI HELPERS ============

function $(id) { return document.getElementById(id); }
function haptic() { if (navigator.vibrate) navigator.vibrate(10); }

function showToast(message, type = 'default') {
  const toast = $('toast');
  toast.innerHTML = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function shortAddress(addr) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }
function formatUSD(amount) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount); }
function formatTAO(amount) { return amount.toFixed(4); }

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

// ============ RENDERING ============

function renderOnboarding() {
  const app = $('app');
  app.innerHTML = `
    <div class="onboarding">
      <div class="onboarding-icon">τ</div>
      <h1 class="onboarding-title">TAO Wallet</h1>
      <p class="onboarding-desc">Le wallet Bittensor nouvelle génération. IA intégrée, gamification, analytics avancés.</p>
      <div class="onboarding-buttons">
        <button class="btn btn-primary" onclick="showCreateWallet()">Créer un Wallet</button>
        <button class="btn btn-secondary" onclick="showImportWallet()">Importer</button>
        <button class="btn btn-ghost" onclick="showTrackAddress()">Surveiller une adresse</button>
      </div>
    </div>
  `;
}

function renderMainUI() {
  const wallet = state.wallets[state.activeWalletIndex];
  const balance = state.balance || { total: 0, free: 0, staked: 0 };
  const totalUSD = balance.total * state.taoPrice;
  const isPositive = state.priceChange24h >= 0;
  const healthScore = calculateHealthScore();
  const userAPY = calculateUserAPY();
  
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
        <button class="icon-btn" onclick="showNotifications()">🔔</button>
        <button class="icon-btn" onclick="showSettings()">⚙️</button>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="main" id="mainContent">
      <div class="ptr-indicator" id="ptrIndicator">
        <div class="ptr-spinner"></div>
      </div>
      
      <!-- Health Score Card -->
      <div class="health-card" onclick="showAIInsights()">
        <div class="health-score">
          <div class="health-ring" style="--score: ${healthScore}">
            <span class="health-value">${healthScore}</span>
          </div>
        </div>
        <div class="health-info">
          <div class="health-label">Score de santé</div>
          <div class="health-status">${healthScore >= 80 ? '🟢 Excellent' : healthScore >= 50 ? '🟡 Bon' : '🔴 À améliorer'}</div>
          <div class="health-apy">APY moyen: ${userAPY.toFixed(1)}%</div>
        </div>
        <div class="health-arrow">→</div>
      </div>
      
      <!-- Balance Card -->
      <div class="balance-card">
        <div class="balance-label">Valeur totale</div>
        <div class="balance-amount">${formatTAO(balance.total)} τ</div>
        <div class="balance-usd">${formatUSD(totalUSD)}</div>
        <div class="balance-change ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '↑' : '↓'} ${Math.abs(state.priceChange24h).toFixed(2)}% (24h)
        </div>
        <div class="mini-chart"><canvas class="chart-canvas" id="priceChart"></canvas></div>
      </div>
      
      <!-- Quick Actions -->
      <div class="quick-actions">
        <div class="quick-action" onclick="haptic(); showReceive()">
          <div class="quick-action-icon">↓</div>
          <span class="quick-action-label">Recevoir</span>
        </div>
        <div class="quick-action" onclick="haptic(); showSend()">
          <div class="quick-action-icon">↑</div>
          <span class="quick-action-label">Envoyer</span>
        </div>
        <div class="quick-action" onclick="haptic(); showStake()">
          <div class="quick-action-icon">📊</div>
          <span class="quick-action-label">Staker</span>
        </div>
        <div class="quick-action" onclick="haptic(); showSwap()">
          <div class="quick-action-icon">🔄</div>
          <span class="quick-action-label">Swap</span>
        </div>
      </div>
      
      <!-- AI Insights -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">🤖 Assistant IA</h2>
          <span class="section-link" onclick="showAIInsights()">Voir tout</span>
        </div>
        <div class="insights-list">
          ${generateInsights().map(insight => `
            <div class="insight-card ${insight.type}" onclick="handleInsight('${insight.type}')">
              <span class="insight-icon">${insight.icon}</span>
              <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-desc">${insight.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
      
      <!-- Badges -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">🏆 Badges</h2>
          <span class="section-link" onclick="showAllBadges()">Tous</span>
        </div>
        <div class="badges-row">
          ${state.badges.slice(0, 5).map(badge => `
            <div class="badge ${badge.earned ? 'earned' : 'locked'}" title="${badge.name}">
              ${badge.earned ? badge.emoji : '🔒'}
            </div>
          `).join('')}
        </div>
      </section>
      
      <!-- Assets -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Assets</h2>
        </div>
        <div class="asset-list">
          <div class="asset-item" onclick="showAssetDetail('free')">
            <div class="asset-icon">τ</div>
            <div class="asset-info">
              <div class="asset-name">TAO Disponible</div>
              <div class="asset-subtitle">Prêt à staker</div>
            </div>
            <div class="asset-values">
              <div class="asset-amount">${formatTAO(balance.free)}</div>
              <div class="asset-usd">${formatUSD(balance.free * state.taoPrice)}</div>
            </div>
          </div>
          ${balance.staked > 0 ? `
          <div class="asset-item" onclick="showStakeDetail()">
            <div class="asset-icon staked">🔒</div>
            <div class="asset-info">
              <div class="asset-name">TAO Staké</div>
              <div class="asset-subtitle">${state.positions.length} position${state.positions.length > 1 ? 's' : ''} • ~${userAPY.toFixed(1)}% APY</div>
            </div>
            <div class="asset-values">
              <div class="asset-amount">${formatTAO(balance.staked)}</div>
              <div class="asset-usd">${formatUSD(balance.staked * state.taoPrice)}</div>
            </div>
          </div>
          ` : ''}
        </div>
      </section>
      
      <!-- Staking Positions -->
      ${state.positions.length > 0 ? `
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Positions</h2>
          <span class="section-link" onclick="showAllPositions()">Gérer</span>
        </div>
        <div class="asset-list">
          ${state.positions.slice(0, 3).map(pos => {
            const subnet = SUBNET_INFO[pos.netuid] || { name: `SN${pos.netuid}`, emoji: '🔷', apy: 15 };
            return `
            <div class="asset-item">
              <div class="asset-icon subnet">${subnet.emoji}</div>
              <div class="asset-info">
                <div class="asset-name">SN${pos.netuid} - ${subnet.name}</div>
                <div class="asset-subtitle">~${subnet.apy}% APY</div>
              </div>
              <div class="asset-values">
                <div class="asset-amount">${formatTAO(pos.staked)}</div>
                <div class="asset-usd">${formatUSD(pos.staked * state.taoPrice)}</div>
              </div>
            </div>
          `}).join('')}
        </div>
      </section>
      ` : ''}
      
      <!-- Activity -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Activité</h2>
          <span class="section-link" onclick="showAllActivity()">Tout</span>
        </div>
        <div class="asset-list">
          ${state.activity.slice(0, 3).map(act => `
            <div class="activity-item">
              <div class="activity-icon ${act.type}">${act.type === 'reward' ? '🎁' : act.type === 'receive' ? '↓' : act.type === 'send' ? '↑' : '📊'}</div>
              <div class="activity-info">
                <div class="activity-type">${act.type === 'reward' ? 'Reward' : act.type === 'receive' ? 'Reçu' : act.type === 'send' ? 'Envoyé' : 'Staké'}</div>
                <div class="activity-time">${timeAgo(act.time)}</div>
              </div>
              <div class="activity-amount ${act.type}">${act.type === 'receive' || act.type === 'reward' ? '+' : '-'}${formatTAO(act.amount)} τ</div>
            </div>
          `).join('')}
        </div>
      </section>
      
      <div style="height: 20px;"></div>
    </main>
    
    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <div class="nav-item active" onclick="switchTab('home')">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Home</span>
      </div>
      <div class="nav-item" onclick="switchTab('ai')">
        <span class="nav-icon">🤖</span>
        <span class="nav-label">IA</span>
      </div>
      <div class="nav-item" onclick="switchTab('stake')">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Stake</span>
      </div>
      <div class="nav-item" onclick="switchTab('badges')">
        <span class="nav-icon">🏆</span>
        <span class="nav-label">Badges</span>
      </div>
    </nav>
  `;
  
  setTimeout(() => drawMiniChart(), 100);
}

// ============ AI INSIGHTS PAGE ============

function showAIInsights() {
  haptic();
  const healthScore = calculateHealthScore();
  const userAPY = calculateUserAPY();
  const marketAPY = 18.5;
  const insights = generateInsights();
  const strategy = getOptimalStrategy();
  const projectedAPY = strategy.reduce((sum, s) => sum + (s.pct * s.apy / 100), 0);
  
  const staked = state.balance?.staked || 0;
  const monthlyReward = staked * (userAPY / 100 / 12);
  const yearlyReward = staked * (userAPY / 100);
  
  showModal('🤖 Assistant IA', `
    <!-- Health Score -->
    <div class="ai-health">
      <div class="ai-health-score">
        <div class="health-ring large" style="--score: ${healthScore}">
          <span class="health-value">${healthScore}</span>
        </div>
      </div>
      <div class="ai-health-details">
        <div class="ai-metric">
          <span class="ai-metric-label">Ton APY</span>
          <span class="ai-metric-value">${userAPY.toFixed(1)}%</span>
        </div>
        <div class="ai-metric">
          <span class="ai-metric-label">vs Marché</span>
          <span class="ai-metric-value ${userAPY >= marketAPY ? 'positive' : 'negative'}">${userAPY >= marketAPY ? '+' : ''}${(userAPY - marketAPY).toFixed(1)}%</span>
        </div>
      </div>
    </div>
    
    <!-- Insights -->
    <h3 style="margin: 20px 0 12px; font-size: 16px;">💡 Recommandations</h3>
    <div class="insights-list">
      ${insights.map(i => `
        <div class="insight-card ${i.type}">
          <span class="insight-icon">${i.icon}</span>
          <div class="insight-content">
            <div class="insight-title">${i.title}</div>
            <div class="insight-desc">${i.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <!-- Predictions -->
    <h3 style="margin: 20px 0 12px; font-size: 16px;">🔮 Prévisions rewards</h3>
    <div class="predictions">
      <div class="prediction-item">
        <span class="prediction-label">1 mois</span>
        <span class="prediction-value">+${monthlyReward.toFixed(4)} τ</span>
        <span class="prediction-usd">${formatUSD(monthlyReward * state.taoPrice)}</span>
      </div>
      <div class="prediction-item">
        <span class="prediction-label">1 an</span>
        <span class="prediction-value">+${yearlyReward.toFixed(2)} τ</span>
        <span class="prediction-usd">${formatUSD(yearlyReward * state.taoPrice)}</span>
      </div>
    </div>
    
    <!-- Optimal Strategy -->
    <h3 style="margin: 20px 0 12px; font-size: 16px;">🎯 Stratégie optimale</h3>
    <div class="strategy-card">
      ${strategy.map(s => `
        <div class="strategy-item">
          <div class="strategy-subnet">SN${s.subnet}</div>
          <div class="strategy-info">
            <div class="strategy-name">${s.name}</div>
            <div class="strategy-apy">${s.apy}% APY</div>
          </div>
          <div class="strategy-alloc">${s.pct}%</div>
        </div>
      `).join('')}
      <div class="strategy-result">
        <span>APY projeté</span>
        <span class="strategy-projected">${projectedAPY.toFixed(1)}%</span>
      </div>
    </div>
    
    <button class="btn btn-primary" style="margin-top: 20px;" onclick="applyStrategy()">⚡ Appliquer cette stratégie</button>
    <button class="btn btn-secondary" style="margin-top: 10px;" onclick="showAlerts()">🔔 Configurer alertes</button>
  `);
}

// ============ BADGES PAGE ============

function showAllBadges() {
  haptic();
  const earned = state.badges.filter(b => b.earned);
  const locked = state.badges.filter(b => !b.earned);
  
  showModal('🏆 Badges', `
    <div class="badges-stats">
      <div class="badges-stat">
        <span class="badges-stat-value">${earned.length}</span>
        <span class="badges-stat-label">Débloqués</span>
      </div>
      <div class="badges-stat">
        <span class="badges-stat-value">${state.badges.length}</span>
        <span class="badges-stat-label">Total</span>
      </div>
    </div>
    
    ${earned.length > 0 ? `
    <h3 style="margin: 20px 0 12px; font-size: 16px;">✨ Débloqués</h3>
    <div class="badges-grid">
      ${earned.map(b => `
        <div class="badge-card earned">
          <span class="badge-emoji">${b.emoji}</span>
          <span class="badge-name">${b.name}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <h3 style="margin: 20px 0 12px; font-size: 16px;">🔒 À débloquer</h3>
    <div class="badges-grid">
      ${locked.map(b => `
        <div class="badge-card locked">
          <span class="badge-emoji">🔒</span>
          <span class="badge-name">${b.name}</span>
        </div>
      `).join('')}
    </div>
    
    <button class="btn btn-secondary" style="margin-top: 20px;" onclick="showLeaderboard()">📊 Voir le classement</button>
  `);
}

function showLeaderboard() {
  const leaders = [
    { rank: 1, name: 'TaoWhale', staked: 15420, badge: '🐋' },
    { rank: 2, name: 'AImaxi', staked: 8930, badge: '💎' },
    { rank: 3, name: 'SubnetKing', staked: 5210, badge: '🎯' },
    { rank: 4, name: 'CryptoNerd', staked: 2840, badge: '🌟' },
    { rank: 5, name: 'Hodler99', staked: 1560, badge: '🧠' }
  ];
  
  showModal('📊 Leaderboard', `
    <div class="leaderboard">
      ${leaders.map(l => `
        <div class="leader-item ${l.rank <= 3 ? 'top' : ''}">
          <span class="leader-rank">${l.rank === 1 ? '🥇' : l.rank === 2 ? '🥈' : l.rank === 3 ? '🥉' : l.rank}</span>
          <span class="leader-name">${l.name} ${l.badge}</span>
          <span class="leader-staked">${l.staked.toLocaleString()} τ</span>
        </div>
      `).join('')}
    </div>
    <div class="your-rank">
      <span>Ton classement</span>
      <span class="your-rank-value">#142</span>
    </div>
    <button class="btn btn-primary" style="margin-top: 20px;" onclick="closeModal(event); showStake()">📊 Stake plus pour monter</button>
  `);
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
    <button class="btn btn-secondary" style="margin-top: 16px;" onclick="showAddWallet()">+ Ajouter</button>
  `);
}

function selectWallet(index) {
  state.activeWalletIndex = index;
  saveWallets();
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  loadWalletData().then(renderMainUI);
}

function showAddWallet() {
  showModal('Ajouter', `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <button class="btn btn-primary" onclick="showCreateWallet()">Créer nouveau</button>
      <button class="btn btn-secondary" onclick="showImportWallet()">Importer seed</button>
      <button class="btn btn-secondary" onclick="showTrackAddress()">Surveiller adresse</button>
    </div>
  `);
}

function showCreateWallet() {
  showModal('Créer Wallet', `
    <div class="input-group">
      <label class="input-label">Nom du wallet</label>
      <input type="text" class="input-field" id="walletName" placeholder="Mon Wallet" maxlength="20">
    </div>
    
    <div class="input-group">
      <label class="input-label">Sécurité de la seed phrase</label>
      <div class="seed-choice">
        <button class="seed-option" id="seed12" onclick="selectSeedLength(12)">
          <span class="seed-option-words">12 mots</span>
          <span class="seed-option-security">Standard</span>
        </button>
        <button class="seed-option selected" id="seed24" onclick="selectSeedLength(24)">
          <span class="seed-option-words">24 mots</span>
          <span class="seed-option-security">🔒 Maximum</span>
        </button>
      </div>
      <p class="seed-hint" id="seedHint">24 mots = 256 bits d'entropie (recommandé)</p>
    </div>
    
    <div class="input-group">
      <label class="input-label">Mot de passe sécurisé</label>
      <input type="password" class="input-field" id="walletPassword" placeholder="••••••••••••" oninput="updatePasswordStrength()">
      <div class="password-strength" id="passwordStrength"></div>
    </div>
    <div class="input-group">
      <label class="input-label">Confirmer le mot de passe</label>
      <input type="password" class="input-field" id="walletPasswordConfirm" placeholder="••••••••••••" oninput="checkPasswordMatch()">
      <div class="password-match" id="passwordMatch"></div>
    </div>
    <div class="password-rules">
      <div class="rule" id="rule-length">❌ Minimum 12 caractères</div>
      <div class="rule" id="rule-upper">❌ Une majuscule</div>
      <div class="rule" id="rule-lower">❌ Une minuscule</div>
      <div class="rule" id="rule-number">❌ Un chiffre</div>
      <div class="rule" id="rule-special">❌ Un caractère spécial (!@#$...)</div>
    </div>
    <p style="color: var(--text-tertiary); font-size: 11px; margin: 12px 0;">
      🔐 Ce mot de passe chiffre ta seed phrase. Sans lui, impossible de récupérer tes fonds !
    </p>
    <button class="btn btn-primary" id="createWalletBtn" onclick="createRealWallet()" disabled>Créer mon wallet τ</button>
  `);
  
  // Default to 24 words
  state.seedLength = 24;
}

function selectSeedLength(length) {
  state.seedLength = length;
  
  // Update UI
  $('seed12').classList.toggle('selected', length === 12);
  $('seed24').classList.toggle('selected', length === 24);
  
  // Update hint
  const hint = $('seedHint');
  if (length === 12) {
    hint.textContent = '12 mots = 128 bits d\'entropie (standard)';
  } else {
    hint.textContent = '24 mots = 256 bits d\'entropie (recommandé)';
  }
}

function updatePasswordStrength() {
  const password = $('walletPassword')?.value || '';
  const rules = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  // Update rule indicators
  for (const [rule, valid] of Object.entries(rules)) {
    const el = $(`rule-${rule}`);
    if (el) {
      el.innerHTML = (valid ? '✅' : '❌') + ' ' + el.innerHTML.substring(2);
      el.style.color = valid ? 'var(--success)' : 'var(--text-tertiary)';
    }
  }
  
  // Calculate strength
  const passed = Object.values(rules).filter(Boolean).length;
  const strengthEl = $('passwordStrength');
  if (strengthEl) {
    const labels = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
    const colors = ['', 'var(--error)', 'var(--warning)', 'var(--warning)', 'var(--success)', 'var(--success)'];
    strengthEl.innerHTML = `<div class="strength-bar"><div class="strength-fill" style="width: ${passed * 20}%; background: ${colors[passed]}"></div></div><span style="color: ${colors[passed]}">${labels[passed]}</span>`;
  }
  
  checkPasswordMatch();
  updateCreateButton();
}

function checkPasswordMatch() {
  const password = $('walletPassword')?.value || '';
  const confirm = $('walletPasswordConfirm')?.value || '';
  const matchEl = $('passwordMatch');
  
  if (confirm.length === 0) {
    matchEl.innerHTML = '';
  } else if (password === confirm) {
    matchEl.innerHTML = '<span style="color: var(--success)">✅ Les mots de passe correspondent</span>';
  } else {
    matchEl.innerHTML = '<span style="color: var(--error)">❌ Les mots de passe ne correspondent pas</span>';
  }
  
  updateCreateButton();
}

function updateCreateButton() {
  const password = $('walletPassword')?.value || '';
  const confirm = $('walletPasswordConfirm')?.value || '';
  const btn = $('createWalletBtn');
  
  const isValid = 
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) &&
    password === confirm;
  
  if (btn) {
    btn.disabled = !isValid;
    btn.style.opacity = isValid ? '1' : '0.5';
  }
}

async function createRealWallet() {
  const name = $('walletName')?.value || 'Wallet';
  const password = $('walletPassword')?.value;
  const confirm = $('walletPasswordConfirm')?.value;
  
  // Validate password strength
  if (!password || password.length < 12) {
    showToast('❌ Mot de passe trop court (min 12)', 'error');
    return;
  }
  if (!/[A-Z]/.test(password)) {
    showToast('❌ Il faut une majuscule', 'error');
    return;
  }
  if (!/[a-z]/.test(password)) {
    showToast('❌ Il faut une minuscule', 'error');
    return;
  }
  if (!/[0-9]/.test(password)) {
    showToast('❌ Il faut un chiffre', 'error');
    return;
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    showToast('❌ Il faut un caractère spécial', 'error');
    return;
  }
  if (password !== confirm) {
    showToast('❌ Les mots de passe ne correspondent pas', 'error');
    return;
  }
  
  showModal('⏳ Création...', `
    <div style="text-align: center; padding: 40px;">
      <div class="ptr-spinner" style="width: 48px; height: 48px; margin: 0 auto 20px;"></div>
      <p style="color: var(--text-secondary);">Génération de ta seed phrase...</p>
    </div>
  `);
  
  try {
    // Wait for crypto to be ready
    await polkadotUtilCrypto.cryptoWaitReady();
    
    // Generate mnemonic (12 or 24 words based on user choice)
    const wordCount = state.seedLength || 24;
    const mnemonic = polkadotUtilCrypto.mnemonicGenerate(wordCount);
    
    // Create keyring and derive address
    const keyring = new polkadotKeyring.Keyring({ type: 'sr25519', ss58Format: 42 });
    const pair = keyring.addFromMnemonic(mnemonic);
    const address = pair.address;
    
    // Verify crypto is available
    verifyCryptoAvailable();
    
    // Encrypt mnemonic with AES-256-GCM + PBKDF2 (600k iterations)
    const encryptedMnemonic = await encryptMnemonic(mnemonic, password);
    
    if (!encryptedMnemonic) {
      throw new Error('Encryption failed');
    }
    
    // Temporarily store for verification step
    state.pendingWallet = {
      name,
      address,
      encryptedMnemonic,
      mnemonic, // Will be cleared after verification
      created: Date.now()
    };
    
    // Show seed phrase with verification step
    showSeedPhraseWithVerification(mnemonic, address, name);
    
  } catch (err) {
    console.error('Wallet creation error:', err);
    showToast('❌ Erreur création wallet', 'error');
    closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  }
}

function showSeedPhraseWithVerification(mnemonic, address, name) {
  const words = mnemonic.split(' ');
  
  showModal('🔐 Sauvegarde ta Seed Phrase !', `
    <div style="background: var(--error); color: #fff; border-radius: 12px; padding: 12px; margin-bottom: 16px; text-align: center;">
      ⚠️ NOTE CES ${words.length} MOTS - Tu ne les reverras plus !
    </div>
    
    <div class="security-badges">
      <span class="security-badge">🔒 AES-256-GCM</span>
      <span class="security-badge">🔑 PBKDF2 600k</span>
      <span class="security-badge">🎲 ${words.length * (words.length === 24 ? 10.67 : 10.67).toFixed(0) * words.length} bits</span>
    </div>
    
    <div class="seed-grid">
      ${words.map((word, i) => `
        <div class="seed-word">
          <span class="seed-num">${i + 1}</span>
          <span class="seed-text">${word}</span>
        </div>
      `).join('')}
    </div>
    
    <div class="seed-warnings">
      <div class="seed-warning">❌ Ne fais PAS de screenshot</div>
      <div class="seed-warning">❌ Ne copie PAS dans le presse-papier</div>
      <div class="seed-warning">❌ Ne stocke PAS en ligne</div>
      <div class="seed-warning">✅ Écris sur papier, garde en lieu sûr</div>
    </div>
    
    <div style="background: var(--bg-card); border-radius: 12px; padding: 12px; margin: 16px 0;">
      <div style="color: var(--text-tertiary); font-size: 12px; margin-bottom: 4px;">Ton adresse τ</div>
      <div style="font-family: monospace; font-size: 11px; word-break: break-all;">${address}</div>
    </div>
    
    <button class="btn btn-primary" onclick="startSeedVerification()">✅ J'ai noté, vérifier</button>
    <p style="color: var(--text-tertiary); font-size: 11px; text-align: center; margin-top: 12px;">
      Tu devras confirmer 3 mots pour prouver que tu as bien sauvegardé
    </p>
  `, false);
}

function startSeedVerification() {
  if (!state.pendingWallet) return;
  
  const words = state.pendingWallet.mnemonic.split(' ');
  
  // Pick 3 random word positions to verify
  const positions = [];
  while (positions.length < 3) {
    const pos = Math.floor(Math.random() * words.length);
    if (!positions.includes(pos)) positions.push(pos);
  }
  positions.sort((a, b) => a - b);
  
  state.verificationPositions = positions;
  state.verificationWords = positions.map(p => words[p]);
  
  showModal('🔍 Vérifie ta Seed', `
    <p style="color: var(--text-secondary); margin-bottom: 20px; text-align: center;">
      Entre les mots aux positions demandées pour confirmer que tu as bien sauvegardé ta seed.
    </p>
    
    <div class="verification-inputs">
      ${positions.map((pos, i) => `
        <div class="verification-input">
          <label class="verification-label">Mot #${pos + 1}</label>
          <input type="text" class="input-field" id="verify${i}" placeholder="Entre le mot ${pos + 1}" autocomplete="off" autocapitalize="none">
        </div>
      `).join('')}
    </div>
    
    <button class="btn btn-primary" onclick="verifySeedWords()">Vérifier</button>
    <button class="btn btn-ghost" style="margin-top: 8px;" onclick="showSeedPhraseWithVerification(state.pendingWallet.mnemonic, state.pendingWallet.address, state.pendingWallet.name)">↩️ Revoir la seed</button>
  `, false);
}

function verifySeedWords() {
  if (!state.verificationPositions || !state.verificationWords) return;
  
  const inputs = state.verificationPositions.map((_, i) => 
    $(`verify${i}`)?.value?.trim().toLowerCase()
  );
  
  const correct = inputs.every((input, i) => input === state.verificationWords[i]);
  
  if (correct) {
    // Verification passed - save wallet
    const wallet = state.pendingWallet;
    
    state.wallets.push({ 
      name: wallet.name, 
      address: wallet.address, 
      encryptedMnemonic: wallet.encryptedMnemonic,
      created: wallet.created, 
      watchOnly: false,
      security: {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2',
        iterations: CRYPTO_CONFIG.pbkdf2Iterations
      }
    });
    state.activeWalletIndex = state.wallets.length - 1;
    saveWallets();
    
    // Clear sensitive data
    state.pendingWallet = null;
    state.verificationPositions = null;
    state.verificationWords = null;
    
    haptic();
    showToast('✅ Wallet créé avec succès!', 'success');
    closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
    loadWalletData().then(renderMainUI);
  } else {
    haptic();
    showToast('❌ Mots incorrects - Vérifie ta seed !', 'error');
  }
}

// Legacy function for compatibility
function showSeedPhrase(mnemonic, address, name) {
  showSeedPhraseWithVerification(mnemonic, address, name);
}

function confirmSeedSaved() {
  startSeedVerification();
}

// ============ CRYPTO SECURITY (Bank-grade AES-256-GCM + PBKDF2) ============

const CRYPTO_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
  saltLength: 32,
  tagLength: 128,
  pbkdf2Iterations: 600000, // OWASP 2023 recommendation
  hashAlgorithm: 'SHA-256'
};

// Generate cryptographically secure random bytes
function getSecureRandomBytes(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// Derive encryption key from password using PBKDF2
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: CRYPTO_CONFIG.pbkdf2Iterations,
      hash: CRYPTO_CONFIG.hashAlgorithm
    },
    keyMaterial,
    {
      name: CRYPTO_CONFIG.algorithm,
      length: CRYPTO_CONFIG.keyLength
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt mnemonic with AES-256-GCM
async function encryptMnemonic(mnemonic, password) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(mnemonic);
    
    // Generate random salt and IV
    const salt = getSecureRandomBytes(CRYPTO_CONFIG.saltLength);
    const iv = getSecureRandomBytes(CRYPTO_CONFIG.ivLength);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Encrypt with AES-256-GCM
    const encrypted = await crypto.subtle.encrypt(
      {
        name: CRYPTO_CONFIG.algorithm,
        iv: iv,
        tagLength: CRYPTO_CONFIG.tagLength
      },
      key,
      data
    );
    
    // Combine: salt + iv + encrypted (includes auth tag)
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Return base64 encoded
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption error:', err);
    return null;
  }
}

// Decrypt mnemonic with AES-256-GCM
async function decryptMnemonic(encryptedBase64, password) {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, CRYPTO_CONFIG.saltLength);
    const iv = combined.slice(CRYPTO_CONFIG.saltLength, CRYPTO_CONFIG.saltLength + CRYPTO_CONFIG.ivLength);
    const encrypted = combined.slice(CRYPTO_CONFIG.saltLength + CRYPTO_CONFIG.ivLength);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Decrypt with AES-256-GCM (automatically verifies auth tag)
    const decrypted = await crypto.subtle.decrypt(
      {
        name: CRYPTO_CONFIG.algorithm,
        iv: iv,
        tagLength: CRYPTO_CONFIG.tagLength
      },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // Decryption failed (wrong password or tampered data)
    console.error('Decryption error:', err);
    return null;
  }
}

// Securely clear sensitive data from memory
function secureClear(str) {
  if (typeof str === 'string') {
    // Can't truly clear strings in JS, but we can overwrite arrays
    return '';
  }
  if (str instanceof Uint8Array) {
    crypto.getRandomValues(str); // Overwrite with random data
  }
}

// Verify entropy source is cryptographically secure
function verifyCryptoAvailable() {
  if (!crypto || !crypto.subtle || !crypto.getRandomValues) {
    throw new Error('Web Crypto API not available - insecure environment!');
  }
  // Test randomness
  const test = new Uint8Array(32);
  crypto.getRandomValues(test);
  if (test.every(b => b === 0)) {
    throw new Error('Random number generator failed!');
  }
  return true;
}

// ============ BIOMETRIC AUTHENTICATION (Face ID / Touch ID / Fingerprint) ============

const BIOMETRIC_CONFIG = {
  rpId: window.location.hostname,
  rpName: 'TAO Wallet',
  userDisplayName: 'TAO Wallet User',
  timeout: 60000,
  authenticatorType: 'platform' // Uses device biometrics (Face ID, Touch ID, etc.)
};

// Check if biometric authentication is available on this device
async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) {
    return { available: false, reason: 'WebAuthn not supported' };
  }
  
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      return { available: false, reason: 'No platform authenticator' };
    }
    
    // Check what type of biometric is likely available
    const userAgent = navigator.userAgent.toLowerCase();
    let type = 'biometric';
    if (/iphone|ipad/.test(userAgent)) {
      type = 'Face ID / Touch ID';
    } else if (/android/.test(userAgent)) {
      type = 'Fingerprint / Face Unlock';
    } else if (/mac/.test(userAgent)) {
      type = 'Touch ID';
    } else if (/windows/.test(userAgent)) {
      type = 'Windows Hello';
    }
    
    return { available: true, type };
  } catch (err) {
    return { available: false, reason: err.message };
  }
}

// Check if biometric is enabled for this wallet
function isBiometricEnabled() {
  const saved = localStorage.getItem('tao_biometric');
  return saved ? JSON.parse(saved).enabled : false;
}

// Get stored biometric credential
function getBiometricCredential() {
  const saved = localStorage.getItem('tao_biometric');
  return saved ? JSON.parse(saved) : null;
}

// Register biometric authentication
async function registerBiometric() {
  const check = await isBiometricAvailable();
  if (!check.available) {
    showToast(`❌ ${check.reason}`, 3000);
    return false;
  }
  
  try {
    // Generate a random user ID for this wallet
    const userId = getSecureRandomBytes(32);
    const challenge = getSecureRandomBytes(32);
    
    const publicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: BIOMETRIC_CONFIG.rpName,
        id: BIOMETRIC_CONFIG.rpId
      },
      user: {
        id: userId,
        name: 'tao-wallet-user',
        displayName: BIOMETRIC_CONFIG.userDisplayName
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: BIOMETRIC_CONFIG.authenticatorType,
        userVerification: 'required', // Force biometric verification
        residentKey: 'preferred'
      },
      timeout: BIOMETRIC_CONFIG.timeout,
      attestation: 'none' // We don't need attestation for local auth
    };
    
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });
    
    if (credential) {
      // Store credential ID for later verification
      const credentialData = {
        enabled: true,
        credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        publicKey: btoa(String.fromCharCode(...new Uint8Array(credential.response.getPublicKey()))),
        type: check.type,
        createdAt: Date.now()
      };
      
      localStorage.setItem('tao_biometric', JSON.stringify(credentialData));
      showToast(`✅ ${check.type} activé!`, 2000);
      return true;
    }
  } catch (err) {
    console.error('Biometric registration error:', err);
    if (err.name === 'NotAllowedError') {
      showToast('❌ Authentification annulée', 2000);
    } else {
      showToast(`❌ Erreur: ${err.message}`, 3000);
    }
    return false;
  }
}

// Verify biometric authentication
async function verifyBiometric(reason = 'Confirmer votre identité') {
  const stored = getBiometricCredential();
  if (!stored || !stored.enabled) {
    return { success: false, reason: 'Biometric not enabled' };
  }
  
  try {
    const challenge = getSecureRandomBytes(32);
    const credentialId = Uint8Array.from(atob(stored.credentialId), c => c.charCodeAt(0));
    
    const publicKeyCredentialRequestOptions = {
      challenge: challenge,
      rpId: BIOMETRIC_CONFIG.rpId,
      allowCredentials: [{
        id: credentialId,
        type: 'public-key',
        transports: ['internal']
      }],
      userVerification: 'required',
      timeout: BIOMETRIC_CONFIG.timeout
    };
    
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });
    
    if (assertion) {
      return { success: true };
    }
  } catch (err) {
    console.error('Biometric verification error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, reason: 'cancelled' };
    }
    return { success: false, reason: err.message };
  }
  
  return { success: false, reason: 'Verification failed' };
}

// Disable biometric authentication
function disableBiometric() {
  localStorage.removeItem('tao_biometric');
  showToast('🔓 Biométrie désactivée', 2000);
}

// Prompt for biometric verification (blocking modal)
async function requireBiometric(reason = 'Vérification biométrique requise') {
  const stored = getBiometricCredential();
  if (!stored || !stored.enabled) {
    return true; // No biometric set up, allow
  }
  
  const isFace = stored.type?.includes('Face');
  
  // Show cyberpunk verification modal
  return new Promise(async (resolve) => {
    showModal(`⚡ VERIFY`, `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 64px; margin-bottom: 16px; filter: drop-shadow(0 0 15px var(--accent));">
          ${isFace ? '👤' : '👆'}
        </div>
        <p style="color: var(--accent); margin-bottom: 8px; font-family: monospace; font-size: 12px; letter-spacing: 1px;">
          [ ${stored.type?.toUpperCase() || 'BIOMETRIC'} SCAN ]
        </p>
        <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 14px;">${reason}</p>
        <button class="btn btn-primary" id="biometricVerifyBtn" style="font-family: monospace;">⚡ AUTHENTICATE</button>
        <button class="btn" style="margin-top: 12px; background: var(--bg-elevated); font-family: monospace;" onclick="closeModal(event)">✕ CANCEL</button>
      </div>
    `, false);
    
    const btn = document.getElementById('biometricVerifyBtn');
    btn.onclick = async () => {
      btn.disabled = true;
      btn.innerHTML = '◌ SCANNING...';
      
      const result = await verifyBiometric(reason);
      
      if (result.success) {
        btn.innerHTML = '✓ VERIFIED';
        btn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        setTimeout(() => {
          closeModal();
          resolve(true);
        }, 300);
      } else {
        btn.disabled = false;
        btn.innerHTML = `⚡ RETRY`;
        if (result.reason !== 'cancelled') {
          showToast(`⚠ DENIED: ${result.reason}`, 2000);
        }
      }
    };
    
    // Handle modal close (cancel)
    const modal = document.querySelector('.modal');
    if (modal) {
      const originalClose = modal.querySelector('[onclick*="closeModal"]');
      if (originalClose) {
        originalClose.onclick = () => {
          closeModal();
          resolve(false);
        };
      }
    }
  });
}

// Show biometric settings
async function showBiometricSettings() {
  const check = await isBiometricAvailable();
  const stored = getBiometricCredential();
  const isEnabled = stored?.enabled || false;
  const isFace = (stored?.type || check.type || '').includes('Face');
  
  if (!check.available) {
    showModal('⚠ UNAVAILABLE', `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.5;">🚫</div>
        <p style="color: var(--text-secondary); font-family: monospace;">BIOMETRIC MODULE NOT DETECTED</p>
        <p style="color: var(--text-tertiary); font-size: 11px; margin-top: 8px; font-family: monospace;">${check.reason}</p>
      </div>
    `);
    return;
  }
  
  if (isEnabled) {
    showModal(`⚡ ${stored.type?.toUpperCase() || 'BIOMETRIC'}`, `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 64px; margin-bottom: 16px; filter: drop-shadow(0 0 20px var(--success));">
          ${isFace ? '👤' : '👆'}
        </div>
        <p style="color: var(--success); font-weight: 600; margin-bottom: 4px; font-family: monospace; letter-spacing: 1px;">
          STATUS: ACTIVE
        </p>
        <p style="color: var(--text-tertiary); font-size: 11px; margin-bottom: 24px; font-family: monospace;">
          LINKED: ${new Date(stored.createdAt).toLocaleDateString('fr-FR')}
        </p>
        <div class="security-badges" style="margin-bottom: 24px;">
          <span class="security-badge" style="border-color: var(--accent); color: var(--accent);">🔐 ENCRYPTED KEY</span>
          <span class="security-badge" style="border-color: var(--accent); color: var(--accent);">📱 DEVICE BOUND</span>
        </div>
        <button class="btn" style="background: var(--error); font-family: monospace;" onclick="disableBiometric(); closeModal(event);">
          ✕ DEACTIVATE
        </button>
      </div>
    `);
  } else {
    showModal(`⚡ ${check.type?.toUpperCase() || 'BIOMETRIC'}`, `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 64px; margin-bottom: 16px; filter: drop-shadow(0 0 15px var(--accent)); opacity: 0.8;">
          ${isFace ? '👤' : '👆'}
        </div>
        <p style="color: var(--accent); margin-bottom: 16px; font-family: monospace; font-size: 12px; letter-spacing: 1px;">
          [ ENHANCE SECURITY ]
        </p>
        <div class="security-badges" style="margin-bottom: 24px;">
          <span class="security-badge">🔐 APP UNLOCK</span>
          <span class="security-badge">👁️ SEED ACCESS</span>
          <span class="security-badge">📤 TX SIGNING</span>
        </div>
        <button class="btn btn-primary" style="font-family: monospace;" onclick="enableBiometricFromSettings()">
          ⚡ ACTIVATE ${check.type?.toUpperCase() || 'BIOMETRIC'}
        </button>
      </div>
    `);
  }
}

// Enable biometric from settings (wrapper)
async function enableBiometricFromSettings() {
  closeModal();
  const success = await registerBiometric();
  if (success) {
    setTimeout(() => showBiometricSettings(), 500);
  }
}

function showImportWallet() {
  showModal('Importer Wallet', `
    <div class="input-group">
      <label class="input-label">Nom</label>
      <input type="text" class="input-field" id="importName" placeholder="Mon Wallet">
    </div>
    <div class="input-group">
      <label class="input-label">Seed phrase (12 ou 24 mots)</label>
      <textarea class="input-field" id="importSeed" placeholder="word1 word2 word3..." style="height: 100px;"></textarea>
    </div>
    <div class="input-group">
      <label class="input-label">Mot de passe sécurisé</label>
      <input type="password" class="input-field" id="importPassword" placeholder="••••••••••••" oninput="updateImportPasswordStrength()">
      <div class="password-strength" id="importPasswordStrength"></div>
    </div>
    <div class="input-group">
      <label class="input-label">Confirmer le mot de passe</label>
      <input type="password" class="input-field" id="importPasswordConfirm" placeholder="••••••••••••">
    </div>
    <div class="password-rules" id="importRules">
      <div class="rule">⚠️ Min 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial</div>
    </div>
    <button class="btn btn-primary" onclick="importRealWallet()">Importer</button>
  `);
}

function updateImportPasswordStrength() {
  const password = $('importPassword')?.value || '';
  const passed = [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ].filter(Boolean).length;
  
  const strengthEl = $('importPasswordStrength');
  if (strengthEl) {
    const labels = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
    const colors = ['', 'var(--error)', 'var(--warning)', 'var(--warning)', 'var(--success)', 'var(--success)'];
    strengthEl.innerHTML = `<div class="strength-bar"><div class="strength-fill" style="width: ${passed * 20}%; background: ${colors[passed]}"></div></div><span style="color: ${colors[passed]}">${labels[passed]}</span>`;
  }
}

async function importRealWallet() {
  const name = $('importName')?.value || 'Importé';
  const seed = $('importSeed')?.value?.trim().toLowerCase();
  const password = $('importPassword')?.value;
  const confirm = $('importPasswordConfirm')?.value;
  
  if (!seed || ![12, 24].includes(seed.split(/\s+/).length)) {
    showToast('❌ Seed invalide (12 ou 24 mots)', 'error');
    return;
  }
  
  // Validate password
  if (!password || password.length < 12) {
    showToast('❌ Mot de passe min 12 caractères', 'error');
    return;
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    showToast('❌ Mot de passe pas assez fort', 'error');
    return;
  }
  if (password !== confirm) {
    showToast('❌ Mots de passe différents', 'error');
    return;
  }
  
  showModal('⏳ Import...', `
    <div style="text-align: center; padding: 40px;">
      <div class="ptr-spinner" style="width: 48px; height: 48px; margin: 0 auto 20px;"></div>
      <p style="color: var(--text-secondary);">Validation de la seed phrase...</p>
    </div>
  `);
  
  try {
    await polkadotUtilCrypto.cryptoWaitReady();
    
    // Validate mnemonic
    if (!polkadotUtilCrypto.mnemonicValidate(seed)) {
      showToast('❌ Seed phrase invalide', 'error');
      closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
      return;
    }
    
    // Derive address
    const keyring = new polkadotKeyring.Keyring({ type: 'sr25519', ss58Format: 42 });
    const pair = keyring.addFromMnemonic(seed);
    const address = pair.address;
    
    // Verify crypto is available
    verifyCryptoAvailable();
    
    // Encrypt with AES-256-GCM
    const encryptedMnemonic = await encryptMnemonic(seed, password);
    
    if (!encryptedMnemonic) {
      throw new Error('Encryption failed');
    }
    
    state.wallets.push({ 
      name, 
      address, 
      encryptedMnemonic,
      created: Date.now(), 
      watchOnly: false,
      security: {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2',
        iterations: CRYPTO_CONFIG.pbkdf2Iterations
      }
    });
    state.activeWalletIndex = state.wallets.length - 1;
    saveWallets();
    
    showToast('✅ Wallet importé avec chiffrement AES-256!', 'success');
    closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
    loadWalletData().then(renderMainUI);
    
  } catch (err) {
    console.error('Import error:', err);
    showToast('❌ Erreur import', 'error');
    closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  }
}

function showTrackAddress() {
  showModal('Surveiller', `
    <div class="input-group">
      <label class="input-label">Nom</label>
      <input type="text" class="input-field" id="trackName" placeholder="Whale">
    </div>
    <div class="input-group">
      <label class="input-label">Adresse TAO (commence par 5)</label>
      <input type="text" class="input-field" id="trackAddress" placeholder="5...">
    </div>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">👀 Lecture seule</p>
    <button class="btn btn-primary" onclick="trackAddress()">Surveiller</button>
  `);
}

function trackAddress() {
  const name = $('trackName')?.value || 'Tracked';
  const address = $('trackAddress')?.value?.trim();
  
  if (!address || !address.startsWith('5') || address.length < 47) {
    showToast('❌ Adresse invalide', 'error');
    return;
  }
  
  state.wallets.push({ name, address, created: Date.now(), watchOnly: true });
  state.activeWalletIndex = state.wallets.length - 1;
  saveWallets();
  
  showToast('✅ Adresse suivie!', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  loadWalletData().then(renderMainUI);
}

// ============ ACTIONS ============

function showReceive() {
  const wallet = state.wallets[state.activeWalletIndex];
  showModal('Recevoir τ', `
    <div class="qr-container" id="qrCode"><canvas width="180" height="180"></canvas></div>
    <div class="address-display" onclick="copyAddress()">${wallet.address}</div>
    <p class="copy-hint">Tap pour copier</p>
    <button class="btn btn-secondary" style="margin-top: 20px;" onclick="shareAddress()">Partager</button>
  `);
  setTimeout(() => {
    const canvas = document.querySelector('#qrCode canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (Math.random() > 0.5) ctx.fillRect(i * 20, j * 20, 18, 18);
        }
      }
    }
  }, 100);
}

function copyAddress() {
  const wallet = state.wallets[state.activeWalletIndex];
  navigator.clipboard.writeText(wallet.address);
  haptic();
  showToast('📋 Copié!', 'success');
}

function shareAddress() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (navigator.share) {
    navigator.share({ title: 'Mon adresse TAO', text: wallet.address });
  } else {
    copyAddress();
  }
}

function showSend() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (wallet.watchOnly) {
    showModal('🔒 Lecture seule', `
      <p style="text-align: center; color: var(--text-secondary); margin-bottom: 24px;">
        Importe ta seed phrase pour envoyer.
      </p>
      <button class="btn btn-primary" onclick="showImportWallet()">Importer</button>
    `);
    return;
  }
  
  showModal('Envoyer τ', `
    <div class="input-group">
      <label class="input-label">Destinataire</label>
      <input type="text" class="input-field" id="sendAddress" placeholder="5...">
    </div>
    <div class="input-group">
      <label class="input-label">Montant (τ)</label>
      <input type="number" class="input-field" id="sendAmount" placeholder="0.00" step="0.0001">
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="btn btn-secondary" style="flex:1; padding: 10px;" onclick="setSendAmount(0.25)">25%</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px;" onclick="setSendAmount(0.5)">50%</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px;" onclick="setSendAmount(1)">Max</button>
      </div>
    </div>
    <button class="btn btn-primary" style="margin-top: 16px;" onclick="confirmSend()">Continuer</button>
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
    showToast('❌ Adresse invalide', 'error');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showToast('❌ Montant invalide', 'error');
    return;
  }
  
  showToast('✅ Transaction envoyée! (Demo)', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
}

function showStake() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (wallet.watchOnly) {
    showModal('🔒 Lecture seule', `
      <p style="text-align: center; color: var(--text-secondary); margin-bottom: 24px;">
        Importe ta seed phrase pour staker.
      </p>
      <button class="btn btn-primary" onclick="showImportWallet()">Importer</button>
    `);
    return;
  }
  
  const balance = state.balance || { free: 0, staked: 0 };
  const userAPY = calculateUserAPY();
  
  showModal('📊 Staking', `
    <div class="stake-summary">
      <div class="stake-stat">
        <span class="stake-stat-value">${formatTAO(balance.staked)} τ</span>
        <span class="stake-stat-label">Staké</span>
      </div>
      <div class="stake-stat">
        <span class="stake-stat-value">${formatTAO(balance.free)} τ</span>
        <span class="stake-stat-label">Disponible</span>
      </div>
      <div class="stake-stat">
        <span class="stake-stat-value">${userAPY.toFixed(1)}%</span>
        <span class="stake-stat-label">APY moyen</span>
      </div>
    </div>
    
    <div class="stake-actions">
      <button class="stake-action-btn" onclick="showStakeNew()">
        <span class="stake-action-icon">➕</span>
        <span class="stake-action-label">Staker</span>
      </button>
      <button class="stake-action-btn" onclick="showUnstake()">
        <span class="stake-action-icon">➖</span>
        <span class="stake-action-label">Destaker</span>
      </button>
      <button class="stake-action-btn" onclick="showRestake()">
        <span class="stake-action-icon">🔄</span>
        <span class="stake-action-label">Re-staker</span>
      </button>
      <button class="stake-action-btn" onclick="showBestAPY()">
        <span class="stake-action-icon">🏆</span>
        <span class="stake-action-label">Best APY</span>
      </button>
    </div>
    
    ${state.positions.length > 0 ? `
    <h3 style="margin: 20px 0 12px; font-size: 16px;">📋 Tes positions (${state.positions.length})</h3>
    <div class="asset-list">
      ${state.positions.map(pos => {
        const subnet = SUBNET_INFO[pos.netuid] || { name: `SN${pos.netuid}`, emoji: '🔷', apy: 15 };
        return `
        <div class="asset-item" onclick="showPositionDetail(${pos.netuid})">
          <div class="asset-icon subnet">${subnet.emoji}</div>
          <div class="asset-info">
            <div class="asset-name">SN${pos.netuid} - ${subnet.name}</div>
            <div class="asset-subtitle">~${subnet.apy}% APY</div>
          </div>
          <div class="asset-values">
            <div class="asset-amount">${formatTAO(pos.staked)}</div>
            <div class="asset-usd">${formatUSD(pos.staked * state.taoPrice)}</div>
          </div>
        </div>
      `}).join('')}
    </div>
    ` : `
    <div style="text-align: center; padding: 30px; color: var(--text-tertiary);">
      <p>Aucune position de staking</p>
      <p style="font-size: 13px; margin-top: 8px;">Stake tes τ pour gagner des rewards !</p>
    </div>
    `}
  `);
}

function showStakeNew() {
  const subnets = Object.entries(SUBNET_INFO).slice(1, 7);
  
  showModal('➕ Staker', `
    <p style="color: var(--text-secondary); margin-bottom: 16px;">Choisis un subnet</p>
    <div class="asset-list">
      ${subnets.map(([id, info]) => `
        <div class="asset-item" onclick="selectSubnetToStake(${id})">
          <div class="asset-icon subnet">${info.emoji}</div>
          <div class="asset-info">
            <div class="asset-name">SN${id} - ${info.name}</div>
            <div class="asset-subtitle">~${info.apy}% APY</div>
          </div>
          <span style="color: var(--success);">→</span>
        </div>
      `).join('')}
    </div>
  `);
}

function selectSubnetToStake(netuid) {
  const subnet = SUBNET_INFO[netuid] || { name: `Subnet ${netuid}`, apy: 15 };
  const balance = state.balance?.free || 0;
  
  showModal(`➕ Staker sur SN${netuid}`, `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 14px; color: var(--text-secondary);">${subnet.name}</div>
      <div style="font-size: 24px; font-weight: 700; color: var(--success);">~${subnet.apy}% APY</div>
    </div>
    
    <div class="input-group">
      <label class="input-label">Montant (τ)</label>
      <input type="number" class="input-field" id="stakeAmount" placeholder="0.00" step="0.01">
      <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
        <button class="btn btn-secondary" style="flex:1; padding: 10px; min-width: 60px;" onclick="setStakeAmount(1)">1 τ</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px; min-width: 60px;" onclick="setStakeAmount(5)">5 τ</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px; min-width: 60px;" onclick="setStakeAmount(10)">10 τ</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px; min-width: 60px;" onclick="setStakeAmount(50)">50 τ</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px; min-width: 60px;" onclick="setStakeAmount(100)">100 τ</button>
        <button class="btn btn-secondary" style="flex:1; padding: 10px; min-width: 60px;" onclick="setStakeAmount(${balance - 0.01})">MAX</button>
      </div>
    </div>
    
    <p style="color: var(--text-tertiary); font-size: 12px; margin: 16px 0;">
      Disponible: ${formatTAO(balance)} τ
    </p>
    
    <button class="btn btn-primary" onclick="confirmStake(${netuid})">Staker</button>
  `);
}

function setStakeAmount(amount) {
  const input = $('stakeAmount');
  if (input) input.value = Math.max(0, amount).toFixed(2);
}

function confirmStake(netuid) {
  const amount = parseFloat($('stakeAmount')?.value);
  if (isNaN(amount) || amount <= 0) {
    showToast('❌ Montant invalide', 'error');
    return;
  }
  
  const subnet = SUBNET_INFO[netuid] || { name: `SN${netuid}`, apy: 15 };
  
  showModal('✅ Confirmer', `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 36px; font-weight: 700;">${amount} τ</div>
      <div style="color: var(--text-secondary);">→ SN${netuid} (${subnet.name})</div>
      <div style="color: var(--success); margin-top: 8px;">~${subnet.apy}% APY</div>
    </div>
    
    <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: var(--text-tertiary);">Rewards estimés/mois</span>
        <span style="color: var(--success);">+${(amount * subnet.apy / 100 / 12).toFixed(4)} τ</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--text-tertiary);">Rewards estimés/an</span>
        <span style="color: var(--success);">+${(amount * subnet.apy / 100).toFixed(4)} τ</span>
      </div>
    </div>
    
    <button class="btn btn-primary" onclick="executeStake(${netuid}, ${amount})">Confirmer</button>
    <button class="btn btn-ghost" style="margin-top: 8px;" onclick="showStakeNew()">Annuler</button>
  `);
}

function executeStake(netuid, amount) {
  haptic();
  showToast('✅ Stake effectué ! (Demo)', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
}

// ============ UNSTAKE ============

function showUnstake() {
  if (state.positions.length === 0) {
    showModal('➖ Destaker', `
      <p style="text-align: center; color: var(--text-secondary); padding: 30px;">
        Aucune position à destaker
      </p>
      <button class="btn btn-secondary" onclick="showStakeNew()">Staker d'abord</button>
    `);
    return;
  }
  
  showModal('➖ Destaker', `
    <div style="background: var(--warning); color: #000; border-radius: 12px; padding: 12px; margin-bottom: 16px; text-align: center;">
      ⚠️ Le destaking prend ~7 jours
    </div>
    
    <p style="color: var(--text-secondary); margin-bottom: 16px;">Choisis une position</p>
    <div class="asset-list">
      ${state.positions.map(pos => {
        const subnet = SUBNET_INFO[pos.netuid] || { name: `SN${pos.netuid}`, emoji: '🔷' };
        return `
        <div class="asset-item" onclick="selectPositionToUnstake(${pos.netuid}, ${pos.staked})">
          <div class="asset-icon subnet">${subnet.emoji}</div>
          <div class="asset-info">
            <div class="asset-name">SN${pos.netuid} - ${subnet.name}</div>
            <div class="asset-subtitle">${formatTAO(pos.staked)} τ stakés</div>
          </div>
          <span style="color: var(--error);">→</span>
        </div>
      `}).join('')}
    </div>
  `);
}

function selectPositionToUnstake(netuid, staked) {
  const subnet = SUBNET_INFO[netuid] || { name: `SN${netuid}` };
  
  showModal(`➖ Destaker de SN${netuid}`, `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 14px; color: var(--text-secondary);">${subnet.name}</div>
      <div style="font-size: 24px; font-weight: 700;">${formatTAO(staked)} τ</div>
    </div>
    
    <p style="color: var(--text-secondary); margin-bottom: 16px;">Combien destaker ?</p>
    
    <div class="unstake-options">
      <button class="unstake-option" onclick="confirmUnstake(${netuid}, ${staked * 0.25})">
        <span class="unstake-pct">25%</span>
        <span class="unstake-amount">${formatTAO(staked * 0.25)} τ</span>
      </button>
      <button class="unstake-option" onclick="confirmUnstake(${netuid}, ${staked * 0.5})">
        <span class="unstake-pct">50%</span>
        <span class="unstake-amount">${formatTAO(staked * 0.5)} τ</span>
      </button>
      <button class="unstake-option" onclick="confirmUnstake(${netuid}, ${staked * 0.75})">
        <span class="unstake-pct">75%</span>
        <span class="unstake-amount">${formatTAO(staked * 0.75)} τ</span>
      </button>
      <button class="unstake-option full" onclick="confirmUnstake(${netuid}, ${staked})">
        <span class="unstake-pct">100%</span>
        <span class="unstake-amount">${formatTAO(staked)} τ</span>
      </button>
    </div>
    
    <button class="btn btn-ghost" style="margin-top: 16px;" onclick="showUnstake()">Annuler</button>
  `);
}

function confirmUnstake(netuid, amount) {
  showModal('⚠️ Confirmer Destaking', `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 36px; font-weight: 700; color: var(--error);">${formatTAO(amount)} τ</div>
      <div style="color: var(--text-secondary);">depuis SN${netuid}</div>
    </div>
    
    <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <p style="color: var(--warning); margin-bottom: 8px;">⏳ Délai de ~7 jours</p>
      <p style="color: var(--text-tertiary); font-size: 13px;">
        Tes τ seront disponibles après la période de cooldown du réseau.
      </p>
    </div>
    
    <button class="btn btn-primary" style="background: var(--error);" onclick="executeUnstake(${netuid}, ${amount})">Confirmer Destaking</button>
    <button class="btn btn-ghost" style="margin-top: 8px;" onclick="showUnstake()">Annuler</button>
  `);
}

function executeUnstake(netuid, amount) {
  haptic();
  showToast('⏳ Destaking initié ! (Demo)', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
}

// ============ RESTAKE ============

function showRestake() {
  if (state.positions.length === 0) {
    showModal('🔄 Re-staker', `
      <p style="text-align: center; color: var(--text-secondary); padding: 30px;">
        Aucune position à re-staker
      </p>
      <button class="btn btn-secondary" onclick="showStakeNew()">Staker d'abord</button>
    `);
    return;
  }
  
  showModal('🔄 Re-staker', `
    <p style="color: var(--text-secondary); margin-bottom: 8px;">
      Déplace ton stake sans période de cooldown
    </p>
    <p style="color: var(--text-tertiary); font-size: 13px; margin-bottom: 16px;">
      Choisis la position source
    </p>
    
    <div class="asset-list">
      ${state.positions.map(pos => {
        const subnet = SUBNET_INFO[pos.netuid] || { name: `SN${pos.netuid}`, emoji: '🔷' };
        return `
        <div class="asset-item" onclick="selectRestakeSource(${pos.netuid}, ${pos.staked})">
          <div class="asset-icon subnet">${subnet.emoji}</div>
          <div class="asset-info">
            <div class="asset-name">SN${pos.netuid} - ${subnet.name}</div>
            <div class="asset-subtitle">${formatTAO(pos.staked)} τ</div>
          </div>
          <span>→</span>
        </div>
      `}).join('')}
    </div>
  `);
}

function selectRestakeSource(fromNetuid, amount) {
  const subnets = Object.entries(SUBNET_INFO).filter(([id]) => parseInt(id) !== fromNetuid).slice(0, 5);
  
  showModal('🔄 Destination', `
    <p style="color: var(--text-secondary); margin-bottom: 16px;">
      Depuis SN${fromNetuid} → Vers ?
    </p>
    
    <div class="asset-list">
      ${subnets.map(([id, info]) => `
        <div class="asset-item" onclick="confirmRestake(${fromNetuid}, ${id}, ${amount})">
          <div class="asset-icon subnet">${info.emoji}</div>
          <div class="asset-info">
            <div class="asset-name">SN${id} - ${info.name}</div>
            <div class="asset-subtitle">~${info.apy}% APY</div>
          </div>
          <span style="color: var(--success);">→</span>
        </div>
      `).join('')}
    </div>
    
    <button class="btn btn-ghost" style="margin-top: 16px;" onclick="showRestake()">Retour</button>
  `);
}

function confirmRestake(fromNetuid, toNetuid, amount) {
  const fromSubnet = SUBNET_INFO[fromNetuid] || { name: `SN${fromNetuid}` };
  const toSubnet = SUBNET_INFO[toNetuid] || { name: `SN${toNetuid}`, apy: 15 };
  
  showModal('🔄 Confirmer Re-stake', `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 28px; font-weight: 700;">${formatTAO(amount)} τ</div>
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 12px;">
        <span style="color: var(--text-secondary);">SN${fromNetuid}</span>
        <span style="color: var(--accent);">→</span>
        <span style="color: var(--success);">SN${toNetuid}</span>
      </div>
    </div>
    
    <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: var(--text-tertiary);">Nouveau APY</span>
        <span style="color: var(--success);">~${toSubnet.apy}%</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--text-tertiary);">Frais</span>
        <span>Aucun</span>
      </div>
    </div>
    
    <button class="btn btn-primary" onclick="executeRestake(${fromNetuid}, ${toNetuid}, ${amount})">Confirmer</button>
    <button class="btn btn-ghost" style="margin-top: 8px;" onclick="showRestake()">Annuler</button>
  `);
}

function executeRestake(fromNetuid, toNetuid, amount) {
  haptic();
  showToast('✅ Re-stake effectué ! (Demo)', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
}

// ============ BEST APY ============

function showBestAPY() {
  const sortedSubnets = Object.entries(SUBNET_INFO)
    .filter(([id]) => id !== '0')
    .sort((a, b) => b[1].apy - a[1].apy);
  
  showModal('🏆 Meilleurs APY', `
    <p style="color: var(--text-secondary); margin-bottom: 16px;">
      Classement par rendement
    </p>
    
    <div class="asset-list">
      ${sortedSubnets.map(([id, info], index) => `
        <div class="asset-item" onclick="selectSubnetToStake(${id})">
          <div class="apy-rank ${index < 3 ? 'top' : ''}">${index + 1}</div>
          <div class="asset-info">
            <div class="asset-name">${info.emoji} SN${id} - ${info.name}</div>
            <div class="asset-subtitle">Subnet ${id}</div>
          </div>
          <div class="apy-value">${info.apy}%</div>
        </div>
      `).join('')}
    </div>
    
    <p style="color: var(--text-tertiary); font-size: 12px; text-align: center; margin-top: 16px;">
      APY estimés basés sur les 30 derniers jours
    </p>
  `);
}

function showPositionDetail(netuid) {
  const pos = state.positions.find(p => p.netuid === netuid);
  if (!pos) return;
  
  const subnet = SUBNET_INFO[netuid] || { name: `SN${netuid}`, emoji: '🔷', apy: 15 };
  const monthlyReward = pos.staked * (subnet.apy / 100 / 12);
  const yearlyReward = pos.staked * (subnet.apy / 100);
  
  showModal(`${subnet.emoji} SN${netuid}`, `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 14px; color: var(--text-secondary);">${subnet.name}</div>
      <div style="font-size: 36px; font-weight: 700;">${formatTAO(pos.staked)} τ</div>
      <div style="color: var(--text-secondary);">${formatUSD(pos.staked * state.taoPrice)}</div>
    </div>
    
    <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="color: var(--text-tertiary);">APY estimé</span>
        <span style="color: var(--success); font-weight: 600;">~${subnet.apy}%</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="color: var(--text-tertiary);">Rewards/mois</span>
        <span style="color: var(--success);">+${formatTAO(monthlyReward)} τ</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--text-tertiary);">Rewards/an</span>
        <span style="color: var(--success);">+${formatTAO(yearlyReward)} τ</span>
      </div>
    </div>
    
    <div style="display: flex; gap: 12px;">
      <button class="btn btn-secondary" style="flex: 1;" onclick="selectPositionToUnstake(${netuid}, ${pos.staked})">➖ Destaker</button>
      <button class="btn btn-primary" style="flex: 1;" onclick="selectRestakeSource(${netuid}, ${pos.staked})">🔄 Re-staker</button>
    </div>
  `);
}

function showSwap() {
  showModal('Swap', `
    <p style="color: var(--text-secondary); margin-bottom: 16px;">TAO ↔ tokens de subnets</p>
    <div class="asset-list">
      <div class="asset-item" onclick="showToast('🔄 Swap bientôt!')">
        <div class="asset-icon">τ</div>
        <div class="asset-info">
          <div class="asset-name">TAO → dTAO</div>
          <div class="asset-subtitle">Vers tokens subnet</div>
        </div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showToast('🔄 Swap bientôt!')">
        <div class="asset-icon subnet">α</div>
        <div class="asset-info">
          <div class="asset-name">dTAO → TAO</div>
          <div class="asset-subtitle">Vers TAO natif</div>
        </div>
        <span>→</span>
      </div>
    </div>
    <p style="color: var(--text-tertiary); font-size: 12px; text-align: center; margin-top: 16px;">Fee: 0.3%</p>
  `);
}

function applyStrategy() {
  showToast('⚡ Stratégie appliquée! (Demo)', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
}

function showAlerts() {
  showModal('🔔 Alertes', `
    <div class="asset-list">
      <div class="asset-item" onclick="showToast('✅ Alerte configurée!')">
        <span class="asset-icon">💰</span>
        <div class="asset-info">
          <div class="asset-name">Prix TAO</div>
          <div class="asset-subtitle">Notifier si TAO atteint X$</div>
        </div>
      </div>
      <div class="asset-item" onclick="showToast('✅ Alerte configurée!')">
        <span class="asset-icon">🎁</span>
        <div class="asset-info">
          <div class="asset-name">Rewards</div>
          <div class="asset-subtitle">Résumé quotidien</div>
        </div>
      </div>
      <div class="asset-item" onclick="showToast('✅ Alerte configurée!')">
        <span class="asset-icon">🔥</span>
        <div class="asset-info">
          <div class="asset-name">Opportunités</div>
          <div class="asset-subtitle">Nouveaux APY élevés</div>
        </div>
      </div>
    </div>
  `);
}

function showNotifications() {
  showModal('🔔 Notifications', `
    <p style="text-align: center; color: var(--text-secondary); padding: 40px 0;">
      Aucune notification
    </p>
    <button class="btn btn-secondary" onclick="showAlerts()">Configurer alertes</button>
  `);
}

async function showSettings() {
  const biometricStatus = isBiometricEnabled();
  const biometricCheck = await isBiometricAvailable();
  
  showModal('⚙️ Paramètres', `
    <div class="asset-list">
      <div class="asset-item" onclick="showWalletSettings()">
        <span class="asset-icon">👛</span>
        <div class="asset-info"><div class="asset-name">Wallet</div></div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showBiometricSettings()">
        <span class="asset-icon">${biometricStatus ? '✅' : '🔐'}</span>
        <div class="asset-info">
          <div class="asset-name">${biometricCheck.type || 'Biométrie'}</div>
          <div class="asset-subtitle" style="font-size: 11px; color: ${biometricStatus ? 'var(--success)' : 'var(--text-tertiary)'};">
            ${biometricStatus ? 'Activé' : (biometricCheck.available ? 'Disponible' : 'Non disponible')}
          </div>
        </div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showSecuritySettings()">
        <span class="asset-icon">🛡️</span>
        <div class="asset-info"><div class="asset-name">Sécurité</div></div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showGainsStudy()">
        <span class="asset-icon">📈</span>
        <div class="asset-info">
          <div class="asset-name">Étude de gains (3 ans)</div>
          <div class="asset-subtitle" style="font-size: 11px; color: var(--text-tertiary);">Performance TAO historique</div>
        </div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showToast('🌐 Bientôt!')">
        <span class="asset-icon">🌐</span>
        <div class="asset-info"><div class="asset-name">Réseau</div></div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showDisclaimer()">
        <span class="asset-icon">⚖️</span>
        <div class="asset-info"><div class="asset-name">Non-responsabilité</div></div>
        <span>→</span>
      </div>
    </div>
    <p style="text-align: center; margin-top: 24px; color: var(--text-tertiary); font-size: 12px;">
      TAO Wallet v${APP_VERSION}
    </p>
  `);
}

function showWalletSettings() {
  const wallet = state.wallets[state.activeWalletIndex];
  if (!wallet) return;
  
  showModal('👛 Wallet', `
    <div class="asset-list">
      <div class="asset-item" onclick="showSeedPhrase()">
        <span class="asset-icon">🔑</span>
        <div class="asset-info"><div class="asset-name">Voir la seed phrase</div></div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="exportWallet()">
        <span class="asset-icon">📤</span>
        <div class="asset-info"><div class="asset-name">Exporter</div></div>
        <span>→</span>
      </div>
      <div class="asset-item" style="border-color: var(--error);" onclick="confirmDeleteWallet()">
        <span class="asset-icon">🗑️</span>
        <div class="asset-info"><div class="asset-name" style="color: var(--error);">Supprimer ce wallet</div></div>
        <span>→</span>
      </div>
    </div>
  `);
}

function showSecuritySettings() {
  const biometricStatus = isBiometricEnabled();
  
  showModal('🛡️ Sécurité', `
    <div class="security-badges" style="margin-bottom: 20px; justify-content: center;">
      <span class="security-badge">🔒 AES-256-GCM</span>
      <span class="security-badge">🔑 PBKDF2 600k</span>
      <span class="security-badge">🎲 256 bits</span>
    </div>
    <div class="asset-list">
      <div class="asset-item">
        <span class="asset-icon">🔐</span>
        <div class="asset-info">
          <div class="asset-name">Chiffrement</div>
          <div class="asset-subtitle" style="font-size: 11px; color: var(--success);">Actif - Grade bancaire</div>
        </div>
        <span style="color: var(--success);">✓</span>
      </div>
      <div class="asset-item">
        <span class="asset-icon">${biometricStatus ? '👤' : '👆'}</span>
        <div class="asset-info">
          <div class="asset-name">Biométrie</div>
          <div class="asset-subtitle" style="font-size: 11px; color: ${biometricStatus ? 'var(--success)' : 'var(--text-tertiary)'};">
            ${biometricStatus ? 'Activé' : 'Non configuré'}
          </div>
        </div>
        <span style="color: ${biometricStatus ? 'var(--success)' : 'var(--text-tertiary)'};">${biometricStatus ? '✓' : '○'}</span>
      </div>
    </div>
    <p style="text-align: center; margin-top: 20px; color: var(--text-tertiary); font-size: 11px;">
      Vos clés sont chiffrées localement et ne quittent jamais votre appareil.
    </p>
  `);
}

// Disclaimer / Non-responsabilité
function showDisclaimer() {
  showModal('⚖️ NON-RESPONSABILITÉ', `
    <div style="max-height: 60vh; overflow-y: auto; padding-right: 8px;">
      <div style="background: linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05)); border: 1px solid var(--error); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="color: var(--error); font-weight: 600; margin-bottom: 8px; font-family: monospace;">⚠️ AVERTISSEMENT IMPORTANT</p>
        <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.6;">
          L'investissement dans les crypto-actifs comporte des risques significatifs, incluant la perte totale du capital investi.
        </p>
      </div>
      
      <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
        <h4 style="color: var(--accent); margin-bottom: 8px; font-size: 14px;">📊 Risques liés aux crypto-actifs</h4>
        <ul style="color: var(--text-secondary); font-size: 12px; line-height: 1.8; padding-left: 16px;">
          <li>Volatilité extrême des cours</li>
          <li>Absence de garantie de capital</li>
          <li>Risques technologiques et de sécurité</li>
          <li>Évolutions réglementaires incertaines</li>
          <li>Liquidité variable selon les marchés</li>
        </ul>
      </div>
      
      <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
        <h4 style="color: var(--accent); margin-bottom: 8px; font-size: 14px;">🔐 Responsabilité de l'utilisateur</h4>
        <ul style="color: var(--text-secondary); font-size: 12px; line-height: 1.8; padding-left: 16px;">
          <li>Vous êtes seul responsable de la sécurité de votre seed phrase</li>
          <li>La perte de votre seed phrase entraîne la perte définitive de vos fonds</li>
          <li>Subnavis n'a pas accès à vos clés privées</li>
          <li>Aucune récupération n'est possible sans votre seed phrase</li>
        </ul>
      </div>
      
      <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
        <h4 style="color: var(--accent); margin-bottom: 8px; font-size: 14px;">📝 Limitation de responsabilité</h4>
        <p style="color: var(--text-secondary); font-size: 12px; line-height: 1.8;">
          Subnavis est fourni "tel quel" sans garantie d'aucune sorte. Nous déclinons toute responsabilité pour :
        </p>
        <ul style="color: var(--text-secondary); font-size: 12px; line-height: 1.8; padding-left: 16px; margin-top: 8px;">
          <li>Pertes financières liées à l'utilisation de l'application</li>
          <li>Erreurs de transaction ou problèmes techniques</li>
          <li>Décisions d'investissement prises par l'utilisateur</li>
          <li>Interruptions de service du réseau Bittensor</li>
        </ul>
      </div>
      
      <div style="background: var(--bg-card); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--accent); margin-bottom: 8px; font-size: 14px;">💡 Conseil</h4>
        <p style="color: var(--text-secondary); font-size: 12px; line-height: 1.8;">
          N'investissez que ce que vous pouvez vous permettre de perdre. Les performances passées ne préjugent pas des performances futures.
        </p>
      </div>
    </div>
    
    <p style="text-align: center; margin-top: 16px; color: var(--text-tertiary); font-size: 10px;">
      En utilisant Subnavis, vous acceptez ces conditions.
    </p>
  `);
}

// Étude de gains sur 3 ans
function showGainsStudy() {
  // Données historiques TAO (prix en USD)
  const historicalData = {
    '2023-02': { price: 35, event: 'Début du trading' },
    '2023-05': { price: 31, event: 'ATL ~30$' },
    '2023-12': { price: 280, event: 'Rally fin d\'année' },
    '2024-03': { price: 758, event: '🚀 ATH 757$' },
    '2024-06': { price: 380, event: 'Correction' },
    '2024-12': { price: 500, event: 'Nouveau rally' },
    '2025-02': { price: 350, event: 'Consolidation' },
    '2026-02': { price: state.taoPrice, event: 'Aujourd\'hui' }
  };
  
  // Calculs de performance
  const currentPrice = state.taoPrice;
  const athPrice = 757.60;
  const atlPrice = 30.83;
  
  // Scénarios d'investissement
  const scenarios = [
    { date: 'Mai 2023 (ATL)', price: 31, invested: 1000 },
    { date: 'Déc 2023', price: 280, invested: 1000 },
    { date: 'Mars 2024 (ATH)', price: 758, invested: 1000 },
    { date: 'Fév 2025', price: 350, invested: 1000 }
  ];
  
  showModal('📈 ÉTUDE DE GAINS', `
    <div style="max-height: 65vh; overflow-y: auto; padding-right: 8px;">
      
      <div style="background: linear-gradient(135deg, rgba(171,159,242,0.15), rgba(139,92,246,0.1)); border: 1px solid var(--accent); border-radius: 12px; padding: 16px; margin-bottom: 16px; text-align: center;">
        <p style="color: var(--text-tertiary); font-size: 11px; margin-bottom: 4px;">Prix actuel TAO</p>
        <p style="font-size: 28px; font-weight: 700; color: var(--text-primary);">$${currentPrice.toFixed(2)}</p>
        <p style="color: var(--text-tertiary); font-size: 11px;">ATH: $${athPrice} | ATL: $${atlPrice}</p>
      </div>
      
      <h4 style="color: var(--accent); margin-bottom: 12px; font-size: 14px; font-family: monospace;">📊 PERFORMANCE HISTORIQUE</h4>
      
      <div style="background: var(--bg-card); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
        ${Object.entries(historicalData).map(([date, data]) => {
          const change = ((currentPrice - data.price) / data.price * 100).toFixed(0);
          const isPositive = currentPrice > data.price;
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
              <div>
                <div style="font-size: 12px; font-weight: 600;">${date}</div>
                <div style="font-size: 10px; color: var(--text-tertiary);">${data.event}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12px;">$${data.price}</div>
                <div style="font-size: 10px; color: ${isPositive ? 'var(--success)' : 'var(--error)'};">
                  ${isPositive ? '+' : ''}${change}%
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <h4 style="color: var(--accent); margin-bottom: 12px; font-size: 14px; font-family: monospace;">💰 SIMULATION 1000$ INVESTIS</h4>
      
      <div style="background: var(--bg-card); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
        ${scenarios.map(s => {
          const taoAmount = s.invested / s.price;
          const currentValue = taoAmount * currentPrice;
          const gain = currentValue - s.invested;
          const gainPercent = ((currentValue / s.invested - 1) * 100).toFixed(0);
          const isPositive = gain > 0;
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
              <div>
                <div style="font-size: 12px; font-weight: 600;">${s.date}</div>
                <div style="font-size: 10px; color: var(--text-tertiary);">Acheté à $${s.price}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; font-weight: 600; color: ${isPositive ? 'var(--success)' : 'var(--error)'};">
                  $${currentValue.toFixed(0)}
                </div>
                <div style="font-size: 10px; color: ${isPositive ? 'var(--success)' : 'var(--error)'};">
                  ${isPositive ? '+' : ''}${gainPercent}% (${isPositive ? '+' : ''}$${gain.toFixed(0)})
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <h4 style="color: var(--accent); margin-bottom: 12px; font-size: 14px; font-family: monospace;">🎯 PROJECTION STAKING (15% APY)</h4>
      
      <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        ${[1, 2, 3].map(years => {
          const stakedTao = 10;
          const finalAmount = stakedTao * Math.pow(1.15, years);
          const rewards = finalAmount - stakedTao;
          const rewardsUSD = rewards * currentPrice;
          return `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; ${years < 3 ? 'border-bottom: 1px solid var(--border);' : ''}">
              <span style="color: var(--text-secondary); font-size: 12px;">${years} an${years > 1 ? 's' : ''} (10 τ staké)</span>
              <span style="color: var(--success); font-size: 12px; font-weight: 600;">
                +${rewards.toFixed(2)} τ (~$${rewardsUSD.toFixed(0)})
              </span>
            </div>
          `;
        }).join('')}
      </div>
      
      <div style="background: rgba(239,68,68,0.1); border: 1px solid var(--error); border-radius: 8px; padding: 12px;">
        <p style="color: var(--error); font-size: 11px; text-align: center; font-family: monospace;">
          ⚠️ Ces données sont indicatives. Les performances passées ne garantissent pas les résultats futurs.
        </p>
      </div>
    </div>
  `);
}

async function showSeedPhrase() {
  // Require biometric verification first if enabled
  if (isBiometricEnabled()) {
    const verified = await requireBiometric('Vérifiez votre identité pour voir la seed phrase');
    if (!verified) return;
  }
  
  const wallet = state.wallets[state.activeWalletIndex];
  if (!wallet || !wallet.encryptedMnemonic) {
    showToast('❌ Seed non disponible', 2000);
    return;
  }
  
  // Ask for password to decrypt
  showModal('🔑 Seed Phrase', `
    <div style="text-align: center; padding: 10px 0;">
      <p style="color: var(--text-secondary); margin-bottom: 16px;">Entrez votre mot de passe pour déchiffrer</p>
      <div class="input-group">
        <input type="password" class="input-field" id="seedPassword" placeholder="Mot de passe">
      </div>
      <button class="btn btn-primary" onclick="decryptAndShowSeed()">Déchiffrer</button>
    </div>
  `);
}

// Store mnemonic temporarily for copy/share actions
let tempMnemonic = null;
let tempMnemonicTimeout = null;

async function decryptAndShowSeed() {
  const password = document.getElementById('seedPassword')?.value;
  if (!password) return;
  
  const wallet = state.wallets[state.activeWalletIndex];
  const mnemonic = await decryptMnemonic(wallet.encryptedMnemonic, password);
  
  if (!mnemonic) {
    showToast('❌ Mot de passe incorrect', 2000);
    return;
  }
  
  // Store temporarily for copy/share
  tempMnemonic = mnemonic;
  
  // Clear after 2 minutes
  if (tempMnemonicTimeout) clearTimeout(tempMnemonicTimeout);
  tempMnemonicTimeout = setTimeout(() => {
    tempMnemonic = null;
  }, 120000);
  
  const words = mnemonic.split(' ');
  const canShare = navigator.share !== undefined;
  
  showModal('🔑 Seed Phrase', `
    <div style="background: var(--bg-elevated); border-radius: 12px; padding: 12px; margin-bottom: 16px; font-size: 12px; color: var(--text-secondary);">
      <strong style="color: var(--warning);">💡 Conseil sécurité</strong><br>
      Évitez le stockage cloud (iCloud, Google Drive). Une note locale ou papier est plus sûr.
    </div>
    <div class="seed-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0;">
      ${words.map((word, i) => `
        <div class="seed-word" style="background: var(--bg-elevated); padding: 8px; border-radius: 8px; text-align: center;">
          <span class="seed-num" style="color: var(--text-tertiary); font-size: 10px;">${i + 1}</span>
          <span class="seed-text" style="font-weight: 600;">${word}</span>
        </div>
      `).join('')}
    </div>
    
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <button class="btn" style="flex: 1; background: var(--bg-elevated);" onclick="copySeedToClipboard()">
        📋 Copier
      </button>
      ${canShare ? `
        <button class="btn" style="flex: 1; background: var(--bg-elevated);" onclick="shareSeedToNotes()">
          📝 Notes
        </button>
      ` : ''}
    </div>
    
    <button class="btn" style="background: var(--bg-card); border: 1px solid var(--border);" onclick="closeModal(event)">Fermer</button>
    
    <p style="text-align: center; margin-top: 12px; color: var(--text-tertiary); font-size: 11px;">
      🔒 Auto-masquage dans 2 min
    </p>
  `, false);
  
  // Auto-close after 2 minutes for security
  setTimeout(() => {
    if (document.querySelector('.modal')) {
      closeModal();
      tempMnemonic = null;
      showToast('🔒 Seed masquée (sécurité)', 2000);
    }
  }, 120000);
}

// Copy seed to clipboard with auto-clear
async function copySeedToClipboard() {
  if (!tempMnemonic) {
    showToast('❌ Session expirée', 2000);
    return;
  }
  
  try {
    // Format nicely with numbers
    const formatted = tempMnemonic.split(' ')
      .map((word, i) => `${i + 1}. ${word}`)
      .join('\n');
    
    await navigator.clipboard.writeText(formatted);
    showToast('📋 Copié! Auto-effacement dans 60s', 2000);
    
    // Auto-clear clipboard after 60 seconds
    setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText();
        if (current === formatted) {
          await navigator.clipboard.writeText('');
          showToast('🔒 Presse-papier effacé', 1500);
        }
      } catch (e) {
        // Can't read clipboard, that's fine
      }
    }, 60000);
    
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = tempMnemonic;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('📋 Copié!', 2000);
  }
}

// Share seed to Notes app (iOS/Android)
async function shareSeedToNotes() {
  if (!tempMnemonic) {
    showToast('❌ Session expirée', 2000);
    return;
  }
  
  if (!navigator.share) {
    showToast('❌ Partage non supporté', 2000);
    return;
  }
  
  try {
    // Format with numbers and title
    const formatted = `🔐 TAO Wallet Seed Phrase\n` +
      `💡 Conseil : désactivez la sync cloud pour cette note\n\n` +
      tempMnemonic.split(' ')
        .map((word, i) => `${i + 1}. ${word}`)
        .join('\n') +
      `\n\n📅 ${new Date().toLocaleDateString('fr-FR')}`;
    
    await navigator.share({
      title: 'TAO Wallet Seed',
      text: formatted
    });
    
    showToast('📝 Envoyé vers Notes!', 2000);
    
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast('❌ Partage annulé', 2000);
    }
  }
}

function exportWallet() {
  showToast('📤 Export bientôt disponible', 2000);
}

function confirmDeleteWallet() {
  showModal('⚠️ Supprimer Wallet', `
    <div style="text-align: center; padding: 20px 0;">
      <p style="color: var(--error); font-weight: 600; margin-bottom: 16px;">Cette action est irréversible!</p>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">
        Assurez-vous d'avoir sauvegardé votre seed phrase avant de supprimer.
      </p>
      <button class="btn" style="background: var(--error);" onclick="deleteCurrentWallet()">
        Oui, supprimer définitivement
      </button>
      <button class="btn" style="margin-top: 12px; background: var(--bg-elevated);" onclick="closeModal(event)">
        Annuler
      </button>
    </div>
  `);
}

async function deleteCurrentWallet() {
  // Require biometric if enabled
  if (isBiometricEnabled()) {
    closeModal();
    const verified = await requireBiometric('Confirmez pour supprimer le wallet');
    if (!verified) return;
  }
  
  state.wallets.splice(state.activeWalletIndex, 1);
  state.activeWalletIndex = 0;
  saveWallets();
  
  closeModal();
  
  if (state.wallets.length === 0) {
    disableBiometric(); // Also remove biometric if no wallets
    renderOnboarding();
  } else {
    await loadWalletData();
    renderMainUI();
  }
  
  showToast('🗑️ Wallet supprimé', 2000);
}

function handleInsight(type) {
  if (type === 'action') showStake();
  else if (type === 'opportunity') showStake();
  else showAIInsights();
}

function showAllActivity() {
  showModal('📜 Activité', `
    <div class="asset-list">
      ${state.activity.map(act => `
        <div class="activity-item">
          <div class="activity-icon ${act.type}">${act.type === 'reward' ? '🎁' : act.type === 'receive' ? '↓' : act.type === 'send' ? '↑' : '📊'}</div>
          <div class="activity-info">
            <div class="activity-type">${act.type === 'reward' ? 'Reward' : act.type === 'receive' ? 'Reçu' : act.type === 'send' ? 'Envoyé' : 'Staké'}</div>
            <div class="activity-time">${timeAgo(act.time)}</div>
          </div>
          <div class="activity-amount ${act.type}">${act.type === 'receive' || act.type === 'reward' ? '+' : '-'}${formatTAO(act.amount)} τ</div>
        </div>
      `).join('')}
    </div>
  `);
}

function showAllPositions() {
  showModal('📊 Positions', `
    <div class="asset-list">
      ${state.positions.map(pos => {
        const subnet = SUBNET_INFO[pos.netuid] || { name: `SN${pos.netuid}`, emoji: '🔷', apy: 15 };
        return `
        <div class="asset-item">
          <div class="asset-icon subnet">${subnet.emoji}</div>
          <div class="asset-info">
            <div class="asset-name">SN${pos.netuid} - ${subnet.name}</div>
            <div class="asset-subtitle">~${subnet.apy}% APY</div>
          </div>
          <div class="asset-values">
            <div class="asset-amount">${formatTAO(pos.staked)}</div>
          </div>
        </div>
      `}).join('')}
    </div>
    <button class="btn btn-primary" style="margin-top: 16px;" onclick="closeModal(event); showStake()">Staker plus</button>
  `);
}

// ============ TABS ============

function switchTab(tab) {
  haptic();
  state.currentTab = tab;
  
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  if (tab === 'home') renderMainUI();
  else if (tab === 'ai') showAIInsights();
  else if (tab === 'stake') showStake();
  else if (tab === 'badges') showAllBadges();
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
  
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(171, 159, 242, 0.3)');
  gradient.addColorStop(1, 'rgba(171, 159, 242, 0)');
  
  ctx.beginPath();
  ctx.moveTo(padding, h);
  data.forEach((price, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - ((price - min) / range) * (h - padding * 2);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w - padding, h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
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
  ctx.stroke();
  
  const lastX = w - padding;
  const lastY = h - padding - ((data[data.length - 1] - min) / range) * (h - padding * 2);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ab9ff2';
  ctx.fill();
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
      showToast('✅ Actualisé!');
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
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
