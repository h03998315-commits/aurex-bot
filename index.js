import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fs from "fs";
import QRCode from "qrcode";

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 6240677007;

const UPI_ID = "aurex.xxpgn-332@ptyes";
const UPI_NAME = "AUREX Official";

const CHANNELS = [
  "https://t.me/AUREXISOFFICIAL",
  "https://t.me/+ntc62LlmpYZiMjg9"
];

const DAILY_REWARD = 5;
const REFERRAL_REWARD = 5;
const WITHDRAW_STREAK = 7;
const MIN_WITHDRAW = 100;
const DAILY_REDEEM_LIMIT = 5;

const USERS_FILE = "./users.json";
const COUPON_FILE = "./coupons.json";

// ================= SERVER =================
const app = express();
app.get("/", (_, res) => res.send("AUREX running 🚀"));
app.listen(process.env.PORT || 5000);

// ================= BOT =================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ================= DB =================
const load = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

const today = () => new Date().toISOString().split("T")[0];

async function checkJoin(uid) {
  for (const c of CHANNELS) {
    try {
      const chat = c.split("/").pop();
      const m = await bot.getChatMember(chat, uid);
      if (m.status === "left") return false;
    } catch {
      return false;
    }
  }
  return true;
}

// ================= MENUS =================
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "💰 Balance", callback_data: "balance" }],
      [{ text: "🎁 Daily Reward", callback_data: "daily" }],
      [{ text: "👥 Refer", callback_data: "refer" }],
      [{ text: "🛒 Shop", callback_data: "shop" }],
      [{ text: "📤 Withdraw", callback_data: "withdraw" }]
    ]
  }
};

const joinMenu = {
  reply_markup: {
    inline_keyboard: [
      CHANNELS.map((c, i) => ({
        text: `Join ${i + 1}`,
        url: c
      })),
      [{ text: "✅ Verify", callback_data: "verify" }]
    ]
  }
};

const adminMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "👥 Users", callback_data: "admin_users" }],
      [{ text: "📢 Broadcast", callback_data: "admin_broadcast" }],
      [{ text: "🎟️ Add Coupon", callback_data: "admin_coupon" }]
    ]
  }
};

// ================= START =================
bot.onText(/\/start(.*)/, async (msg, match) => {
  const uid = msg.from.id;
  const users = load(USERS_FILE);

  if (!(await checkJoin(uid)))
    return bot.sendMessage(uid, "🚫 Join required", joinMenu);

  if (!users[uid]) {
    users[uid] = {
      balance: 0,
      streak: 0,
      lastClaim: null,
      refBy: null,
      redeemsToday: 0
    };

    if (match[1]) {
      const ref = match[1].trim();
      if (users[ref] && ref !== String(uid)) {
        users[uid].refBy = ref;
        users[ref].balance += REFERRAL_REWARD;
      }
    }
    save(USERS_FILE, users);
  }

  bot.sendMessage(
    uid,
    `🟡 *Welcome to AUREX*\n\n💰 ${users[uid].balance} AUREX\n🔥 Streak: ${users[uid].streak}`,
    { parse_mode: "Markdown", ...mainMenu }
  );
});

// ================= CALLBACKS =================
bot.on("callback_query", async (q) => {
  const uid = q.from.id;
  const users = load(USERS_FILE);
  const user = users[uid];
  if (!user) return;

  if (!(await checkJoin(uid)))
    return bot.answerCallbackQuery(q.id, {
      text: "❌ Join channels again",
      show_alert: true
    });

  if (q.data === "verify")
    return bot.sendMessage(uid, "✅ Verified", mainMenu);

  if (q.data === "balance")
    return bot.answerCallbackQuery(q.id, {
      text: `💰 ${user.balance} AUREX\n🔥 ${user.streak} days`,
      show_alert: true
    });

  if (q.data === "daily") {
    const t = today();
    if (user.lastClaim === t)
      return bot.answerCallbackQuery(q.id, {
        text: "⏳ Already claimed",
        show_alert: true
      });

    user.streak =
      user.lastClaim &&
      (new Date(t) - new Date(user.lastClaim)) / 86400000 === 1
        ? user.streak + 1
        : 1;

    user.lastClaim = t;
    user.balance += DAILY_REWARD;
    save(USERS_FILE, users);

    return bot.answerCallbackQuery(q.id, {
      text: `🎉 +${DAILY_REWARD} AUREX`,
      show_alert: true
    });
  }

  if (q.data === "refer") {
    return bot.sendMessage(
      uid,
      `👥 *Refer & Earn*\n\nEach referral = ${REFERRAL_REWARD} AUREX\n\nhttps://t.me/${(await bot.getMe()).username}?start=${uid}`,
      { parse_mode: "Markdown" }
    );
  }

  if (q.data === "withdraw") {
    if (user.streak < WITHDRAW_STREAK || user.balance < MIN_WITHDRAW)
      return bot.answerCallbackQuery(q.id, {
        text: "🔒 Withdraw locked",
        show_alert: true
      });

    const qr = await QRCode.toDataURL(`upi://pay?pa=${UPI_ID}&pn=${UPI_NAME}`);
    await bot.sendPhoto(uid, qr, {
      caption: `Pay via UPI\n${UPI_ID}\n\nSend UTR after payment`
    });
    return;
  }

  if (q.data === "shop") {
    const shop = load(COUPON_FILE).available;
    return bot.sendMessage(
      uid,
      "🛒 *Shop*\n\n" +
        shop
          .map(
            (i) =>
              `${i.active ? "✅" : "⏳"} ${i.name} - ${
                i.active ? i.cost + " AUREX" : "Coming Soon"
              }`
          )
          .join("\n"),
      { parse_mode: "Markdown" }
    );
  }
});

// ================= ADMIN =================
bot.onText(/\/admin/, (msg) => {
  if (msg.from.id === ADMIN_ID)
    bot.sendMessage(msg.chat.id, "🛠 Admin Panel", adminMenu);
});
