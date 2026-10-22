const fs = require('fs');
const path = require('path');

let configCache = null;
let cachedConfigPath = null;
let debounceTimer = null;

// Store config in appData alongside DB
function getConfigFile(app) {
    return path.join(app.getPath('userData'), 'sync_config.json');
}

function clearConfigCache() {
    configCache = null;
    cachedConfigPath = null;
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
}

function getConfig(app) {
    const configFile = getConfigFile(app);
    if (configCache !== null && cachedConfigPath === configFile) {
        return { ...configCache };
    }
    if (!fs.existsSync(configFile)) {
        configCache = null;
        cachedConfigPath = configFile;
        return null;
    }
    try {
        const raw = fs.readFileSync(configFile, 'utf8');
        if (!raw || !raw.trim()) {
            configCache = null;
            cachedConfigPath = configFile;
            return null;
        }
        configCache = JSON.parse(raw);
        cachedConfigPath = configFile;
        return { ...configCache };
    } catch (err) {
        console.error('Failed to read or parse sync_config.json:', err);
        return configCache ? { ...configCache } : null;
    }
}

function setConfig(app, config) {
    const configFile = getConfigFile(app);
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    configCache = config ? { ...config } : {};
    cachedConfigPath = configFile;
    try {
        fs.writeFileSync(configFile, JSON.stringify(configCache, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to write sync_config.json:', err);
    }
}

function setConfigDebounced(app, config, delayMs = 300) {
    const configFile = getConfigFile(app);
    configCache = config ? { ...config } : {};
    cachedConfigPath = configFile;
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        try {
            fs.writeFileSync(configFile, JSON.stringify(configCache, null, 2), 'utf8');
        } catch (err) {
            console.error('Failed to write debounced sync_config.json:', err);
        }
    }, delayMs);
}

// Ensure the local SQLite database is fully exported to a single JSON mapping file in the sync directory.
function exportDatabaseToSync(db, syncPath) {
    const file = path.join(syncPath, 'dict_sync_data.json');
    const stmt = db.prepare('SELECT word, translation, phonetic, mastery_level, review_count, next_review_time, updated_at FROM words');
    const allWords = stmt.all();
    
    // We store as a JSON map keyed by word for easy merge
    const dataMap = {};
    for (const w of allWords) {
        dataMap[w.word] = w;
    }
    
    fs.writeFileSync(file, JSON.stringify(dataMap, null, 2), 'utf8');
    return dataMap;
}

// Read the sync file and upsert incoming words based on the `updated_at` resolution. Local-First LWW (Last Write Wins) strategy.
function importDatabaseFromSync(db, syncPath) {
    const file = path.join(syncPath, 'dict_sync_data.json');
    if (!fs.existsSync(file)) return false;
    
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw || !raw.trim()) return false;

    let dataMap;
    try {
        dataMap = JSON.parse(raw);
    } catch (err) {
        console.error('Failed to parse dict_sync_data.json:', err);
        return false;
    }
    
    const getLocal = db.prepare('SELECT updated_at FROM words WHERE word = ?');
    const upsert = db.prepare(`
        INSERT INTO words (word, translation, phonetic, mastery_level, review_count, next_review_time, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(word) DO UPDATE SET
            translation=excluded.translation,
            phonetic=excluded.phonetic,
            mastery_level=excluded.mastery_level,
            review_count=excluded.review_count,
            next_review_time=excluded.next_review_time,
            updated_at=excluded.updated_at
    `);

    let changes = 0;
    const executeSync = db.transaction((entries) => {
        for (const wordKey in entries) {
            const remote = entries[wordKey];
            if (!remote || !remote.word) continue;
            const local = getLocal.get(wordKey);

            // Time parsing
            const remoteTime = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
            const localTime = local && local.updated_at ? new Date(local.updated_at).getTime() : 0;

            if (!local || remoteTime > localTime) {
                upsert.run(remote.word, remote.translation, remote.phonetic, remote.mastery_level, remote.review_count, remote.next_review_time, remote.updated_at);
                changes++;
            }
        }
    });

    executeSync(dataMap);
    return changes;
}

// Trigger Sync Process
function triggerSync(db, app) {
    const config = getConfig(app);
    if (!config || !config.syncPath) return { status: 'no_config' };
    if (!fs.existsSync(config.syncPath)) return { status: 'folder_missing' };

    try {
        const changes = importDatabaseFromSync(db, config.syncPath);
        exportDatabaseToSync(db, config.syncPath);
        return { status: 'success', imported: changes };
    } catch (err) {
        console.error("Sync Error", err);
        throw err;
    }
}

module.exports = {
    getConfig,
    setConfig,
    setConfigDebounced,
    clearConfigCache,
    triggerSync,
    exportDatabaseToSync
};
