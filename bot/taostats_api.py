#!/usr/bin/env python3
"""
TaoStats API Client pour Subnavis Bot
Récupère les vraies données Bittensor
"""

import os
import aiohttp
import asyncio
from typing import Optional, Dict, List
from datetime import datetime

# Config
TAOSTATS_API_KEY = os.getenv("TAOSTATS_API_KEY", "")
TAOSTATS_BASE_URL = "https://api.taostats.io/api"
COINGECKO_URL = "https://api.coingecko.com/api/v3"

class TaoStatsClient:
    """Client async pour l'API TaoStats"""
    
    def __init__(self):
        self.api_key = TAOSTATS_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
            "Content-Type": "application/json"
        }
    
    async def _get(self, endpoint: str, params: dict = None) -> Optional[dict]:
        """Requête GET générique"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{TAOSTATS_BASE_URL}{endpoint}"
                async with session.get(url, headers=self.headers, params=params) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    else:
                        print(f"TaoStats API error: {resp.status}")
                        return None
        except Exception as e:
            print(f"TaoStats API exception: {e}")
            return None
    
    async def get_tao_price(self) -> dict:
        """Récupère le prix TAO via CoinGecko"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{COINGECKO_URL}/simple/price?ids=bittensor&vs_currencies=usd,eur&include_24hr_change=true"
                async with session.get(url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return {
                            "usd": data.get("bittensor", {}).get("usd", 0),
                            "eur": data.get("bittensor", {}).get("eur", 0),
                            "change_24h": data.get("bittensor", {}).get("usd_24h_change", 0)
                        }
        except Exception as e:
            print(f"CoinGecko error: {e}")
        return {"usd": 0, "eur": 0, "change_24h": 0}
    
    async def get_wallet_balance(self, address: str) -> Optional[dict]:
        """Récupère le solde d'un wallet"""
        data = await self._get(f"/v1/balance/latest", {"address": address})
        if data and "data" in data:
            balance_data = data["data"]
            if isinstance(balance_data, list) and len(balance_data) > 0:
                b = balance_data[0]
                return {
                    "address": address,
                    "balance": float(b.get("balance", 0)) / 1e9,  # Convert from rao
                    "stake": float(b.get("stake", 0)) / 1e9,
                    "free": float(b.get("free", 0)) / 1e9,
                }
        return None
    
    async def get_wallet_stakes(self, address: str) -> List[dict]:
        """Récupère les stakes d'un wallet par subnet"""
        data = await self._get(f"/v1/stake/latest", {"address": address})
        stakes = []
        if data and "data" in data:
            for s in data.get("data", []):
                stakes.append({
                    "subnet_id": s.get("netuid"),
                    "hotkey": s.get("hotkey"),
                    "stake": float(s.get("stake", 0)) / 1e9,
                })
        return stakes
    
    async def get_subnets(self, limit: int = 20) -> List[dict]:
        """Récupère la liste des subnets"""
        data = await self._get("/v1/subnet/latest", {"limit": limit})
        subnets = []
        if data and "data" in data:
            for s in data.get("data", []):
                subnets.append({
                    "netuid": s.get("netuid"),
                    "name": s.get("name", f"SN{s.get('netuid')}"),
                    "emission": float(s.get("emission", 0)),
                    "tempo": s.get("tempo"),
                    "owner": s.get("owner"),
                })
        return subnets
    
    async def get_subnet_detail(self, netuid: int) -> Optional[dict]:
        """Récupère les détails d'un subnet"""
        data = await self._get(f"/v1/subnet/latest", {"netuid": netuid})
        if data and "data" in data:
            subnets = data.get("data", [])
            if subnets:
                s = subnets[0]
                return {
                    "netuid": s.get("netuid"),
                    "name": s.get("name", f"SN{netuid}"),
                    "emission": float(s.get("emission", 0)),
                    "tempo": s.get("tempo"),
                    "owner": s.get("owner"),
                    "miners": s.get("n", 0),
                    "max_n": s.get("max_n", 256),
                }
        return None
    
    async def get_whale_movements(self, min_amount: float = 10000) -> List[dict]:
        """Récupère les derniers gros mouvements (whale alerts)"""
        # Note: TaoStats n'a pas d'endpoint whale direct, on utilise les transfers
        data = await self._get("/v1/extrinsic/latest", {
            "module": "subtensorModule",
            "limit": 50
        })
        
        whales = []
        if data and "data" in data:
            for tx in data.get("data", []):
                amount = float(tx.get("amount", 0)) / 1e9
                if amount >= min_amount:
                    whales.append({
                        "type": tx.get("call", "transfer"),
                        "amount": amount,
                        "from": tx.get("from", "")[:8] + "...",
                        "to": tx.get("to", "")[:8] + "..." if tx.get("to") else "",
                        "timestamp": tx.get("block_timestamp"),
                        "subnet": tx.get("netuid"),
                    })
        return whales[:10]  # Top 10


# Instance globale
taostats = TaoStatsClient()


async def format_portfolio(address: str) -> str:
    """Formate un portfolio complet pour affichage Telegram"""
    
    # Récupérer les données
    balance = await taostats.get_wallet_balance(address)
    stakes = await taostats.get_wallet_stakes(address)
    price = await taostats.get_tao_price()
    
    if not balance:
        return f"❌ Impossible de récupérer les données pour `{address[:8]}...`"
    
    total_tao = balance["balance"]
    total_usd = total_tao * price["usd"]
    staked_tao = balance["stake"]
    free_tao = balance["free"]
    
    text = f"""
💼 *Your Portfolio*

📍 Wallet: `{address[:8]}...{address[-6:]}`

━━━━━━━━━━━━━━━
💰 *Total Balance:* {total_tao:.2f} τ (~${total_usd:,.0f})
📊 *Staked:* {staked_tao:.2f} τ ({(staked_tao/total_tao*100) if total_tao > 0 else 0:.0f}%)
🆓 *Free:* {free_tao:.2f} τ
━━━━━━━━━━━━━━━

📈 *Positions:*
"""
    
    # Ajouter les stakes par subnet
    if stakes:
        for s in stakes[:5]:  # Top 5
            text += f"""
*SN{s['subnet_id']}*
├ Staked: {s['stake']:.2f} τ
└ Value: ${s['stake'] * price['usd']:,.0f}
"""
    else:
        text += "\n_No active stakes_\n"
    
    text += f"""
━━━━━━━━━━━━━━━
_TAO: ${price['usd']:,.2f} ({price['change_24h']:+.1f}% 24h)_
_Updated: {datetime.now().strftime('%H:%M UTC')}_
"""
    
    return text


async def format_whale_alerts() -> str:
    """Formate les alertes whale pour affichage Telegram"""
    
    whales = await taostats.get_whale_movements(min_amount=10000)
    price = await taostats.get_tao_price()
    
    if not whales:
        return "🐋 *No major whale activity detected recently*"
    
    text = "🐋 *Latest Whale Activity*\n\n"
    
    emoji_map = {
        "add_stake": "🟢 *Stake*",
        "remove_stake": "🔴 *Unstake*",
        "transfer": "🔵 *Transfer*",
    }
    
    for w in whales[:5]:
        action = emoji_map.get(w["type"], f"⚪ *{w['type']}*")
        subnet_info = f" on SN{w['subnet']}" if w.get("subnet") else ""
        usd_value = w["amount"] * price["usd"]
        
        text += f"""{action}{subnet_info}
└ {w['amount']:,.0f} τ (~${usd_value:,.0f})

"""
    
    text += f"_TAO: ${price['usd']:,.2f}_"
    
    return text
