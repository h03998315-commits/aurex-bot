const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const PORT = process.env.PORT || 5000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Safety check
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing");
  process.exit(1);
}

// Telegram bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    "🟡 Welcome to AUREX\n\n💰 Daily rewards coming soon\n🔐 Withdrawals unlock after streak\n\nStay tuned 🚀"
  );
});

// Express server (required for Replit)
app.get("/", (_req, res) => {
  res.send("AUREX server is running");
});

app.listen(PORT, () => {
  console.log(`🚀 AUREX running on port ${PORT}`);
});
