const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');
const Database = require('better-sqlite3');
const { initDb } = require('../utils/db');

async function runVerification() {
    console.log('--- Starting Database & Screenshot Schema Verification ---');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumina-verify-'));

    try {
        const mockApp = {
            getPath: () => tempDir
        };

        // 1. Test clean init
        const db = initDb(mockApp);
        const cols = db.prepare("PRAGMA table_info(words)").all();
        const hasImagePath = cols.some(c => c.name === 'image_path');
        if (!hasImagePath) {
            throw new Error('FAIL: image_path column missing in clean init!');
        }
        console.log('✅ Test 1 Passed: initDb creates words table with image_path column');

        // 2. Test insert and retrieve image_path
        db.prepare(`
            INSERT INTO words (word, translation, mastery_level, image_path)
            VALUES (?, ?, ?, ?)
        `).run('test_word', '测试释义', 2, 'screenshots/test_123.png');

        const row = db.prepare('SELECT * FROM words WHERE word = ?').get('test_word');
        if (!row || row.image_path !== 'screenshots/test_123.png') {
            throw new Error(`FAIL: unexpected row data: ${JSON.stringify(row)}`);
        }
        console.log('✅ Test 2 Passed: word with screenshot image_path inserted & queried successfully');
        db.close();

        // 3. Test legacy migration
        const legacyDbPath = path.join(tempDir, 'legacy.sqlite');
        const legacyDb = new Database(legacyDbPath);
        legacyDb.exec(`
            CREATE TABLE words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT UNIQUE NOT NULL,
                translation TEXT,
                mastery_level INTEGER DEFAULT 0
            );
            INSERT INTO words (word, translation) VALUES ('legacy_word', '旧生词');
        `);
        legacyDb.close();

        // Copy legacy to main.sqlite in another temp folder and run initDb
        const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumina-legacy-'));
        fs.copyFileSync(legacyDbPath, path.join(legacyDir, 'main.sqlite'));

        const migratedDb = initDb({ getPath: () => legacyDir });
        const migratedCols = migratedDb.prepare("PRAGMA table_info(words)").all();
        if (!migratedCols.some(c => c.name === 'image_path')) {
            throw new Error('FAIL: image_path column missing after migration!');
        }

        const legacyRow = migratedDb.prepare('SELECT * FROM words WHERE word = ?').get('legacy_word');
        if (!legacyRow || legacyRow.translation !== '旧生词') {
            throw new Error('FAIL: legacy word corrupted during migration!');
        }
        console.log('✅ Test 3 Passed: legacy database without image_path successfully migrated without data loss');
        migratedDb.close();

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.rmSync(legacyDir, { recursive: true, force: true });

        console.log('🎉 ALL DATABASE & SCREENSHOT SCHEMA VERIFICATIONS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Verification failed:', err);
        process.exit(1);
    }
}

app.whenReady().then(runVerification);
