const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initDb(app) {
    // Determine the AppData path
    const userDataPath = app.getPath('userData'); // e.g. C:\Users\<user>\AppData\Roaming\dict_app
    const dbPath = path.join(userDataPath, 'main.sqlite');
    
    // Ensure the directory exists (Electron's getPath('userData') usually creates it, but to be strictly safe)
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }

    // Initialize the DB
    // WAL mode allows concurrent readers and writers, heavily reducing SQLite locking issues
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create schema
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT,
            icon TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT UNIQUE NOT NULL,
            translation TEXT,
            phonetic TEXT,
            mastery_level INTEGER DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            next_review_time DATETIME,
            is_sync BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            category_id INTEGER,
            image_path TEXT,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS review_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_id INTEGER,
            score INTEGER,
            mastery_before INTEGER,
            mastery_after INTEGER,
            review_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
        );
    `);

    // Dynamic schema migration for existing databases
    try {
        const tableInfo = db.prepare("PRAGMA table_info(words)").all();
        const hasImagePath = tableInfo.some(col => col.name === 'image_path');
        if (!hasImagePath) {
            db.exec("ALTER TABLE words ADD COLUMN image_path TEXT;");
            console.log("Database schema migrated: added image_path column to words table");
        }
    } catch (e) {
        console.error("Database migration check failed:", e);
    }

    // Create secondary indexes for high-frequency review queue & analytics queries
    try {
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_words_review_queue ON words(mastery_level, next_review_time);
            CREATE INDEX IF NOT EXISTS idx_words_updated_at ON words(updated_at);
            CREATE INDEX IF NOT EXISTS idx_review_logs_review_time ON review_logs(review_time);
            CREATE INDEX IF NOT EXISTS idx_review_logs_word_id ON review_logs(word_id);
        `);
    } catch (e) {
        console.error("Database index creation failed:", e);
    }

    console.log(`Database initialized at: ${dbPath}`);
    return db;
}

module.exports = { initDb };
