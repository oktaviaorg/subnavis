// TAO Wallet PWA v2 - 2026 Edition
// Phantom-level UX + AI Insights + Gamification

const APP_VERSION = '2.1.0';
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
    await loadWalletData();
    renderMainUI();
  } else {
    renderOnboarding();
  }
  
  setupPullToRefresh();
  setInterval(fetchPrice, 60000);
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
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px;">
      ⚠️ Demo - En production, une seed phrase sécurisée serait générée.
    </p>
    <button class="btn btn-primary" onclick="createDemoWallet()">Créer</button>
  `);
}

function createDemoWallet() {
  const name = $('walletName')?.value || 'Wallet';
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '5';
  for (let i = 0; i < 47; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  
  state.wallets.push({ name, address: addr, created: Date.now(), watchOnly: false });
  state.activeWalletIndex = state.wallets.length - 1;
  saveWallets();
  
  showToast('✅ Wallet créé!', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  loadWalletData().then(renderMainUI);
}

function showImportWallet() {
  showModal('Importer', `
    <div class="input-group">
      <label class="input-label">Nom</label>
      <input type="text" class="input-field" id="importName" placeholder="Mon Wallet">
    </div>
    <div class="input-group">
      <label class="input-label">Seed phrase (12/24 mots)</label>
      <textarea class="input-field" id="importSeed" placeholder="word1 word2 word3..." style="height: 100px;"></textarea>
    </div>
    <button class="btn btn-primary" onclick="importWallet()">Importer</button>
  `);
}

function importWallet() {
  const name = $('importName')?.value || 'Importé';
  const seed = $('importSeed')?.value?.trim();
  
  if (!seed || seed.split(/\s+/).length < 12) {
    showToast('❌ Seed invalide', 'error');
    return;
  }
  
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '5';
  for (let i = 0; i < 47; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  
  state.wallets.push({ name, address: addr, created: Date.now(), watchOnly: false });
  state.activeWalletIndex = state.wallets.length - 1;
  saveWallets();
  
  showToast('✅ Wallet importé!', 'success');
  closeModal({target: document.querySelector('.modal-overlay'), currentTarget: document.querySelector('.modal-overlay')});
  loadWalletData().then(renderMainUI);
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

function showSettings() {
  showModal('⚙️ Paramètres', `
    <div class="asset-list">
      <div class="asset-item" onclick="showToast('⚙️ Bientôt!')">
        <span class="asset-icon">👛</span>
        <div class="asset-info"><div class="asset-name">Wallet</div></div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showToast('🔐 Bientôt!')">
        <span class="asset-icon">🔐</span>
        <div class="asset-info"><div class="asset-name">Sécurité</div></div>
        <span>→</span>
      </div>
      <div class="asset-item" onclick="showToast('🌐 Bientôt!')">
        <span class="asset-icon">🌐</span>
        <div class="asset-info"><div class="asset-name">Réseau</div></div>
        <span>→</span>
      </div>
    </div>
    <p style="text-align: center; margin-top: 24px; color: var(--text-tertiary); font-size: 12px;">
      TAO Wallet v${APP_VERSION}
    </p>
  `);
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
