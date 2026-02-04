/**
 * SubNavis Connect Button Component
 * Bouton de connexion wallet réutilisable
 */

class ConnectButton {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            onConnect: options.onConnect || (() => {}),
            onDisconnect: options.onDisconnect || (() => {}),
            theme: options.theme || 'dark'
        };
        
        this.init();
    }

    async init() {
        // Vérifier si une session existe
        const session = await window.subnavisAuth.restoreSession();
        
        if (session) {
            this.renderConnected(session);
            this.options.onConnect(session);
        } else {
            this.renderDisconnected();
        }
    }

    renderDisconnected() {
        this.container.innerHTML = `
            <button class="sn-connect-btn" onclick="window.snConnectBtn_${this.container.id}.connect()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Connect Wallet</span>
            </button>
        `;
        this.addStyles();
    }

    renderConnected(session) {
        const shortAddr = window.subnavisAuth.shortAddress(session.address);
        this.container.innerHTML = `
            <div class="sn-connected-wrapper">
                <button class="sn-connected-btn" onclick="window.snConnectBtn_${this.container.id}.toggleMenu()">
                    <div class="sn-avatar">${session.name?.[0] || '🧭'}</div>
                    <span class="sn-address">${shortAddr}</span>
                    <svg class="sn-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </button>
                <div class="sn-dropdown" id="sn-dropdown-${this.container.id}">
                    <div class="sn-dropdown-header">
                        <span class="sn-wallet-name">${session.name || 'Wallet'}</span>
                        <span class="sn-full-address">${shortAddr}</span>
                    </div>
                    <div class="sn-dropdown-divider"></div>
                    <a href="/portfolio" class="sn-dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
                        </svg>
                        Portfolio
                    </a>
                    <a href="/wallet-app" class="sn-dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="4" width="20" height="16" rx="2"/>
                            <path d="M12 8v8M8 12h8"/>
                        </svg>
                        Wallet
                    </a>
                    <div class="sn-dropdown-divider"></div>
                    <button class="sn-dropdown-item sn-disconnect" onclick="window.snConnectBtn_${this.container.id}.disconnect()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Disconnect
                    </button>
                </div>
            </div>
        `;
        this.addStyles();
    }

    renderLoading() {
        this.container.innerHTML = `
            <button class="sn-connect-btn sn-loading" disabled>
                <span class="sn-spinner"></span>
                <span>Connecting...</span>
            </button>
        `;
    }

    async connect() {
        this.renderLoading();
        
        const result = await window.subnavisAuth.connect();
        
        if (result.success) {
            this.renderConnected({
                address: result.address,
                name: result.name
            });
            this.options.onConnect(result);
        } else {
            this.renderDisconnected();
            this.showError(result);
        }
    }

    disconnect() {
        window.subnavisAuth.disconnect();
        this.renderDisconnected();
        this.options.onDisconnect();
        this.closeMenu();
    }

    toggleMenu() {
        const dropdown = document.getElementById(`sn-dropdown-${this.container.id}`);
        dropdown.classList.toggle('show');
        
        // Fermer au clic extérieur
        if (dropdown.classList.contains('show')) {
            setTimeout(() => {
                document.addEventListener('click', this.handleOutsideClick);
            }, 0);
        }
    }

    closeMenu() {
        const dropdown = document.getElementById(`sn-dropdown-${this.container.id}`);
        if (dropdown) dropdown.classList.remove('show');
        document.removeEventListener('click', this.handleOutsideClick);
    }

    handleOutsideClick = (e) => {
        if (!this.container.contains(e.target)) {
            this.closeMenu();
        }
    }

    showError(result) {
        let message = result.message;
        let action = null;

        if (result.error === 'NO_EXTENSION') {
            action = {
                text: 'Install Extension',
                url: 'https://polkadot.js.org/extension/'
            };
        }

        // Créer une notification
        const notification = document.createElement('div');
        notification.className = 'sn-notification sn-error';
        notification.innerHTML = `
            <p>${message}</p>
            ${action ? `<a href="${action.url}" target="_blank">${action.text}</a>` : ''}
            <button onclick="this.parentElement.remove()">×</button>
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 5000);
    }

    addStyles() {
        if (document.getElementById('sn-connect-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'sn-connect-styles';
        styles.textContent = `
            .sn-connect-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: linear-gradient(135deg, #ab9ff2 0%, #818cf8 100%);
                color: #09090b;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-family: 'Inter', sans-serif;
            }
            .sn-connect-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(171, 159, 242, 0.3);
            }
            .sn-connect-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                transform: none;
            }
            .sn-connect-btn.sn-loading {
                background: #27272a;
                color: #a1a1aa;
            }
            .sn-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid transparent;
                border-top-color: currentColor;
                border-radius: 50%;
                animation: sn-spin 0.8s linear infinite;
            }
            @keyframes sn-spin {
                to { transform: rotate(360deg); }
            }

            .sn-connected-wrapper {
                position: relative;
            }
            .sn-connected-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 16px;
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 12px;
                color: #fafafa;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-family: 'Inter', sans-serif;
            }
            .sn-connected-btn:hover {
                border-color: #ab9ff2;
                background: #1f1f23;
            }
            .sn-avatar {
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #ab9ff2 0%, #818cf8 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: 600;
                color: #09090b;
            }
            .sn-address {
                font-family: 'Space Mono', monospace;
                font-size: 13px;
            }
            .sn-chevron {
                opacity: 0.5;
                transition: transform 0.2s;
            }
            .sn-connected-wrapper:has(.sn-dropdown.show) .sn-chevron {
                transform: rotate(180deg);
            }

            .sn-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                min-width: 200px;
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 12px;
                padding: 8px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s;
                z-index: 1000;
            }
            .sn-dropdown.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            .sn-dropdown-header {
                padding: 12px;
                text-align: center;
            }
            .sn-wallet-name {
                display: block;
                font-weight: 600;
                margin-bottom: 4px;
            }
            .sn-full-address {
                font-family: 'Space Mono', monospace;
                font-size: 12px;
                color: #71717a;
            }
            .sn-dropdown-divider {
                height: 1px;
                background: #27272a;
                margin: 4px 0;
            }
            .sn-dropdown-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                color: #a1a1aa;
                text-decoration: none;
                border-radius: 8px;
                font-size: 14px;
                transition: all 0.15s;
                border: none;
                background: none;
                width: 100%;
                cursor: pointer;
                font-family: 'Inter', sans-serif;
            }
            .sn-dropdown-item:hover {
                background: #27272a;
                color: #fafafa;
            }
            .sn-disconnect:hover {
                color: #ef4444;
            }

            .sn-notification {
                position: fixed;
                bottom: 24px;
                right: 24px;
                padding: 16px 20px;
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 14px;
                z-index: 9999;
                animation: sn-slideIn 0.3s ease;
            }
            .sn-notification.sn-error {
                border-color: #ef4444;
            }
            .sn-notification a {
                color: #ab9ff2;
                text-decoration: none;
            }
            .sn-notification button {
                background: none;
                border: none;
                color: #71717a;
                font-size: 18px;
                cursor: pointer;
                padding: 0 0 0 8px;
            }
            @keyframes sn-slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Factory function
window.createConnectButton = function(containerId, options) {
    window[`snConnectBtn_${containerId}`] = new ConnectButton(containerId, options);
    return window[`snConnectBtn_${containerId}`];
};
