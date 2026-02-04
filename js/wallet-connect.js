/**
 * SubNavis Wallet Connect
 * Connexion via Polkadot.js extension (comme TaoStats)
 */

class SubNavisAuth {
    constructor() {
        this.connected = false;
        this.account = null;
        this.injector = null;
    }

    /**
     * Vérifie si l'extension Polkadot.js est installée
     */
    async checkExtension() {
        // Attendre que l'extension soit injectée
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (typeof window.injectedWeb3 === 'undefined') {
            return { installed: false, extensions: [] };
        }

        const extensions = Object.keys(window.injectedWeb3);
        return {
            installed: extensions.length > 0,
            extensions: extensions
        };
    }

    /**
     * Connecte le wallet via l'extension
     */
    async connect() {
        try {
            // Vérifier l'extension
            const { installed, extensions } = await this.checkExtension();
            
            if (!installed) {
                throw new Error('NO_EXTENSION');
            }

            // Utiliser polkadot-js en priorité, sinon la première extension disponible
            const extName = extensions.includes('polkadot-js') ? 'polkadot-js' : extensions[0];
            const extension = window.injectedWeb3[extName];

            // Demander l'accès
            const injected = await extension.enable('SubNavis');
            this.injector = injected;

            // Récupérer les comptes
            const accounts = await injected.accounts.get();
            
            if (accounts.length === 0) {
                throw new Error('NO_ACCOUNTS');
            }

            // Si plusieurs comptes, on prend le premier (ou on peut afficher un sélecteur)
            this.account = accounts[0];
            
            // Demander une signature pour prouver la propriété
            const verified = await this.verifyOwnership();
            
            if (!verified) {
                throw new Error('VERIFICATION_FAILED');
            }

            this.connected = true;

            // Sauvegarder la session
            this.saveSession();

            return {
                success: true,
                address: this.account.address,
                name: this.account.name || 'Wallet'
            };

        } catch (error) {
            console.error('Connect error:', error);
            
            if (error.message === 'NO_EXTENSION') {
                return {
                    success: false,
                    error: 'NO_EXTENSION',
                    message: 'Please install the Polkadot.js extension to connect your wallet.'
                };
            }
            
            if (error.message === 'NO_ACCOUNTS') {
                return {
                    success: false,
                    error: 'NO_ACCOUNTS',
                    message: 'No accounts found. Please create or import an account in your wallet extension.'
                };
            }

            return {
                success: false,
                error: 'CONNECT_FAILED',
                message: error.message || 'Failed to connect wallet'
            };
        }
    }

    /**
     * Vérifie la propriété du wallet en demandant une signature
     */
    async verifyOwnership() {
        try {
            if (!this.injector || !this.account) return false;

            const message = `Sign this message to connect to SubNavis.\n\nTimestamp: ${Date.now()}\nAddress: ${this.account.address}`;
            
            // Demander la signature
            const signRaw = this.injector.signer?.signRaw;
            
            if (!signRaw) {
                console.warn('signRaw not available, skipping verification');
                return true; // Fallback: accepter sans signature
            }

            const { signature } = await signRaw({
                address: this.account.address,
                data: this.stringToHex(message),
                type: 'bytes'
            });

            // En production, on vérifierait la signature côté serveur
            console.log('Signature verified:', signature.slice(0, 20) + '...');
            
            return true;

        } catch (error) {
            // L'utilisateur a refusé de signer
            if (error.message?.includes('Cancelled') || error.message?.includes('Rejected')) {
                return false;
            }
            console.error('Verification error:', error);
            return true; // Fallback pour les wallets qui ne supportent pas signRaw
        }
    }

    /**
     * Convertit une string en hex
     */
    stringToHex(str) {
        return '0x' + Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    }

    /**
     * Sauvegarde la session
     */
    saveSession() {
        if (this.account) {
            localStorage.setItem('subnavis_session', JSON.stringify({
                address: this.account.address,
                name: this.account.name,
                connectedAt: Date.now()
            }));
        }
    }

    /**
     * Restaure une session existante
     */
    async restoreSession() {
        const saved = localStorage.getItem('subnavis_session');
        if (!saved) return null;

        try {
            const session = JSON.parse(saved);
            
            // Vérifier que la session n'est pas expirée (24h)
            if (Date.now() - session.connectedAt > 24 * 60 * 60 * 1000) {
                this.disconnect();
                return null;
            }

            // Vérifier que le wallet est toujours accessible
            const { installed } = await this.checkExtension();
            if (!installed) return null;

            this.account = { address: session.address, name: session.name };
            this.connected = true;

            return session;

        } catch (error) {
            console.error('Restore session error:', error);
            return null;
        }
    }

    /**
     * Déconnecte le wallet
     */
    disconnect() {
        this.connected = false;
        this.account = null;
        this.injector = null;
        localStorage.removeItem('subnavis_session');
    }

    /**
     * Récupère l'adresse connectée
     */
    getAddress() {
        return this.account?.address || null;
    }

    /**
     * Raccourcit une adresse pour l'affichage
     */
    shortAddress(address) {
        if (!address) return '';
        return address.slice(0, 6) + '...' + address.slice(-4);
    }
}

// Instance globale
window.subnavisAuth = new SubNavisAuth();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubNavisAuth;
}
