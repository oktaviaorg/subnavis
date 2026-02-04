#!/usr/bin/env python3
"""
Subnavis Telegram Bot
🧭 Navigate the Bittensor Subnets

Commands:
- /start - Welcome & connect account
- /track <wallet> - Track a wallet
- /portfolio - View your positions
- /whale - Latest whale alerts
- /alerts - Configure alerts
- /help - Help
"""

import os
import json
import asyncio
import logging
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler, filters
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
load_dotenv()

# Import du client TaoStats pour les vraies données
from taostats_api import taostats, format_portfolio, format_whale_alerts

# Config - Charger depuis variables d'environnement
BOT_TOKEN = os.getenv("SUBNAVIS_BOT_TOKEN")
SUPABASE_URL = os.getenv("SUBNAVIS_SUPABASE_URL", "https://srvfbbehmpnvocwodcpq.supabase.co")
SUPABASE_KEY = os.getenv("SUBNAVIS_SUPABASE_KEY")

if not BOT_TOKEN:
    raise ValueError("❌ SUBNAVIS_BOT_TOKEN non défini ! Ajoute-le dans les variables d'environnement.")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# User data storage (in production, use Supabase)
user_wallets = {}  # {telegram_id: [wallet1, wallet2, ...]}
user_alerts = {}   # {telegram_id: {subnet: threshold, ...}}

# ============== HANDLERS ==============

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Welcome message"""
    user = update.effective_user
    
    welcome_text = f"""
🧭 *Welcome to Subnavis, {user.first_name}!*

I'm your Bittensor subnet navigator. I can help you:

📊 *Track wallets* — Monitor your TAO positions
🐋 *Whale alerts* — Get notified on big moves
📈 *Subnet data* — Real-time analytics

*Commands:*
/track `<wallet>` — Add a wallet to track
/portfolio — View your positions
/whale — Latest whale movements
/alerts — Configure your alerts
/pricing — View premium plans

🆓 *Free:* 1 wallet, basic alerts
💎 *Pro:* Unlimited wallets, custom alerts, priority notifications

Start by tracking your wallet! 👇
"""
    
    keyboard = [
        [InlineKeyboardButton("🌐 Open Dashboard", url="https://subnavis.io/dashboard.html")],
        [InlineKeyboardButton("💼 Track Wallet", callback_data="track_wallet")],
        [InlineKeyboardButton("💎 Upgrade to Pro", callback_data="upgrade")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        welcome_text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def track(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Track a wallet"""
    user_id = update.effective_user.id
    
    if not context.args:
        await update.message.reply_text(
            "📍 *Track a Wallet*\n\n"
            "Usage: `/track <wallet_address>`\n\n"
            "Example:\n"
            "`/track 5GxcV1SNdHPzrNGCdETY6QR9jPzZgY6igMjDmWDcEuXoibMY`",
            parse_mode='Markdown'
        )
        return
    
    wallet = context.args[0]
    
    # Validate address format (basic check)
    if not wallet.startswith('5') or len(wallet) < 40:
        await update.message.reply_text("❌ Invalid wallet address. TAO addresses start with '5'.")
        return
    
    # Check if user already tracking (free = 1 wallet)
    if user_id in user_wallets and len(user_wallets[user_id]) >= 1:
        # Check if it's the same wallet
        if wallet in user_wallets[user_id]:
            await update.message.reply_text(f"✅ You're already tracking this wallet!")
            return
        
        # Free user trying to add more
        keyboard = [[InlineKeyboardButton("💎 Upgrade to Pro", callback_data="upgrade")]]
        await update.message.reply_text(
            "⚠️ *Free plan limit reached!*\n\n"
            "You can only track 1 wallet on the free plan.\n"
            "Upgrade to Pro for unlimited wallets! 🚀",
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return
    
    # Add wallet
    if user_id not in user_wallets:
        user_wallets[user_id] = []
    user_wallets[user_id].append(wallet)
    
    # Get wallet info (mock for now)
    await update.message.reply_text(
        f"✅ *Wallet tracked!*\n\n"
        f"📍 `{wallet[:8]}...{wallet[-6:]}`\n\n"
        f"I'll notify you when:\n"
        f"• 🐋 Whales move on your subnets\n"
        f"• 💰 Your balance changes\n"
        f"• ⚠️ Validator issues\n\n"
        f"Use /portfolio to see your positions.",
        parse_mode='Markdown'
    )

async def portfolio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show user's portfolio - VRAIES DONNÉES via TaoStats"""
    user_id = update.effective_user.id
    
    if user_id not in user_wallets or not user_wallets[user_id]:
        await update.message.reply_text(
            "📍 *No wallets tracked yet!*\n\n"
            "Use `/track <wallet>` to add your first wallet.",
            parse_mode='Markdown'
        )
        return
    
    # Envoyer un message "chargement"
    loading_msg = await update.message.reply_text("⏳ Loading portfolio data...")
    
    # Récupérer les VRAIES données via TaoStats API
    wallet = user_wallets[user_id][0]
    portfolio_text = await format_portfolio(wallet)
    
    keyboard = [
        [InlineKeyboardButton("🔄 Refresh", callback_data="refresh_portfolio")],
        [InlineKeyboardButton("🌐 Full Dashboard", url="https://subnavis.io/portfolio.html")]
    ]
    
    # Supprimer le message de chargement et envoyer le résultat
    await loading_msg.delete()
    await update.message.reply_text(
        portfolio_text,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def whale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show latest whale alerts - VRAIES DONNÉES via TaoStats"""
    
    # Envoyer un message "chargement"
    loading_msg = await update.message.reply_text("⏳ Scanning whale activity...")
    
    # Récupérer les VRAIES données
    whale_text = await format_whale_alerts()
    whale_text += "\n\n━━━━━━━━━━━━━━━\n💎 *Pro users* get instant alerts!"
    
    keyboard = [
        [InlineKeyboardButton("🔔 Set Whale Alerts", callback_data="set_alerts")],
        [InlineKeyboardButton("🌐 Live Dashboard", url="https://subnavis.io/dashboard.html")]
    ]
    
    # Supprimer le message de chargement et envoyer le résultat
    await loading_msg.delete()
    await update.message.reply_text(
        whale_text,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def alerts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Configure alerts"""
    
    alerts_text = """
🔔 *Alert Settings*

Configure when you want to be notified:

*Whale Alerts:*
├ 🐋 Large stakes (>100k τ)
├ 📉 Large unstakes (>50k τ)
└ 🔄 Big transfers (>100k τ)

*Portfolio Alerts:*
├ 💰 Balance changes
├ ⚠️ Validator changes
└ 🎁 Rewards received

*Price Alerts:*
├ 📈 TAO price up >5%
└ 📉 TAO price down >5%
"""
    
    keyboard = [
        [
            InlineKeyboardButton("🐋 Whale ON", callback_data="alert_whale_on"),
            InlineKeyboardButton("🐋 Whale OFF", callback_data="alert_whale_off")
        ],
        [
            InlineKeyboardButton("💰 Portfolio ON", callback_data="alert_portfolio_on"),
            InlineKeyboardButton("💰 Portfolio OFF", callback_data="alert_portfolio_off")
        ],
        [InlineKeyboardButton("💎 Custom Alerts (Pro)", callback_data="upgrade")]
    ]
    
    await update.message.reply_text(
        alerts_text,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def pricing(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show pricing"""
    
    pricing_text = """
💎 *Subnavis Pro*

*🆓 Explorer (Free)*
├ 1 wallet tracking
├ Basic whale feed
└ Daily digest

*🧭 Navigator — €15/mo*
├ Unlimited wallets
├ Instant whale alerts
├ Custom thresholds
├ Telegram notifications
└ 90 days history

*🚀 Captain — €39/mo*
├ Everything in Navigator
├ Full API access
├ Webhook integrations
└ Priority support

━━━━━━━━━━━━━━━
🐉 *Pay in TAO = 20% off!*

Navigator: ~0.4 τ/year
Captain: ~1.0 τ/year
"""
    
    keyboard = [
        [InlineKeyboardButton("💳 Subscribe (EUR)", url="https://subnavis.io/pricing.html")],
        [InlineKeyboardButton("🐉 Pay in TAO", callback_data="pay_tao")]
    ]
    
    await update.message.reply_text(
        pricing_text,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Help message"""
    
    help_text = """
🧭 *Subnavis Bot Help*

*Commands:*
/start — Welcome & setup
/track `<wallet>` — Track a wallet
/portfolio — View your positions
/whale — Latest whale alerts
/alerts — Configure notifications
/pricing — View plans
/help — This message

*Quick Links:*
🌐 Dashboard: subnavis.io
📊 Portfolio: subnavis.io/portfolio.html
💰 Pricing: subnavis.io/pricing.html

*Support:*
Questions? Reply here or visit our Discord.
"""
    
    await update.message.reply_text(help_text, parse_mode='Markdown')

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button callbacks"""
    query = update.callback_query
    await query.answer()
    
    if query.data == "track_wallet":
        await query.message.reply_text(
            "📍 *Track a Wallet*\n\n"
            "Send me your TAO wallet address:\n"
            "`/track 5Gxc...`",
            parse_mode='Markdown'
        )
    
    elif query.data == "upgrade":
        await pricing(update, context)
    
    elif query.data == "pay_tao":
        await query.message.reply_text(
            "🐉 *Pay with TAO*\n\n"
            "Send your payment to:\n"
            "`5GxcV1SNdHPzrNGCdETY6QR9jPzZgY6igMjDmWDcEuXoibMY`\n\n"
            "*Navigator (1 year):* 0.4 τ\n"
            "*Captain (1 year):* 1.0 τ\n\n"
            "After sending, reply with your TX hash and we'll activate your account within 24h!\n\n"
            "_Include your Telegram username in the memo if possible._",
            parse_mode='Markdown'
        )
    
    elif query.data == "refresh_portfolio":
        await query.message.reply_text("🔄 Refreshing...")
        # Would fetch fresh data here
    
    elif query.data.startswith("alert_"):
        setting = query.data.replace("alert_", "")
        await query.message.reply_text(f"✅ Alert setting updated: {setting}")
    
    elif query.data == "set_alerts":
        await alerts(update, context)

# ============== MAIN ==============

def main():
    """Run the bot"""
    print("🧭 Starting Subnavis Bot...")
    
    # Create application
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("track", track))
    app.add_handler(CommandHandler("portfolio", portfolio))
    app.add_handler(CommandHandler("whale", whale))
    app.add_handler(CommandHandler("alerts", alerts))
    app.add_handler(CommandHandler("pricing", pricing))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    # Run
    print("✅ Bot is running!")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
