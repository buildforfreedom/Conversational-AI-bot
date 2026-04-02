/**
 * ==============================================================
 * ECHO CARE AI: CLOUD-NATIVE BEHAVIORAL ENGINE
 * ==============================================================
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Data Layer: Connects to a scalable PostgreSQL cloud instance if 
 *    `DATABASE_URL` is provided. Automatically degrades to local SQLite if omitted.
 * 2. Ingress Layer: Runs a headless `whatsapp-web.js` Node tuned specifically 
 *    with aggressive memory constraints (0 GPU, No Sandbox) to prevent RAM crashes 
 *    on free-tier cloud containers (Render, Railway).
 * 3. Intelligence Layer: Fetches contextual memory from PG/SQLite, merges it 
 *    with `persona.txt` constraints, and hits the Google Gemini Endpoint.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// ENVIRONMENT & TUNING CONFIGURATION
const DELAY_MS = 500; // Simulates human "typing..." latency naturally
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; 
const DATABASE_URL = process.env.DATABASE_URL || ''; 

// ==========================================
// 1. INTELLIGENCE ENGINE MOUNTING
// ==========================================
let genAI = null;
if (!GEMINI_API_KEY) {
    console.warn("[WARN] GEMINI_API_KEY is missing. Operating on Fallback Logic.");
} else {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ==========================================
// 2. DYNAMIC DATABASE CHASSIS (PG OR SQLITE)
// ==========================================
let dbMode = DATABASE_URL ? 'POSTGRES' : 'SQLITE';
let pgPool = null;
let sqliteDb = null;

const initDatabase = async () => {
    if (dbMode === 'POSTGRES') {
        console.log("[DB] Mounting to Cloud PostgreSQL Server...");
        pgPool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
        // Generate remote tables
        await pgPool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, mobile TEXT UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pgPool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), role TEXT, content TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    } else {
        console.log("[DB] Cloud URL missing. Degrading gracefully to Local SQLite.");
        sqliteDb = new sqlite3.Database('./ai_consultant.db');
        sqliteDb.serialize(() => {
            sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, mobile TEXT UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            sqliteDb.run(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, role TEXT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))`);
        });
    }
};

const getOrCreateUser = async (mobile) => {
    if (dbMode === 'POSTGRES') {
        const res = await pgPool.query('SELECT id FROM users WHERE mobile = $1', [mobile]);
        if (res.rows.length > 0) return res.rows[0].id;
        const insert = await pgPool.query('INSERT INTO users (mobile) VALUES ($1) RETURNING id', [mobile]);
        return insert.rows[0].id;
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb.get(`SELECT id FROM users WHERE mobile = ?`, [mobile], (err, row) => {
                if (err) return reject(err);
                if (row) return resolve(row.id);
                sqliteDb.run(`INSERT INTO users (mobile) VALUES (?)`, [mobile], function(err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                });
            });
        });
    }
};

const saveMessage = async (userId, role, content) => {
    if (dbMode === 'POSTGRES') {
        await pgPool.query('INSERT INTO messages (user_id, role, content) VALUES ($1, $2, $3)', [userId, role, content]);
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb.run(`INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)`, [userId, role, content], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    }
};

const getHistory = async (userId, limit = 6) => {
    if (dbMode === 'POSTGRES') {
        const res = await pgPool.query('SELECT role, content FROM messages WHERE user_id = $1 ORDER BY timestamp ASC LIMIT $2', [userId, limit]);
        return res.rows;
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb.all(`SELECT role, content FROM messages WHERE user_id = ? ORDER BY timestamp ASC LIMIT ?`, [userId, limit], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }
};

// ==========================================
// 3. SECURE PERSONA INJECTION
// ==========================================
let personaRules = "You are an AI therapist. Validate feelings and ask extremely brief questions.";
try {
    // Read the remote configuration layer without blocking runtime
    personaRules = fs.readFileSync('backend-service/persona.txt', 'utf8');
} catch (e) {
    console.warn("[WARN] Cloud Persona configuration missing. Using local defaults.");
}

// ==========================================
// 4. LOW-LATENCY INGRESS DAEMON (PUPPETEER)
// ==========================================
// Heavily optimized launch arguments to prevent RAM overflows on free Containers (Render)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas', 
            '--no-first-run', 
            '--no-zygote', 
            '--single-process', 
            '--disable-gpu',
            '--memory-pressure-off'
        ]
    }
});

client.on('qr', (qr) => {
    // Output terminal QR. (Must view Cloud Console logs exactly once upon remote deploy to scan)
    qrcode.generate(qr, { small: true }); require("qrcode").toFile("../qr-code-to-scan.png", qr, {color: {dark: "#000000", light: "#FFFFFF"}});
    console.log("[SYSTEM] Pending initial auth link. Scan QR in Cloud Console.");
});

client.on('ready', () => {
    console.log('\n======================================================');
    console.log('✅ AI Cloud Engine is ONLINE & CONNECTED');
    console.log('======================================================\n');
});

// ==========================================
// 5. THE SYNCHRONOUS ROUTING PIPELINE
// ==========================================
client.on('message', async (msg) => {
    // Drop system messages or group blasts
    if (msg.from === 'status@broadcast' || msg.id.fromMe || msg.isGroupMsg) return;

    try {
        const mobileNum = msg.from.replace('@c.us', '');
        console.log(`[INBOUND]: "${msg.body}" | FROM: [REDACTED]`);

        // Capture memory footprints securely into selected DB interface
        const userId = await getOrCreateUser(mobileNum);
        await saveMessage(userId, 'user', msg.body);
        
        // Asynchronous non-blocking reaction queue to simulate humans
        setTimeout(async () => {
            try {
                const historyRaw = await getHistory(userId, 6);
                let historyString = historyRaw.map(r => `${r.role === 'user' ? 'Client' : 'Therapist'}: ${r.content}`).join('\n');
                let replyText = "";

                if (genAI) {
                    const prompt = `${personaRules}\n\nHere is the immediate chat history:\n${historyString}\n\nTherapist Reply:`;
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const result = await model.generateContent(prompt);
                    replyText = result.response.text().trim();
                } else {
                    const fallback = [
                        "I hear you. The city can feel incredibly isolating despite being so full. How long have you been feeling this way?",
                        "That sounds difficult to navigate on your own. I'm here to listen. What's the hardest part for you today?"
                    ];
                    replyText = fallback[Math.floor(Math.random() * fallback.length)];
                }

                await saveMessage(userId, 'assistant', replyText);
                await msg.reply(replyText);
                console.log(`[OUTBOUND]: <Sent Payload> | TO: [REDACTED]`);

            } catch (llmErr) {
                console.error("[CRITICAL] Language Model Pipeline failure:", llmErr.message);
            }
        }, DELAY_MS);

    } catch (err) {
        console.error("[CRITICAL] Ingress Error:", err.message);
    }
});

// Boot the sequence dynamically
initDatabase().then(() => {
    client.initialize();
});
