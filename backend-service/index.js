const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const sqlite3 = require('sqlite3').verbose();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

// ==========================================
// CONFIGURATION
// ==========================================
// Configurable numbers the bot can operate on
const BOT_NUMBERS = [process.env.BOT_NUMBER || '7992655467']; 
const DELAY_MS = 30 * 1000; // 30 seconds delay per product requirement
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; 

let genAI = null;
if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is missing. Using Fallback Mock LLM mode!");
} else {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ==========================================
// DB SETUP
// ==========================================
const db = new sqlite3.Database('./ai_consultant.db', (err) => {
    if (err) console.error("DB Connect Error:", err.message);
    else console.log("Connected to SQLite DB successfully.");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mobile TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        role TEXT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

const getOrCreateUser = (mobile) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM users WHERE mobile = ?`, [mobile], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(row.id);
            db.run(`INSERT INTO users (mobile) VALUES (?)`, [mobile], function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
    });
};

const saveMessage = (userId, role, content) => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)`, 
        [userId, role, content], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const getHistory = (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT role, content FROM messages WHERE user_id = ? ORDER BY timestamp ASC LIMIT ?`, 
        [userId, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// ==========================================
// WHATSAPP CLIENT SETUP
// ==========================================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('SCAN THIS QR CODE IN YOUR WHATSAPP TO AUTHENTICATE THE BOT:');
    qrcodeTerminal.generate(qr, { small: true });
    
    // Auto-generate PNG artifact so PM can see it easily in walkthrough
    qrcode.toFile('/Users/vedant/.gemini/antigravity/brain/Project AI Consultant v1/qr-code-to-scan.png', qr, {
        color: { dark: '#000000', light: '#FFFFFF' }
    }, function (err) {
        if (err) throw err;
        console.log('QR Code PNG successfully generated in Artifacts!');
    });
});

client.on('ready', () => {
    console.log('Service B (WhatsApp Bot) is LIVE and ready! Waiting for messages...');
});

// ==========================================
// MESSAGE HANDLER & LLM ORCHESTRATION
// ==========================================
client.on('message_create', async (msg) => {
    if (msg.from === 'status@broadcast' || msg.id.fromMe || msg.isGroupMsg) return;

    try {
        const mobileNum = msg.from.replace('@c.us', '');
        console.log(`[INBOUND] Message from ${mobileNum}: ${msg.body}`);

        const userId = await getOrCreateUser(mobileNum);
        await saveMessage(userId, 'user', msg.body);
        
        console.log(`[QUEUE] Waiting ${DELAY_MS/1000} seconds before replying to ${mobileNum}...`);
        
        setTimeout(async () => {
            try {
                const historyRaw = await getHistory(userId, 6);
                let historyString = historyRaw.map(r => `${r.role === 'user' ? 'User' : 'Assistant'}: ${r.content}`).join('\n');
                
                let replyText = "";

                if (genAI) {
                    console.log(`[LLM] Calling Gemini API for ${mobileNum}...`);
                    const prompt = `You are an empathetic, light-hearted, and funny AI companion. A user from a big city is texting you because they might be feeling lonely. 
Rules:
1. Limit your output strictly to 150 words or less.
2. Keep it conversational, like a real text message string (use emojis occasionally).
3. Do not be overly robotic. Never break character.

Here is the chat history:
${historyString}

Assistant:`;
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const result = await model.generateContent(prompt);
                    replyText = result.response.text().trim();
                } else {
                    console.log(`[MOCK LLM] Falling back to mock generator for ${mobileNum}...`);
                    // Create a funny mock response to test the flow end-to-end
                    const mockReplies = [
                        "Haha, I totally get that! Big cities are noisy outside but can feel weirdly quiet inside. How was your day? 🌆",
                        "Relatable! Wait until you experience Bangalore traffic, doing nothing is suddenly a luxury. 😂 What are you up to?",
                        "Oh for sure! I'm just hanging out in the cloud right now, waiting for the perfect moment to be deeply profound. Need anything?",
                        "Okay but have you tried turning your mood off and on again? Kidding! I'm here for you. What's on your mind? 👾"
                    ];
                    replyText = mockReplies[Math.floor(Math.random() * mockReplies.length)];
                }

                await saveMessage(userId, 'assistant', replyText);
                await msg.reply(replyText);
                console.log(`[OUTBOUND] Replied to ${mobileNum}:`, replyText);

            } catch (llmErr) {
                console.error("[ERROR] Failed to reply:", llmErr);
            }
        }, DELAY_MS);

    } catch (err) {
        console.error("Pipeline Error:", err);
    }
});

client.initialize();
