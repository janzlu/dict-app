const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dictPath = path.join(__dirname, '..', 'resources', 'ecdict_lite.sqlite');
const resourceDir = path.dirname(dictPath);

if (!fs.existsSync(resourceDir)) {
    fs.mkdirSync(resourceDir, { recursive: true });
}

// Remove old mock if exists
if (fs.existsSync(dictPath)) fs.unlinkSync(dictPath);

const db = new Database(dictPath);

// Create the ECDICT mock schema (similar to skywind3000's ECDICT)
db.exec(`
    CREATE TABLE stardict (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT UNIQUE NOT NULL,
        sw TEXT,
        phonetic TEXT,
        definition TEXT,
        translation TEXT,
        pos TEXT,
        collins INTEGER,
        oxford INTEGER,
        tag TEXT,
        bnc INTEGER,
        frq INTEGER,
        exchange TEXT,
        detail TEXT,
        audio TEXT
    );
    CREATE INDEX idx_stardict_word ON stardict(word COLLATE NOCASE);
`);

const insert = db.prepare(`
    INSERT INTO stardict (word, phonetic, translation, definition)
    VALUES (?, ?, ?, ?)
`);

// Insert some mock dictionary data
const mockWords = [
    ['hello', 'həˈləʊ', 'int. 喂；哈罗', 'used as a greeting or to begin a phone conversation'],
    ['world', 'wɜːld', 'n. 世界；领域', 'the earth, together with all of its countries, peoples, and natural features'],
    ['apple', 'ˈæp(ə)l', 'n. 苹果', 'the round fruit of a tree of the rose family'],
    ['serendipity', 'ˌsɛr(ə)nˈdɪpɪti', 'n. 意外发现珍奇事物的本领', 'the occurrence and development of events by chance in a happy or beneficial way'],
    ['ephemeral', 'ɪˈfɛm(ə)r(ə)l', 'adj. 短暂的', 'lasting for a very short time'],
    ['perseverance', 'ˌpɜːsɪˈvɪər(ə)ns', 'n. 毅力', 'persistence in doing something despite difficulty or delay in achieving success']
];

const insertMany = db.transaction((words) => {
    for (const w of words) {
        insert.run(w[0], w[1], w[2], w[3]);
    }
});

insertMany(mockWords);

console.log(`Mock ECDICT database built at ${dictPath} with ${mockWords.length} words.`);
db.close();
