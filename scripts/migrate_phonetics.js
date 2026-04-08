const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

app.name = 'dict_app';
app.whenReady().then(async () => {
    const dbPath = path.join(app.getPath('userData'), 'main.sqlite');
    if (!fs.existsSync(dbPath)) {
        console.error("Database not found at:", dbPath);
        app.quit();
        return;
    }
    
    fs.copyFileSync(dbPath, dbPath + '.migrate.bak');
    
    const db = new Database(dbPath);
    // Find words without phonetics OR words that don't have UK/US info but could
    // But per user request we just check if it's missing or empty
    const words = db.prepare('SELECT id, word FROM words WHERE phonetic IS NULL OR phonetic = \'\'').all();
    
    console.log(`Found ${words.length} words without phonetic. Proceeding to fetch...`);
    let updatedCount = 0;
    
    for (const row of words) {
        try {
            const wordText = row.word;
            if (!wordText || wordText.trim().includes(' ')) {
                // Phrase, ignore
                continue;
            }
            
            const res = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(wordText)}`);
            if (res.ok) {
                const json = await res.json();
                let ukphone = '';
                let usphone = '';
                let combined = '';
                
                if (json.ec && json.ec.word && json.ec.word[0]) {
                    const wordObj = json.ec.word[0];
                    ukphone = wordObj.ukphone || '';
                    usphone = wordObj.usphone || '';
                    combined = wordObj.phone || '';
                } else if (json.ce && json.ce.word && json.ce.word[0]) {
                    ukphone = json.ce.word[0].phone || '';
                    usphone = json.ce.word[0].phone || '';
                }
                
                if (ukphone && usphone && ukphone !== usphone) {
                    combined = `UK /${ukphone}/ US /${usphone}/`;
                } else if (ukphone) {
                    combined = `UK /${ukphone}/`;
                } else if (usphone) {
                    combined = `US /${usphone}/`;
                } else if (combined && !combined.includes('/')) {
                    combined = `/${combined}/`;
                }
                
                if (combined) {
                    db.prepare('UPDATE words SET phonetic = ? WHERE id = ?').run(combined, row.id);
                    updatedCount++;
                    console.log(`Updated [${wordText}]: ${combined}`);
                }
            }
        } catch (e) {
            console.error(`Error processing ${row.word}:`, e.message);
        }
        
        // Gentle wait
        await new Promise(r => setTimeout(r, 250));
    }
    
    console.log(`\n\n[SUCCESS] Migration finished! Updated ${updatedCount} words.`);
    db.close();
    app.quit();
});
