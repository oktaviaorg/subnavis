#!/usr/bin/env python3
"""
Post messages to SubNavis Alerts channel
"""
import asyncio
from telegram import Bot

BOT_TOKEN = "8364153314:AAFcOgQ6Vtpdqkw0znlTtLIjU4YMXpsTTxk"
CHANNEL_USERNAME = "@SubNavisAlerts"

async def post_welcome():
    """Post welcome message to channel"""
    bot = Bot(token=BOT_TOKEN)
    
    welcome = """🧭 *Welcome to SubNavis Alerts!*

Your real-time feed for Bittensor whale movements and subnet analytics.

*What you'll get here:*
🐋 Whale alerts — Large TAO movements
📊 Daily subnet performance recap  
📈 Price alerts on significant moves
💡 Bittensor ecosystem news

*Want more?*
→ Track your own wallet: @bittensorwalletbot
→ Full dashboard: subnavis.io

_Stay tuned for alerts!_ 🚀
"""
    
    await bot.send_message(
        chat_id=CHANNEL_USERNAME,
        text=welcome,
        parse_mode='Markdown'
    )
    print(f"✅ Posted welcome message to {CHANNEL_USERNAME}")

if __name__ == "__main__":
    asyncio.run(post_welcome())
