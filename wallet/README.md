# TAO Wallet PWA

Progressive Web App pour Bittensor - fonctionne sur iPhone ! 📱

## Installation sur iPhone

1. Ouvrir Safari (obligatoire, Chrome iOS ne supporte pas les PWA)
2. Aller sur l'URL de la PWA
3. Tap sur l'icône Partage (carré avec flèche)
4. "Sur l'écran d'accueil"
5. Done! L'app apparaît comme une vraie app

## Fonctionnalités

- ✅ Watch-only : tracker n'importe quelle adresse TAO
- ✅ Balance en temps réel (free + staked)
- ✅ Prix TAO live (CoinGecko)
- ✅ Voir les positions de staking par subnet
- ✅ Fonctionne offline (service worker)
- ✅ Interface native iOS (safe areas, haptics-style)

## Limitations (PWA = watch-only)

- ❌ Pas de création de wallet (sécurité)
- ❌ Pas d'envoi de TAO
- ❌ Pas de signature de transactions

Pour ces features → utiliser l'extension Chrome desktop

## Déployer

```bash
# Local
cd pwa && python3 -m http.server 8888

# Production (Netlify, Vercel, etc.)
# Juste drag & drop le dossier pwa/
```

## Stack

- Vanilla JS (pas de framework = rapide)
- Service Worker pour offline
- LocalStorage pour persistence
- API Subnavis pour les balances
