#!/usr/bin/env python3
"""
Whale Alerts Daemon pour @SubNavisAlerts
Surveille les gros mouvements et poste sur le channel Telegram
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from telegram import Bot
from dotenv import load_dotenv

load_dotenv()

from taostats_api import taostats

# Config
BOT_TOKEN = os.getenv("SUBNAVIS_BOT_TOKEN")
CHANNEL_ID = "@SubNavisAlerts"  # Channel public
CHECK_INTERVAL = 300  # 5 minutes
MIN_WHALE_AMOUNT = 10000  # 10k TAO minimum pour alerter

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Cache pour éviter les doublons
seen_transactions = set()


async def format_whale_alert(whale: dict, price: dict) -> str:
    """Formate une alerte whale pour le channel"""
    
    emoji_map = {
        "add_stake": "🟢",
        "remove_stake": "🔴", 
        "transfer": "🔵",
    }
    
    action_map = {
        "add_stake": "STAKE",
        "remove_stake": "UNSTAKE",
        "transfer": "TRANSFER",
    }
    
    emoji = emoji_map.get(whale["type"], "⚪")
    action = action_map.get(whale["type"], whale["type"].upper())
    amount = whale["amount"]
    usd_value = amount * price["usd"]
    
    subnet_info = f" on SN{whale['subnet']}" if whale.get("subnet") else ""
    
    # Déterminer la taille
    if amount >= 100000:
        size = "🐋🐋🐋 MEGA WHALE"
    elif amount >= 50000:
        size = "🐋🐋 BIG WHALE"
    else:
        size = "🐋 WHALE"
    
    alert = f"""
{emoji} *{size} {action}*{subnet_info}

💰 *{amount:,.0f} τ* (~${usd_value:,.0f})

📊 TAO Price: ${price['usd']:,.2f}
⏰ {datetime.now().strftime('%H:%M UTC')}

#Bittensor #TAO #WhaleAlert
"""
    
    return alert


async def check_and_post_alerts(bot: Bot):
    """Vérifie les nouveaux mouvements whale et poste sur le channel"""
    global seen_transactions
    
    try:
        # Récupérer les données
        whales = await taostats.get_whale_movements(min_amount=MIN_WHALE_AMOUNT)
        price = await taostats.get_tao_price()
        
        if not whales:
            logger.info("No whale movements detected")
            return
        
        for whale in whales:
            # Créer un identifiant unique pour cette transaction
            tx_id = f"{whale['type']}_{whale['amount']}_{whale.get('from', '')}_{whale.get('timestamp', '')}"
            
            if tx_id in seen_transactions:
                continue
            
            # Nouvelle transaction whale !
            logger.info(f"New whale detected: {whale['type']} {whale['amount']} TAO")
            
            # Formater et poster l'alerte
            alert_text = await format_whale_alert(whale, price)
            
            try:
                await bot.send_message(
                    chat_id=CHANNEL_ID,
                    text=alert_text,
                    parse_mode='Markdown'
                )
                logger.info(f"Posted whale alert to {CHANNEL_ID}")
            except Exception as e:
                logger.error(f"Failed to post alert: {e}")
            
            # Marquer comme vue
            seen_transactions.add(tx_id)
            
            # Limiter le cache
            if len(seen_transactions) > 1000:
                seen_transactions = set(list(seen_transactions)[-500:])
            
            # Petit délai entre les messages pour éviter le flood
            await asyncio.sleep(2)
            
    except Exception as e:
        logger.error(f"Error checking whale movements: {e}")


async def main():
    """Boucle principale du daemon"""
    
    if not BOT_TOKEN:
        logger.error("SUBNAVIS_BOT_TOKEN not set!")
        return
    
    bot = Bot(token=BOT_TOKEN)
    
    logger.info(f"🐋 Whale Alerts Daemon started")
    logger.info(f"📢 Channel: {CHANNEL_ID}")
    logger.info(f"⏱️ Check interval: {CHECK_INTERVAL}s")
    logger.info(f"💰 Min amount: {MIN_WHALE_AMOUNT} TAO")
    
    # Message de démarrage sur le channel
    try:
        await bot.send_message(
            chat_id=CHANNEL_ID,
            text="🐋 *Whale Alerts Online*\n\nMonitoring Bittensor for large movements...\n\n_Powered by SubNavis.io_",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.warning(f"Could not send startup message: {e}")
    
    while True:
        await check_and_post_alerts(bot)
        await asyncio.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
