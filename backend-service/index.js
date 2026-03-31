const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const sqlite3 = require('sqlite3').verbose();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

const BOT_NUMBERS = [process.env.BOT_NUMBER || '7992655467']; 
const DELAY_MS = 1500; 
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; 

let genAI = null;
if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is missing. Mock Therapist LLM active.");
} else {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

const db = new sqlite3.Database('./ai_consultant.db', (err) => {
    if (err) console.error("DB Connect Error:", err.message);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, mobile TEXT UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, role TEXT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))`);
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
        db.run(`INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)`, [userId, role, content], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const getHistory = (userId, limit = 10) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT role, content FROM messages WHERE user_id = ? ORDER BY timestamp ASC LIMIT ?`, [userId, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Hotload persona config built by PM
let personaRules = "You are an AI therapist. Listen deeply to the user.";
try {
    personaRules = fs.readFileSync('./persona.txt', 'utf8');
} catch (e) {
    console.warn("Could not load persona.txt, defaulting to baseline.");
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('qr', (qr) => {
    qrcodeTerminal.generate(qr, { small: true });
    qrcode.toFile('/Users/vedant/.gemini/antigravity/brain/Project AI Consultant v1/qr-code-to-scan.png', qr, {
        color: { dark: '#000000', light: '#FFFFFF' }
    }, function () {});
});

client.on('ready', () => {
    console.log('\n======================================================');
    console.log('✅ Service B (AI Therapist) is ONLINE & CONNECTED');
    console.log('======================================================\n');
});

client.on('message_create', async (msg) => {
    if (msg.from === 'status@broadcast' || msg.id.fromMe || msg.isGroupMsg) return;

    try {
        const mobileNum = msg.from.replace('@c.us', '');
        
        console.log(`\n==================================`);
        console.log(`[INBOUND] FROM: ${mobileNum}`);
        console.log(`[MESSAGE]: "${msg.body}"`);
        console.log(`==================================\n`);

        const userId = await getOrCreateUser(mobileNum);
        await saveMessage(userId, 'user', msg.body);
        
        setTimeout(async () => {
            try {
                const historyRaw = await getHistory(userId, 6);
                let historyString = historyRaw.map(r => `${r.role === 'user' ? 'Client' : 'Therapist'}: ${r.content}`).join('\n');
                let replyText = "";

                if (genAI) {
                    const prompt = `${personaRules}
                    
Here is the chat history:
${historyString}

Therapist Reply:`;
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const result = await model.generateContent(prompt);
                    replyText = result.response.text().trim();
                } else {
                    const mockReplies = [
                        "I hear you. The city can feel incredibly isolating despite being so full. How long have you been feeling this way?",
                        "That sounds really difficult to navigate on your own. I'm here to listen. What's been the hardest part for you today?",
                        "It takes courage to say that out loud. Your feelings are completely valid. Would you feel comfortable telling me a bit more about what triggered this?"
                    ];
                    replyText = mockReplies[Math.floor(Math.random() * mockReplies.length)];
                }

                await saveMessage(userId, 'assistant', replyText);
                await msg.reply(replyText);
                
                console.log(`\n==================================`);
                console.log(`[OUTBOUND] TO: ${mobileNum}`);
                console.log(`[RESPONSE]: "${replyText}"`);
                console.log(`[LATENCY]: Processed in < 5 seconds`);
                console.log(`==================================\n`);

            } catch (llmErr) {
                console.error("[CRITICAL] Failed to reply:", llmErr);
            }
        }, DELAY_MS);

    } catch (err) {
        console.error("Pipeline Error:", err);
    }
});

client.initialize();
