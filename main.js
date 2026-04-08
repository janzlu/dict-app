const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog, nativeTheme } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const { initDb } = require('./utils/db');
const { calculateNextReview } = require('./utils/sm2');
const syncEngine = require('./utils/sync');

// --- Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock && !process.env.PLAYWRIGHT_TEST) {
    console.log("Another instance is already running. Quitting.");
    app.quit();
} else {
    let inputWindow;
    let flashcardWindow;
    let dashboardWindow;
    let tray = null;
    let db;
    let reviewTimer = null;

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (inputWindow) {
            inputWindow.show();
            inputWindow.focus();
        }
    });

    // --- App Lifecycle ---
    app.whenReady().then(() => {
        // 1. Initialize SQLite Database
        db = initDb(app);

        // 2. Setup System Tray with real icon
        const iconPath = path.join(__dirname, 'resources', 'icon.png');
        tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
        
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Search Word (Ctrl+Shift+D)', click: () => { inputWindow.show(); inputWindow.focus(); } },
            { type: 'separator' },
            { label: '🎲 Shuffle Play Review', click: () => checkReviewQueue() },
            { type: 'separator' },
            { label: 'Dashboard & Sync', click: () => openDashboard() },
            { type: 'separator' },
            { label: 'Quit Lumina', click: () => { app.isQuitting = true; app.quit(); } }
        ]);
        tray.setToolTip('Lumina');
        tray.setContextMenu(contextMenu);
        
        tray.on('double-click', () => {
            openDashboard();
        });

        // 3. Create the frameless Spotlight Input Window
        inputWindow = new BrowserWindow({
            width: 800,
            height: 450,
            frame: false,
            transparent: true,
            resizable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            show: false, // Hidden by default until hotkey pressed
            icon: iconPath,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });

        inputWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

        // Hide window on blur
        inputWindow.on('blur', () => {
            inputWindow.hide();
        });

        function updateTitleBar() {
            if (dashboardWindow && !dashboardWindow.isDestroyed()) {
                const isDark = nativeTheme.shouldUseDarkColors;
                dashboardWindow.setTitleBarOverlay({
                    color: isDark ? '#1a1a1a' : '#f5f5f7',
                    symbolColor: isDark ? '#ffffff' : '#1d1d1f'
                });
            }
        }
        nativeTheme.on('updated', updateTitleBar);

        // 4. Create the Dashboard Window (lazy init)
        function openDashboard() {
            if (dashboardWindow) {
                dashboardWindow.show();
                dashboardWindow.focus();
                return;
            }
            const isDark = nativeTheme.shouldUseDarkColors;
            dashboardWindow = new BrowserWindow({
                width: 1050,
                height: 720,
                autoHideMenuBar: true,
                titleBarStyle: 'hidden',
                titleBarOverlay: {
                    color: isDark ? '#1a1a1a' : '#f5f5f7',
                    symbolColor: isDark ? '#ffffff' : '#1d1d1f',
                    height: 32
                },
                icon: iconPath,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, 'preload.js')
                }
            });
            dashboardWindow.loadFile(path.join(__dirname, 'src', 'dashboard.html'));
            dashboardWindow.on('closed', () => {
                dashboardWindow = null;
            });
        }

        // 5. Create the Flashcard Window
        flashcardWindow = new BrowserWindow({
            width: 340,
            height: 180,
            frame: false,
            transparent: true,
            resizable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            show: false,
            icon: iconPath,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });
        
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        
        let initialConfig = syncEngine.getConfig(app) || {};
        if (initialConfig.flashcardX !== undefined && initialConfig.flashcardY !== undefined) {
             flashcardWindow.setPosition(initialConfig.flashcardX, initialConfig.flashcardY);
        } else {
             flashcardWindow.setPosition(width - 360, height - 200);
        }
        
        // Track position to save it
        flashcardWindow.on('moved', () => {
             const [x, y] = flashcardWindow.getPosition();
             const currentConfig = syncEngine.getConfig(app) || {};
             currentConfig.flashcardX = x;
             currentConfig.flashcardY = y;
             syncEngine.setConfig(app, currentConfig);
        });

        flashcardWindow.loadFile(path.join(__dirname, 'src', 'flashcard.html'));

        // 5. Register Global Shortcut dynamically
        function setupShortcut(accelerator) {
            globalShortcut.unregisterAll();
            try {
                const ret = globalShortcut.register(accelerator, () => {
                    if (inputWindow.isVisible()) {
                        inputWindow.hide();
                    } else {
                        const { clipboard } = require('electron');
                        const text = clipboard.readText();
                        if (text && inputWindow) {
                            inputWindow.webContents.send('clipboard-data', text);
                        }
                        
                        inputWindow.show();
                        inputWindow.focus();
                    }
                });
                if (!ret) throw new Error("Registration failed");
                
                // Update Context Menu
                const contextMenu = Menu.buildFromTemplate([
                    { label: `Search Word (${accelerator})`, click: () => { inputWindow.show(); inputWindow.focus(); } },
                    { type: 'separator' },
                    { label: '🎲 Shuffle Play Review', click: () => checkReviewQueue() },
                    { type: 'separator' },
                    { label: 'Dashboard & Sync', click: () => openDashboard() },
                    { type: 'separator' },
                    { label: 'Quit Lumina', click: () => { app.isQuitting = true; app.quit(); } }
                ]);
                tray.setContextMenu(contextMenu);
                
                return true;
            } catch(e) {
                console.error("Failed to register shortcut:", e);
                return false;
            }
        }
        setupShortcut(initialConfig.shortcut || 'CommandOrControl+Shift+D');
        
        // 5.5 Clipboard Monitor
        const { clipboard: electronClipboard } = require('electron');
        let masterLastClip = electronClipboard.readText();
        setInterval(() => {
            const config = syncEngine.getConfig(app) || {};
            if (config.autoPopupEnabled === false) return; // Feature disabled by user

            const currentClip = electronClipboard.readText();
            if (currentClip !== masterLastClip) {
                masterLastClip = currentClip;
                const safeText = (currentClip || '').replace(/\r?\n/g, ' ').trim();
                
                // Heuristic: trigger popup for string length <= 3000 (long paragraphs)
                if (safeText.length > 0 && safeText.length <= 3000) {
                    // Make sure it contains English characters
                    if (/[a-zA-Z]/.test(safeText)) {
                        if (inputWindow) {
                            if (!inputWindow.isVisible()) {
                                inputWindow.show();
                                inputWindow.focus();
                            }
                            inputWindow.webContents.send('clipboard-data', safeText);
                        }
                    }
                }
            }
        }, 500);

        // 6. Database and IPC Handlers
        // Mount read-only ECDICT mock
        const ecdictPath = app.isPackaged 
            ? path.join(process.resourcesPath, 'resources', 'ecdict_lite.sqlite')
            : path.join(__dirname, 'resources', 'ecdict_lite.sqlite');
        let ecdictDb = null;
        try {
             ecdictDb = new Database(ecdictPath, { readonly: true });
        } catch (err) {
             console.error("ECDICT load failed, skipping offline dict", err);
        }

        ipcMain.handle('search-word', async (event, wordText) => {
            console.log(`[Main] searching for: ${wordText}`);
            // Check Local DB first
            let stmt = db.prepare('SELECT * FROM words WHERE word = ? COLLATE NOCASE');
            let result = stmt.get(wordText);
            
            if (result) return { source: 'local', data: result };

            // Fallback to ECDICT
            if (ecdictDb) {
                stmt = ecdictDb.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE');
                result = stmt.get(wordText);
                if (result) return { source: 'ecdict', data: result };
            }
            
            // Third Fallback: Online Dictionary API (For words not in our Lite Mock database)
            const isPhrase = wordText.trim().includes(' ');
            
            try {
                if (!isPhrase) {
                    try {
                        const controller = new AbortController();
                        const id = setTimeout(() => controller.abort(), 6000);
                        const res = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(wordText)}`, { signal: controller.signal });
                        clearTimeout(id);
                        
                        if (res.ok) {
                            const json = await res.json();
                            let translation = '';
                            let phonetic = '';
                            
                            let ukphone = '';
                            let usphone = '';
                            if (json.ec && json.ec.word && json.ec.word[0]) {
                                const wordObj = json.ec.word[0];
                                ukphone = wordObj.ukphone || '';
                                usphone = wordObj.usphone || '';
                                phonetic = usphone || ukphone || '';
                                if (wordObj.trs && wordObj.trs.length > 0) {
                                    translation = wordObj.trs.map(t => {
                                        const i = t.tr?.[0]?.l?.i;
                                        return Array.isArray(i) ? i.join('\n') : (i || '');
                                    }).filter(Boolean).join('\n');
                                }
                            } else if (json.ce && json.ce.word && json.ce.word[0]) {
                                const wordObj = json.ce.word[0];
                                phonetic = wordObj.phone || '';
                                if (wordObj.trs && wordObj.trs.length > 0) {
                                    translation = wordObj.trs.map(t => {
                                        const i = t.tr?.[0]?.l?.i;
                                        return Array.isArray(i) ? i.join('\n') : (i || '');
                                    }).filter(Boolean).join('\n');
                                }
                            }
                            
                            if (!translation && json.web_trans && json.web_trans['web-translation']) {
                                const webTrans = json.web_trans['web-translation'][0]?.trans;
                                if (webTrans) translation = webTrans.map(t => t.value).join(', ');
                            }

                            if (!translation) {
                                const sugController = new AbortController();
                                const sugId = setTimeout(() => sugController.abort(), 5000);
                                const sugRes = await fetch(`https://dict.youdao.com/suggest?num=1&ver=3.0&doctype=json&cache=false&le=en&q=${encodeURIComponent(wordText)}`, { signal: sugController.signal });
                                clearTimeout(sugId);
                                
                                if (sugRes.ok) {
                                    const sugJson = await sugRes.json();
                                    if (sugJson && sugJson.data && sugJson.data.entries && sugJson.data.entries.length > 0) {
                                        translation = sugJson.data.entries[0].explain;
                                    }
                                }
                            }

                            if (translation) {
                                return {
                                    source: 'online',
                                    data: {
                                        word: wordText,
                                        phonetic: phonetic,
                                        ukphone: ukphone,
                                        usphone: usphone,
                                        translation: translation
                                    }
                                };
                            }
                        }
                    } catch (dictErr) {
                        console.error("Youdao dict API failed:", dictErr);
                        // Fall-through to translation APIs
                    }
                }
                
                // Final Fallback: Machine Translation for Phrases / Sentences
                try {
                    const gtController = new AbortController();
                    const gtId = setTimeout(() => gtController.abort(), 6000);
                    const gtRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(wordText)}`, { signal: gtController.signal });
                    clearTimeout(gtId);
                    
                    if (gtRes.ok) {
                        const gtJson = await gtRes.json();
                        if (gtJson && gtJson[0] && gtJson[0].length > 0) {
                            let fullTranslation = '';
                            for (let segment of gtJson[0]) {
                                if (segment[0]) fullTranslation += segment[0];
                            }
                            
                            return {
                                source: 'translate',
                                data: {
                                    word: wordText,
                                    phonetic: 'Phrase/Sentence',
                                    translation: fullTranslation
                                }
                            };
                        }
                    }
                } catch (gtErr) {
                    console.error("Google Translate failed, falling back to MyMemory API", gtErr);
                    // Network Degradation Fallback (Mainland China robust)
                    try {
                        const mmController = new AbortController();
                        const mmId = setTimeout(() => mmController.abort(), 8000);
                        const mmRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(wordText)}&langpair=en|zh-CN`, { signal: mmController.signal });
                        clearTimeout(mmId);
                        
                        if (mmRes.ok) {
                            const mmJson = await mmRes.json();
                            if (mmJson && mmJson.responseData && mmJson.responseData.translatedText) {
                                return {
                                    source: 'translate-fallback',
                                    data: {
                                        word: wordText,
                                        phonetic: 'Fallback Engine',
                                        translation: mmJson.responseData.translatedText
                                    }
                                };
                            }
                        }
                    } catch (mmErr) {
                        console.error("Fallback engine also failed", mmErr);
                    }
                }
            } catch (err) {
                console.error("Online lookup failed completely", err);
            }

            return { error: 'Not found in any database' };
        });

        ipcMain.handle('save-word', async (event, wordData) => {
            // Save to local SQLite
            try {
                // Deduplicate explicitly (ignore case and spacing)
                const safeWord = (wordData.word || '').toLowerCase().trim();
                
                // Pre-flight check for case-insensitive matches
                const existing = db.prepare('SELECT id FROM words WHERE LOWER(word) = ?').get(safeWord);
                if (existing) {
                    return { success: true, inserted: false, reason: 'duplicate' };
                }

                let stmt = db.prepare(`
                    INSERT INTO words (word, translation, phonetic) 
                    VALUES (?, ?, ?)
                    ON CONFLICT(word) DO NOTHING
                `);
                const info = stmt.run(safeWord, wordData.translation, wordData.phonetic);
                return { success: true, inserted: info.changes > 0 };
            } catch (err) {
                console.error("Save word failed", err);
                return { error: err.message };
            }
        });

        ipcMain.on('hide-window', () => {
            inputWindow.hide();
        });

        // Dynamic Spotlight Resizing
        ipcMain.on('resize-window', (event, height) => {
            if (inputWindow && !inputWindow.isDestroyed()) {
                const bounds = inputWindow.getBounds();
                inputWindow.setBounds({
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: Math.ceil(height)
                });
            }
        });

        // Flashcard IPCs
        ipcMain.on('hide-flashcard', () => {
            flashcardWindow.hide();
        });
        
        ipcMain.on('move-flashcard-by', (event, dx, dy) => {
            if (flashcardWindow && !flashcardWindow.isDestroyed()) {
                const pos = flashcardWindow.getPosition();
                flashcardWindow.setPosition(pos[0] + dx, pos[1] + dy);
            }
        });

        // Elite Feature: Dynamic Mouse Pass-through
        ipcMain.on('set-ignore-mouse', (event, ignore, options) => {
            if (flashcardWindow && !flashcardWindow.isDestroyed()) {
                flashcardWindow.setIgnoreMouseEvents(ignore, options);
            }
        });

        ipcMain.on('submit-review', (event, id, currentMastery, score) => {
            const sm2 = calculateNextReview(currentMastery, score);
            
            const submitTransaction = db.transaction((wordId, newMastery, newTime, oldMastery, userScore) => {
                const updateStmt = db.prepare('UPDATE words SET mastery_level = ?, next_review_time = ?, review_count = review_count + 1 WHERE id = ?');
                updateStmt.run(newMastery, newTime, wordId);
                
                const logStmt = db.prepare('INSERT INTO review_logs (word_id, score, mastery_before, mastery_after) VALUES (?, ?, ?, ?)');
                logStmt.run(wordId, userScore, oldMastery, newMastery);
            });
            
            try {
                submitTransaction(id, sm2.masteryLevel, sm2.nextReviewTime, currentMastery, score);
            } catch (err) {
                console.error("Failed to execute review transaction:", err);
            }
            
            // Sync triggers blindly out on review update
            try { 
                const config = syncEngine.getConfig(app);
                if(config && config.syncPath) syncEngine.exportDatabaseToSync(db, config.syncPath); 
            } catch(e) {}

            // Immediately pull next word after a short delay
            setTimeout(checkReviewQueue, 1500);
        });

        // Phase 4 IPCs
        ipcMain.handle('get-all-words', () => {
            const stmt = db.prepare('SELECT * FROM words ORDER BY mastery_level DESC, created_at DESC');
            return stmt.all();
        });

        // Analytics Endpoint
        ipcMain.handle('get-analytics', () => {
            const data = {};
            try {
                // Mastery Distribution
                data.distribution = db.prepare('SELECT mastery_level as level, COUNT(*) as count FROM words GROUP BY mastery_level').all();
                
                // Forecast (Next 7 Days Workload)
                data.forecast = db.prepare(`
                    SELECT date(next_review_time) as reviewDate, COUNT(*) as count 
                    FROM words 
                    WHERE next_review_time > datetime('now', 'localtime')
                    GROUP BY reviewDate
                    ORDER BY reviewDate ASC
                    LIMIT 7
                `).all();

                // Heatmap Logs
                data.heatmap = db.prepare(`
                    SELECT date(review_time) as reviewDate, COUNT(*) as count
                    FROM review_logs
                    GROUP BY reviewDate
                    ORDER BY reviewDate DESC
                    LIMIT 365
                `).all();
            } catch (err) {
                console.error("Analytics fetch error:", err);
            }
            return data;
        });

        ipcMain.handle('get-sync-config', () => {
            return syncEngine.getConfig(app) || {};
        });

        ipcMain.handle('select-sync-folder', async () => {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory']
            });
            if (result.canceled) return null;
            return result.filePaths[0];
        });

        ipcMain.handle('set-sync-folder', (event, path) => {
            const currentCfg = syncEngine.getConfig(app) || {};
            currentCfg.syncPath = path;
            syncEngine.setConfig(app, currentCfg);
            // Export current DB instantly onto new folder
            syncEngine.exportDatabaseToSync(db, path);
            return true;
        });

        ipcMain.handle('force-sync', () => {
            return syncEngine.triggerSync(db, app);
        });
        
        ipcMain.handle('set-shortcut', (event, newShortcut) => {
            if (setupShortcut(newShortcut)) {
                const currentCfg = syncEngine.getConfig(app) || {};
                currentCfg.shortcut = newShortcut;
                syncEngine.setConfig(app, currentCfg);
                return { success: true };
            }
            return { error: 'Invalid shortcut combination' };
        });

        // Autostart setup
        ipcMain.handle('get-autostart', () => {
            return app.getLoginItemSettings().openAtLogin;
        });

        ipcMain.handle('set-autostart', (event, enable) => {
            app.setLoginItemSettings({
                openAtLogin: enable,
                path: app.getPath('exe') // ensure correct binary is targeted
            });
            return enable;
        });

        // Auto-popup setup
        ipcMain.handle('get-autopopup', () => {
            const cfg = syncEngine.getConfig(app) || {};
            return cfg.autoPopupEnabled !== false; // true by default
        });

        ipcMain.handle('set-autopopup', (event, enable) => {
            const currentCfg = syncEngine.getConfig(app) || {};
            currentCfg.autoPopupEnabled = enable;
            syncEngine.setConfig(app, currentCfg);
            return enable;
        });

        // Auto-review setup
        ipcMain.handle('get-autoreview', () => {
            const cfg = syncEngine.getConfig(app) || {};
            return cfg.autoReviewEnabled !== false; // true by default
        });

        ipcMain.handle('set-autoreview', (event, enable) => {
            const currentCfg = syncEngine.getConfig(app) || {};
            currentCfg.autoReviewEnabled = enable;
            syncEngine.setConfig(app, currentCfg);
            return enable;
        });

        // Theme Setup
        let currentThemeConfig = initialConfig.theme || 'dark';
        nativeTheme.themeSource = currentThemeConfig;

        ipcMain.handle('get-theme', () => {
            return syncEngine.getConfig(app)?.theme || 'dark';
        });

        ipcMain.handle('set-theme', (event, themeMode) => {
            nativeTheme.themeSource = themeMode; // 'dark', 'light', 'system'
            const currentCfg = syncEngine.getConfig(app) || {};
            currentCfg.theme = themeMode;
            syncEngine.setConfig(app, currentCfg);
            updateTitleBar(); // Update instantly
            return themeMode;
        });

        // Delete word from DB
        ipcMain.handle('delete-word', (event, id) => {
            try {
                const stmt = db.prepare('DELETE FROM words WHERE id = ?');
                stmt.run(id);
                
                // Keep sync fresh
                try {
                    const config = syncEngine.getConfig(app);
                    if (config && config.syncPath) syncEngine.exportDatabaseToSync(db, config.syncPath);
                } catch(e){}
                
                return { success: true };
            } catch (err) {
                return { error: err.message };
            }
        });

        let isManualReviewMode = false;
        let isAutoSlideshowMode = false;

        ipcMain.on('start-shuffle-play', () => {
            console.log("Starting Shuffle Play...");
            isManualReviewMode = true;
            isAutoSlideshowMode = false;
            checkReviewQueue();
        });

        ipcMain.on('start-auto-slideshow', () => {
            console.log("Starting Auto Slideshow...");
            isAutoSlideshowMode = true;
            isManualReviewMode = false;
            checkReviewQueue();
        });

        ipcMain.on('slideshow-next', () => {
            if (isAutoSlideshowMode) {
                checkReviewQueue();
            }
        });

        // [AUDIT V1.7.0]: Restored 30s Ebbinghaus auto-timer + Manual Shuffle Play logic
        function checkReviewQueue() {
            // First try to find strictly due words
            const nowIso = new Date().toISOString();
            let stmt = db.prepare(`
                SELECT * FROM words 
                WHERE next_review_time IS NULL OR next_review_time <= ?
                ORDER BY RANDOM() LIMIT 1
            `);
            let word = stmt.get(nowIso);
            
            // If manual trigger and no strictly due words, pick ANY un-mastered word randomly
            // In Slideshow Mode, any word at all can be reviewed (loop endlessly like a screensaver)
            if (!word && (isManualReviewMode || isAutoSlideshowMode)) {
                let query = isAutoSlideshowMode ? `SELECT * FROM words ORDER BY RANDOM() LIMIT 1` : `SELECT * FROM words WHERE mastery_level < 5 ORDER BY RANDOM() LIMIT 1`;
                const fallbackStmt = db.prepare(query);
                word = fallbackStmt.get();
            }
            
            if (word) {
                // Ignore if Spotlight is currently active to not distract user
                if (inputWindow.isVisible() && !isManualReviewMode && !isAutoSlideshowMode) return;

                if (!flashcardWindow.isVisible()) {
                    if (isManualReviewMode || isAutoSlideshowMode) flashcardWindow.show();
                    else flashcardWindow.showInactive(); 
                }
                
                // Do not steal focus for slideshows so users can just keep doing their work!
                if (isManualReviewMode && !isAutoSlideshowMode) flashcardWindow.focus();
                
                // Attach the mode flag to inform the renderer
                word.isSlideshow = isAutoSlideshowMode;
                flashcardWindow.webContents.send('review-word', word);
            } else {
                flashcardWindow.hide();
                // ONLY show the "All Clear" alert if the user explicitly manually requested a shuffle review
                if (isManualReviewMode) {
                    dialog.showMessageBox({
                        type: 'info',
                        title: 'Lumina - All Clear',
                        message: 'Great job! You have fully mastered all the words in your wordbook.'
                    });
                }
                isManualReviewMode = false; // Reset mode
                isAutoSlideshowMode = false;
            }
        }

        // Silent background Ebbinghaus curve runner (Never enters manual mode)
        setInterval(() => {
            const cfg = syncEngine.getConfig(app) || {};
            // Only fire autotimer if we aren't currently occupying the flashcard window
            if (cfg.autoReviewEnabled !== false && !isManualReviewMode && !isAutoSlideshowMode) {
                checkReviewQueue();
            }
        }, 30000);

        // ... when closing window manually
        ipcMain.on('hide-flashcard', () => {
            flashcardWindow.hide();
            isManualReviewMode = false;
            isAutoSlideshowMode = false;
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                // Re-create window
            }
        });
    });

    // Prevent app from quitting when all windows are closed, since it lives in the tray
    app.on('window-all-closed', (e) => {
        e.preventDefault();
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    app.on('before-quit', () => {
        // Close DB gracefully to allow WAL checkpointing
        if (db) {
            console.log("Closing SQLite Database...");
            db.close();
        }
    });
}
