const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog, nativeTheme } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const { initDb } = require('./utils/db');
const { calculateNextReview } = require('./utils/sm2');
const syncEngine = require('./utils/sync');
const { autoUpdater } = require('electron-updater');

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
    let ecdictDb = null;
    let reviewTimer = null;
    let isFlashcardDocked = false;
    let preDockBounds = null;
    let dockSide = 'right';

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
            height: 200,
            frame: false,
            transparent: true,
            hasShadow: false, // Turn off native OS rectangular shadow to remove grey corners
            resizable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            show: false,
            backgroundMaterial: 'none', // Disable system background material for true transparency
            vibrancy: 'popover',           // macOS blur support
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
             if (isFlashcardDocked) return;
             const [x, y] = flashcardWindow.getPosition();
             const currentConfig = syncEngine.getConfig(app) || {};
             currentConfig.flashcardX = x;
             currentConfig.flashcardY = y;
             syncEngine.setConfig(app, currentConfig);
        });

        flashcardWindow.loadFile(path.join(__dirname, 'src', 'flashcard.html'));
        console.log("=== FLASHCARD WINDOW INITIALIZED ===");
        console.log("Electron version:", process.versions.electron);
        console.log("setBackgroundMaterial exists:", typeof flashcardWindow.setBackgroundMaterial);
        console.log("setVibrancy exists:", typeof flashcardWindow.setVibrancy);


        let screenshotWindow = null;
        let lastScreenshotDataUrl = null;

        // 5. Register Global Shortcuts dynamically
        function setupGlobalShortcuts() {
            globalShortcut.unregisterAll();
            const config = syncEngine.getConfig(app) || {};
            const searchShortcut = config.shortcut || 'CommandOrControl+Shift+D';
            const screenshotShortcut = config.screenshotShortcut || 'CommandOrControl+Shift+X';
            
            // 1. Register Search word global shortcut
            let searchOk = false;
            try {
                searchOk = globalShortcut.register(searchShortcut, () => {
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
            } catch(e) {
                console.error("Failed to register search shortcut:", e);
            }

            // 2. Register Screenshot translation global shortcut
            let screenshotOk = false;
            try {
                screenshotOk = globalShortcut.register(screenshotShortcut, () => {
                    triggerScreenshotTranslation();
                });
            } catch(e) {
                console.error("Failed to register screenshot shortcut:", e);
            }

            // Update Context Menu
            const contextMenu = Menu.buildFromTemplate([
                { label: `Search Word / 查词面板 (${searchShortcut})`, click: () => { inputWindow.show(); inputWindow.focus(); } },
                { label: `Screenshot Translate / 截图翻译 (${screenshotShortcut})`, click: () => { triggerScreenshotTranslation(); } },
                { type: 'separator' },
                { label: '🎲 Shuffle Play Review', click: () => checkReviewQueue() },
                { type: 'separator' },
                { label: 'Dashboard & Sync', click: () => openDashboard() },
                { type: 'separator' },
                { label: 'Quit Lumina', click: () => { app.isQuitting = true; app.quit(); } }
            ]);
            tray.setContextMenu(contextMenu);

            return { searchOk, screenshotOk };
        }

        async function triggerScreenshotTranslation() {
            if (screenshotWindow) return;

            const wasInputVisible = inputWindow.isVisible();
            const wasFlashcardVisible = flashcardWindow && flashcardWindow.isVisible();

            if (wasInputVisible) inputWindow.hide();
            if (wasFlashcardVisible) flashcardWindow.hide();

            // Wait brief transition delay for hides to clear
            setTimeout(async () => {
                try {
                    const { screen, desktopCapturer } = require('electron');
                    const cursorPoint = screen.getCursorScreenPoint();
                    const activeDisplay = screen.getDisplayNearestPoint(cursorPoint);
                    
                    const scaleFactor = activeDisplay.scaleFactor;
                    const width = Math.round(activeDisplay.bounds.width * scaleFactor);
                    const height = Math.round(activeDisplay.bounds.height * scaleFactor);

                    const sources = await desktopCapturer.getSources({
                        types: ['screen'],
                        thumbnailSize: { width, height }
                    });

                    let targetSource = sources.find(source => source.display_id === activeDisplay.id.toString());
                    if (!targetSource) {
                        targetSource = sources[0];
                    }

                    if (!targetSource) {
                        throw new Error("No screen source captured");
                    }

                    lastScreenshotDataUrl = targetSource.thumbnail.toDataURL();

                    const displayBounds = activeDisplay.bounds;
                    screenshotWindow = new BrowserWindow({
                        x: displayBounds.x,
                        y: displayBounds.y,
                        width: displayBounds.width,
                        height: displayBounds.height,
                        frame: false,
                        transparent: true,
                        alwaysOnTop: true,
                        fullscreen: process.platform === 'darwin' ? false : true,
                        enableLargerThanScreen: true,
                        skipTaskbar: true,
                        resizable: false,
                        movable: false,
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                            preload: path.join(__dirname, 'preload.js')
                        }
                    });

                    if (process.platform === 'darwin') {
                        screenshotWindow.setSimpleFullScreen(true);
                    }

                    screenshotWindow.loadFile(path.join(__dirname, 'src', 'screenshot.html'));
                    
                    screenshotWindow.on('closed', () => {
                        screenshotWindow = null;
                    });

                } catch (err) {
                    console.error("Screenshot capture failed:", err);
                    if (wasInputVisible) inputWindow.show();
                    if (wasFlashcardVisible) flashcardWindow.show();
                }
            }, 150);
        }

        async function performOCR(base64Image, config) {
            const engine = config.ocrEngine || 'ocr_space';
            if (engine === 'youdao' && config.youdaoOcrAppKey && config.youdaoOcrSecretKey) {
                return await performYoudaoOCR(base64Image, config.youdaoOcrAppKey, config.youdaoOcrSecretKey);
            }
            return await performOcrSpace(base64Image, config.ocrApiKey || 'helloworld', config.ocrLang || 'eng');
        }

        async function performOcrSpace(base64Image, apiKey, lang) {
            console.log("[Main] OCR.space request...");
            const params = new URLSearchParams();
            params.append('apikey', apiKey);
            params.append('base64Image', base64Image);
            params.append('language', lang);
            params.append('isOverlayRequired', 'false');
            params.append('scale', 'true');

            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 10000);

            try {
                const res = await fetch('https://api.ocr.space/parse/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString(),
                    signal: controller.signal
                });
                clearTimeout(id);

                if (!res.ok) throw new Error(`OCR.space responded with status ${res.status}`);
                const json = await res.json();

                if (json.IsErroredOnProcessing) {
                    throw new Error(json.ErrorMessage?.[0] || 'OCR processing failed');
                }

                if (json.ParsedResults && json.ParsedResults[0]) {
                    const text = json.ParsedResults[0].ParsedText;
                    if (text && text.trim()) return text.trim();
                }
                throw new Error("No text detected in selection.");
            } catch (err) {
                console.error("[Main] OCR.space failed:", err);
                throw err;
            }
        }

        async function performYoudaoOCR(base64DataUri, appKey, secretKey) {
            console.log("[Main] Youdao OCR request...");
            const base64Data = base64DataUri.replace(/^data:image\/\w+;base64,/, "");
            const crypto = require('crypto');
            const salt = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
            const curtime = Math.round(new Date().getTime() / 1000).toString();
            
            const signStr = appKey + base64Data + salt + curtime + secretKey;
            const sign = crypto.createHash('sha256').update(signStr).digest('hex');

            const params = new URLSearchParams({
                img: base64Data,
                langType: 'auto',
                detectType: '10012',
                imageType: '1',
                appKey: appKey,
                salt: salt,
                curtime: curtime,
                sign: sign
            });

            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000);

            try {
                const res = await fetch('https://openapi.youdao.com/ocrapi', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString(),
                    signal: controller.signal
                });
                clearTimeout(id);

                if (!res.ok) throw new Error(`Youdao OCR responded with status ${res.status}`);
                const json = await res.json();
                
                if (json.errorCode !== '0') {
                    throw new Error(`Youdao OCR Error Code ${json.errorCode}`);
                }

                if (json.Result && json.Result.regions) {
                    const lines = [];
                    for (const region of json.Result.regions) {
                        if (region.lines) {
                            for (const line of region.lines) {
                                if (line.text) lines.push(line.text);
                            }
                        }
                    }
                    if (lines.length > 0) return lines.join('\n');
                }
                throw new Error("No text detected by Youdao OCR");
            } catch (err) {
                console.error("[Main] Youdao OCR failed:", err);
                throw err;
            }
        }

        try {
            setupGlobalShortcuts();
        } catch (e) {
            console.error("Failed to initialize shortcuts on startup:", e);
        }
        
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
        }, 150);


        // 6. Database and IPC Handlers
        // Mount read-only ECDICT mock
        const ecdictPath = app.isPackaged 
            ? path.join(process.resourcesPath, 'resources', 'ecdict_lite.sqlite')
            : path.join(__dirname, 'resources', 'ecdict_lite.sqlite');
        try {
             ecdictDb = new Database(ecdictPath, { readonly: true });
             const start = performance.now();
             const result = ecdictDb.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE').get('body');
             const end = performance.now();
             console.log(`[ECDICT Test] query time for 'body': ${(end - start).toFixed(2)}ms`);
        } catch (err) {
             console.error("ECDICT load failed, skipping offline dict", err);
        }


        async function queryLLM(cleanWord, llmConfig) {
            const { llmProvider, llmUrl, llmKey, llmModel } = llmConfig;
            const baseUrl = (llmUrl || 'https://api.deepseek.com/v1').replace(/\/$/, '');
            const url = `${baseUrl}/chat/completions`;
            
            const systemPrompt = `You are a professional dictionary assistant. Translate the English input (word, phrase, or sentence) to Chinese.
Return a valid JSON object ONLY. Do not write markdown, code blocks, or explanations outside the JSON.
The JSON format must be:
{
  "word": "the input text",
  "phonetic": "IPA phonetic spelling (leave blank for phrases/sentences)",
  "translation": "concise and professional Chinese definition/translation"
}`;

            const payload = {
                model: llmModel || 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: cleanWord }
                ],
                temperature: 0.1,
                max_tokens: 300
            };

            if (llmProvider === 'deepseek' || llmProvider === 'openai') {
                payload.response_format = { type: "json_object" };
            }

            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 5000); // 5s timeout for LLM
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${llmKey}`
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(id);
                if (res.ok) {
                    const json = await res.json();
                    const content = json.choices[0].message.content.trim();
                    const jsonStr = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.translation) {
                        return {
                            source: 'llm',
                            data: {
                                word: parsed.word || cleanWord,
                                phonetic: parsed.phonetic || '',
                                translation: parsed.translation
                            }
                        };
                    }
                }
            } catch (err) {
                console.error("[Main] queryLLM error:", err);
            }
            return null;
        }

        async function queryEdgeTranslate(cleanWord) {
            console.log(`[Main] Edge Translating: ${cleanWord}`);
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 4000);
                const authRes = await fetch('https://edge.microsoft.com/translate/auth', { signal: controller.signal });
                clearTimeout(id);
                if (!authRes.ok) throw new Error(`Auth failed status: ${authRes.status}`);
                const token = await authRes.text();
                
                const translateController = new AbortController();
                const translateId = setTimeout(() => translateController.abort(), 4000);
                const res = await fetch('https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify([{ Text: cleanWord }]),
                    signal: translateController.signal
                });
                clearTimeout(translateId);
                
                if (res.ok) {
                    const json = await res.json();
                    if (json && json[0] && json[0].translations && json[0].translations[0]) {
                        return {
                            source: 'edge',
                            data: {
                                word: cleanWord,
                                phonetic: '',
                                translation: json[0].translations[0].text
                            }
                        };
                    }
                }
                throw new Error(`Edge translate API status: ${res.status}`);
            } catch (e) {
                console.error("[Main] Edge translate failed:", e);
                return null;
            }
        }

        async function queryDeepLX(cleanWord, deeplxUrl) {
            const url = deeplxUrl || 'https://deeplx.demo.tar.mil.pl/translate';
            console.log(`[Main] DeepLX Translating: ${cleanWord} via ${url}`);
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 4000);
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: cleanWord,
                        source_lang: "EN",
                        target_lang: "ZH"
                    }),
                    signal: controller.signal
                });
                clearTimeout(id);
                if (res.ok) {
                    const json = await res.json();
                    const translation = json.data || json.translation || (json.translations && json.translations[0]?.text);
                    if (translation) {
                        return {
                            source: 'deeplx',
                            data: {
                                word: cleanWord,
                                phonetic: '',
                                translation: translation
                            }
                        };
                    }
                }
                throw new Error(`DeepLX status: ${res.status}`);
            } catch (e) {
                console.error("[Main] DeepLX translation failed:", e);
                return null;
            }
        }

        async function queryGoogleTranslate(cleanWord) {
            console.log(`[Main] Google Translating: ${cleanWord}`);
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 4000);
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(cleanWord)}`, {
                    signal: controller.signal
                });
                clearTimeout(id);
                if (res.ok) {
                    const json = await res.json();
                    if (json && json[0] && json[0].length > 0) {
                        let fullTranslation = '';
                        for (let segment of json[0]) {
                            if (segment[0]) fullTranslation += segment[0];
                        }
                        if (fullTranslation) {
                            return {
                                source: 'translate-google',
                                data: {
                                    word: cleanWord,
                                    phonetic: '',
                                    translation: fullTranslation
                                }
                            };
                        }
                    }
                }
                throw new Error(`Google Translate status: ${res.status}`);
            } catch (e) {
                console.error("[Main] Google translate failed:", e);
                return null;
            }
        }

        async function queryFreeEngine(cleanWord, config) {
            const engine = config.freeEngine || 'edge';
            let result = null;

            if (engine === 'edge') {
                result = await queryEdgeTranslate(cleanWord);
            } else if (engine === 'deeplx') {
                result = await queryDeepLX(cleanWord, config.deeplxUrl);
            } else if (engine === 'google') {
                result = await queryGoogleTranslate(cleanWord);
            }

            if (result) return result;

            // Fallback chain if preferred engine failed
            console.log(`[Main] Preferred free engine (${engine}) failed, trying fallback Edge translator...`);
            if (engine !== 'edge') {
                result = await queryEdgeTranslate(cleanWord);
                if (result) return result;
            }
            
            console.log(`[Main] Fallback to Google Translate...`);
            if (engine !== 'google') {
                result = await queryGoogleTranslate(cleanWord);
                if (result) return result;
            }

            return null;
        }

        async function fetchPhoneticsInBackground(cleanWord, sender) {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 2000);
                const res = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(cleanWord)}`, { signal: controller.signal });
                clearTimeout(id);
                if (res.ok) {
                    const json = await res.json();
                    let phonetic = '';
                    let ukphone = '';
                    let usphone = '';
                    if (json.ec && json.ec.word && json.ec.word[0]) {
                        const wordObj = json.ec.word[0];
                        ukphone = wordObj.ukphone || '';
                        usphone = wordObj.usphone || '';
                        phonetic = usphone || ukphone || '';
                    } else if (json.ce && json.ce.word && json.ce.word[0]) {
                        const wordObj = json.ce.word[0];
                        phonetic = wordObj.phone || '';
                    }
                    if (ukphone || usphone || phonetic) {
                        sender.send('update-phonetics', {
                            word: cleanWord,
                            ukphone,
                            usphone,
                            phonetic
                        });
                    }
                }
            } catch (e) {
                console.error("[Main] Background phonetic fetch failed:", e);
            }
        }

        ipcMain.handle('search-word', async (event, wordText) => {

            console.log(`[Main] searching for: ${wordText}`);
            if (!wordText) return { error: 'Empty query' };

            let cleanWord = wordText.trim();
            cleanWord = cleanWord.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+|[^a-zA-Z0-9\u4e00-\u9fa5]+$/g, '');
            if (!cleanWord) return { error: 'Empty query' };
            console.log(`[Main] cleaned query: ${cleanWord}`);

            // Check Local DB first
            let stmt = db.prepare('SELECT * FROM words WHERE word = ? COLLATE NOCASE');
            let result = stmt.get(cleanWord);
            
            if (result) return { source: 'local', data: result };

            // Prioritize LLM translation if enabled and API key is set
            const config = syncEngine.getConfig(app) || {};
            if (config.llmEnabled && config.llmKey) {
                console.log(`[Main] Prioritizing LLM translation for: ${cleanWord}`);
                const llmResult = await queryLLM(cleanWord, config);
                if (llmResult) {
                    return llmResult;
                }
                console.log(`[Main] LLM translation failed or timed out, falling back to local/online dictionaries`);
            }

            // Fallback to ECDICT
            if (ecdictDb) {
                stmt = ecdictDb.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE');
                result = stmt.get(cleanWord);
                if (result) return { source: 'ecdict', data: result };
            }

            const isPhrase = cleanWord.includes(' ');

            // Prioritize high-speed racing suggestions for single words before trying heavy/slower translation engines
            if (!isPhrase) {
                try {
                    const racingResult = await Promise.any([
                        // 1. Youdao Suggest API
                        (async () => {
                            const controller = new AbortController();
                            const id = setTimeout(() => controller.abort(), 1500);
                            const res = await fetch(`https://dict.youdao.com/suggest?num=1&ver=3.0&doctype=json&cache=false&le=en&q=${encodeURIComponent(cleanWord)}`, { signal: controller.signal });
                            clearTimeout(id);
                            if (res.ok) {
                                const sugJson = await res.json();
                                if (sugJson && sugJson.data && sugJson.data.entries && sugJson.data.entries.length > 0) {
                                    const explain = sugJson.data.entries[0].explain;
                                    if (explain) {
                                        return {
                                            source: 'youdao-suggest',
                                            data: {
                                                word: cleanWord,
                                                phonetic: '',
                                                translation: explain
                                            }
                                        };
                                    }
                                }
                            }
                            throw new Error("Youdao Suggest failed");
                        })(),
                        // 2. Baidu Suggestion API
                        (async () => {
                            const controller = new AbortController();
                            const id = setTimeout(() => controller.abort(), 1500);
                            const res = await fetch(`https://fanyi.baidu.com/sug`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                },
                                  body: 'kw=' + encodeURIComponent(cleanWord),
                                signal: controller.signal
                            });
                            clearTimeout(id);
                            if (res.ok) {
                                const json = await res.json();
                                if (json && json.data && json.data.length > 0) {
                                    const translation = json.data.map(item => item.v).join('\n');
                                    if (translation) {
                                        return {
                                            source: 'baidu-suggest',
                                            data: {
                                                word: cleanWord,
                                                phonetic: '',
                                                translation: translation
                                            }
                                        };
                                    }
                                }
                            }
                            throw new Error("Baidu Suggest failed");
                        })()
                    ]);
                    if (racingResult) {
                        fetchPhoneticsInBackground(cleanWord, event.sender);
                        return racingResult;
                    }
                } catch (wordErr) {
                    console.log("[Main] Racing Suggestion APIs failed or timed out, trying full/translation engines...");
                }
            }

            // Query preferred free translation engine (Edge / DeepLX / Google)
            const freeResult = await queryFreeEngine(cleanWord, config);
            if (freeResult) return freeResult;

            if (!isPhrase) {      // Try Youdao full JSONAPI (longer details like phonetics) with a shorter 2s timeout
                try {
                    const controller = new AbortController();
                    const id = setTimeout(() => controller.abort(), 2000);
                    const res = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(cleanWord)}`, { signal: controller.signal });
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

                        if (translation) {
                            return {
                                source: 'online-youdao',
                                data: {
                                    word: cleanWord,
                                    phonetic: phonetic,
                                    ukphone: ukphone,
                                    usphone: usphone,
                                    translation: translation
                                }
                            };
                        }
                    }
                } catch (dictErr) {
                    console.error("Youdao JSONAPI failed:", dictErr);
                }
            }
            
            // Final Fallback (for phrases or when suggestion/JSONAPI failed): Google Translate / MyMemory
            try {
                const gtController = new AbortController();
                const gtId = setTimeout(() => gtController.abort(), 2500); // 2.5s timeout for Google Translate
                const gtRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(cleanWord)}`, { signal: gtController.signal });
                clearTimeout(gtId);
                
                if (gtRes.ok) {
                    const gtJson = await gtRes.json();
                    if (gtJson && gtJson[0] && gtJson[0].length > 0) {
                        let fullTranslation = '';
                        for (let segment of gtJson[0]) {
                            if (segment[0]) fullTranslation += segment[0];
                        }
                        
                        return {
                            source: 'translate-google',
                            data: {
                                word: cleanWord,
                                phonetic: '',
                                translation: fullTranslation
                            }
                        };
                    }
                }
            } catch (gtErr) {
                console.error("Google Translate failed, falling back to MyMemory API", gtErr);
                try {
                    const mmController = new AbortController();
                    const mmId = setTimeout(() => mmController.abort(), 3000); // 3s timeout for MyMemory
                    const mmRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|zh-CN`, { signal: mmController.signal });
                    clearTimeout(mmId);
                    
                    if (mmRes.ok) {
                        const mmJson = await mmRes.json();
                        if (mmJson && mmJson.responseData && mmJson.responseData.translatedText) {
                            return {
                                source: 'translate-mymemory',
                                data: {
                                    word: cleanWord,
                                    phonetic: '',
                                    translation: mmJson.responseData.translatedText
                                }
                            };
                        }
                    }
                } catch (mmErr) {
                    console.error("MyMemory fallback engine also failed", mmErr);
                }
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

        ipcMain.on('toggle-dock', () => {
            if (!flashcardWindow || flashcardWindow.isDestroyed()) return;

            if (!isFlashcardDocked) {
                // Docking
                preDockBounds = flashcardWindow.getBounds();
                
                const { screen } = require('electron');
                const display = screen.getDisplayMatching(preDockBounds);
                const workArea = display.workArea;
                
                const windowCenterX = preDockBounds.x + preDockBounds.width / 2;
                const distanceToLeft = Math.abs(windowCenterX - workArea.x);
                const distanceToRight = Math.abs(windowCenterX - (workArea.x + workArea.width));
                
                let newX;
                if (distanceToLeft < distanceToRight) {
                    dockSide = 'left';
                    newX = workArea.x;
                } else {
                    dockSide = 'right';
                    newX = workArea.x + workArea.width - 45; // 45px collapsed width
                }
                
                isFlashcardDocked = true;
                
                let newY = preDockBounds.y;
                if (newY < workArea.y) newY = workArea.y;
                if (newY + 45 > workArea.y + workArea.height) {
                    newY = workArea.y + workArea.height - 45;
                }
                
                flashcardWindow.setBounds({
                    x: newX,
                    y: newY,
                    width: 45,
                    height: 45
                });
                
                // Disable native window materials for transparency in corners
                if (typeof flashcardWindow.setBackgroundMaterial === 'function') {
                    flashcardWindow.setBackgroundMaterial('none');
                }
                if (typeof flashcardWindow.setVibrancy === 'function') {
                    flashcardWindow.setVibrancy(null);
                }
                
                flashcardWindow.webContents.send('dock-state-changed', true, dockSide);
            } else {
                // Undocking
                isFlashcardDocked = false;
                
                const restoredWidth = 340;
                const restoredHeight = 200;
                
                let newX;
                if (preDockBounds) {
                    if (dockSide === 'right') {
                        const currentBounds = flashcardWindow.getBounds();
                        newX = currentBounds.x + currentBounds.width - restoredWidth;
                    } else {
                        newX = flashcardWindow.getBounds().x;
                    }
                    
                    const { screen } = require('electron');
                    const display = screen.getDisplayMatching({ x: newX, y: preDockBounds.y, width: restoredWidth, height: restoredHeight });
                    const workArea = display.workArea;
                    
                    if (newX < workArea.x) newX = workArea.x;
                    if (newX + restoredWidth > workArea.x + workArea.width) {
                        newX = workArea.x + workArea.width - restoredWidth;
                    }
                    
                    let newY = preDockBounds.y;
                    if (newY < workArea.y) newY = workArea.y;
                    if (newY + restoredHeight > workArea.y + workArea.height) {
                        newY = workArea.y + workArea.height - restoredHeight;
                    }
                    
                    flashcardWindow.setBounds({
                        x: newX,
                        y: newY,
                        width: restoredWidth,
                        height: restoredHeight
                    });
                } else {
                    const { screen } = require('electron');
                    const primaryDisplay = screen.getPrimaryDisplay();
                    const { width, height } = primaryDisplay.workAreaSize;
                    flashcardWindow.setBounds({
                        x: width - 360,
                        y: height - 200,
                        width: restoredWidth,
                        height: restoredHeight
                    });
                }
                
                // Restore native window materials
                if (typeof flashcardWindow.setBackgroundMaterial === 'function') {
                    flashcardWindow.setBackgroundMaterial('acrylic');
                }
                if (typeof flashcardWindow.setVibrancy === 'function') {
                    flashcardWindow.setVibrancy('popover');
                }
                
                flashcardWindow.webContents.send('dock-state-changed', false, dockSide);
            }
        });


        ipcMain.on('snap-to-edge', () => {
            if (!flashcardWindow || flashcardWindow.isDestroyed() || !isFlashcardDocked) return;
            
            const currentBounds = flashcardWindow.getBounds();
            const { screen } = require('electron');
            const display = screen.getDisplayMatching(currentBounds);
            const workArea = display.workArea;
            
            const windowCenterX = currentBounds.x + currentBounds.width / 2;
            const distanceToLeft = Math.abs(windowCenterX - workArea.x);
            const distanceToRight = Math.abs(windowCenterX - (workArea.x + workArea.width));
            
            let newX;
            if (distanceToLeft < distanceToRight) {
                dockSide = 'left';
                newX = workArea.x;
            } else {
                dockSide = 'right';
                newX = workArea.x + workArea.width - 45;
            }
            
            let newY = currentBounds.y;
            if (newY < workArea.y) newY = workArea.y;
            if (newY + 45 > workArea.y + workArea.height) {
                newY = workArea.y + workArea.height - 45;
            }
            
            flashcardWindow.setBounds({
                x: newX,
                y: newY,
                width: 45,
                height: 45
            });
            
            // Update preDockBounds so when they undock, it restores to this height!
            if (preDockBounds) {
                preDockBounds.y = newY;
            }
            
            flashcardWindow.webContents.send('dock-state-changed', true, dockSide);
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

        ipcMain.handle('set-llm-config', (event, llmConfig) => {
            const currentCfg = syncEngine.getConfig(app) || {};
            currentCfg.llmEnabled = llmConfig.llmEnabled;
            currentCfg.llmProvider = llmConfig.llmProvider;
            currentCfg.llmUrl = llmConfig.llmUrl;
            currentCfg.llmKey = llmConfig.llmKey;
            currentCfg.llmModel = llmConfig.llmModel;
            syncEngine.setConfig(app, currentCfg);
            return true;
        });

        ipcMain.handle('set-free-engine-config', (event, freeConfig) => {
            const currentCfg = syncEngine.getConfig(app) || {};
            currentCfg.freeEngine = freeConfig.freeEngine;
            currentCfg.deeplxUrl = freeConfig.deeplxUrl;
            syncEngine.setConfig(app, currentCfg);
            return true;
        });

        ipcMain.handle('set-screenshot-config', (event, screenshotConfig) => {
            const currentCfg = syncEngine.getConfig(app) || {};
            const oldScreenshotShortcut = currentCfg.screenshotShortcut;
            
            if (screenshotConfig.hasOwnProperty('screenshotShortcut')) {
                currentCfg.screenshotShortcut = screenshotConfig.screenshotShortcut;
            }
            if (screenshotConfig.hasOwnProperty('ocrEngine')) {
                currentCfg.ocrEngine = screenshotConfig.ocrEngine;
            }
            if (screenshotConfig.hasOwnProperty('ocrApiKey')) {
                currentCfg.ocrApiKey = screenshotConfig.ocrApiKey;
            }
            if (screenshotConfig.hasOwnProperty('youdaoOcrAppKey')) {
                currentCfg.youdaoOcrAppKey = screenshotConfig.youdaoOcrAppKey;
            }
            if (screenshotConfig.hasOwnProperty('youdaoOcrSecretKey')) {
                currentCfg.youdaoOcrSecretKey = screenshotConfig.youdaoOcrSecretKey;
            }
            if (screenshotConfig.hasOwnProperty('ocrLang')) {
                currentCfg.ocrLang = screenshotConfig.ocrLang;
            }
            syncEngine.setConfig(app, currentCfg);
            
            const result = setupGlobalShortcuts();
            
            // Check screenshotOk if screenshotShortcut was explicitly changed/provided
            if (screenshotConfig.hasOwnProperty('screenshotShortcut') && !result.screenshotOk) {
                console.error("Failed to register new screenshot shortcut, restoring old:", screenshotConfig.screenshotShortcut);
                currentCfg.screenshotShortcut = oldScreenshotShortcut;
                syncEngine.setConfig(app, currentCfg);
                setupGlobalShortcuts();
                return { success: false, error: 'Shortcut already in use or invalid' };
            }
            
            return { success: true };
        });

        ipcMain.on('trigger-screenshot', () => {
            triggerScreenshotTranslation();
        });

        ipcMain.handle('get-screenshot-image', () => {
            return lastScreenshotDataUrl;
        });

        ipcMain.on('close-screenshot', () => {
            if (screenshotWindow) {
                screenshotWindow.close();
            }
            if (inputWindow) {
                inputWindow.show();
                inputWindow.focus();
            }
        });

        ipcMain.handle('complete-screenshot', async (event, croppedBase64) => {
            if (screenshotWindow) {
                screenshotWindow.close();
            }
            
            if (inputWindow) {
                inputWindow.show();
                inputWindow.focus();
                inputWindow.webContents.send('screenshot-ocr-start');
            }

            const config = syncEngine.getConfig(app) || {};
            try {
                const recognizedText = await performOCR(croppedBase64, config);
                if (inputWindow) {
                    inputWindow.webContents.send('screenshot-ocr-success', recognizedText);
                }
                return { success: true };
            } catch (err) {
                if (inputWindow) {
                    inputWindow.webContents.send('screenshot-ocr-error', err.message || err);
                }
                return { success: false, error: err.message || err };
            }
        });



        ipcMain.handle('test-llm-connection', async (event, llmConfig) => {
            const { llmProvider, llmUrl, llmKey, llmModel } = llmConfig;
            if (!llmKey) return { success: false, error: 'API Key cannot be empty.' };
            
            const baseUrl = (llmUrl || 'https://api.deepseek.com/v1').replace(/\/$/, '');
            const url = `${baseUrl}/chat/completions`;
            
            const payload = {
                model: llmModel || 'deepseek-chat',
                messages: [
                    { role: 'user', content: 'Say OK' }
                ],
                max_tokens: 10
            };

            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 6000); // 6s timeout for testing
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${llmKey}`
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(id);
                if (res.ok) {
                    const json = await res.json();
                    if (json.choices && json.choices[0]) {
                        return { success: true };
                    }
                }
                const text = await res.text();
                return { success: false, error: `HTTP ${res.status}: ${text.substring(0, 150)}` };
            } catch (err) {
                return { success: false, error: err.message };
            }
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
            const currentCfg = syncEngine.getConfig(app) || {};
            const oldShortcut = currentCfg.shortcut;
            currentCfg.shortcut = newShortcut;
            syncEngine.setConfig(app, currentCfg);
            
            const result = setupGlobalShortcuts();
            if (result.searchOk) {
                return { success: true };
            } else {
                console.error("Failed to register search shortcut, restoring old:", newShortcut);
                currentCfg.shortcut = oldShortcut;
                syncEngine.setConfig(app, currentCfg);
                setupGlobalShortcuts();
                return { error: 'Invalid shortcut combination' };
            }
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

        // --- Updater IPCs ---
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false; // We want manual control or explicit

        ipcMain.handle('check-update', async () => {
            try {
                if (!app.isPackaged) return { success: false, error: 'Updater not available in development mode' };
                const result = await autoUpdater.checkForUpdates();
                return { success: true, updateInfo: result.updateInfo };
            } catch (err) {
                console.error("Update check failed:", err);
                return { success: false, error: err.message };
            }
        });

        ipcMain.handle('download-update', async () => {
            try {
                await autoUpdater.downloadUpdate();
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        });

        ipcMain.handle('install-update', () => {
            autoUpdater.quitAndInstall();
        });

        ipcMain.handle('get-version', () => {
            return app.getVersion();
        });

        let hasNotifiedUpdate = false;
        let pendingUpdateInfo = null;
        
        const notifyDashboardUpdate = (msg) => {
            if (msg.type === 'update-available') {
                pendingUpdateInfo = msg.info;
            }

            if (dashboardWindow && !dashboardWindow.isDestroyed()) {
                dashboardWindow.webContents.send('update-message', msg);
            }
            // If it's a new update available, throw a system notification as a reminder
            if (msg.type === 'update-available' && !hasNotifiedUpdate) {
                hasNotifiedUpdate = true;
                const { Notification } = require('electron');
                if (Notification.isSupported()) {
                    const isZh = app.getLocale().toLowerCase().startsWith('zh');
                    const notification = new Notification({
                        title: isZh ? '识光 - 发现新版本' : 'Lumina Update Available',
                        body: isZh 
                            ? `更新版本 ${msg.info.version} 已推送！点击此处立即下载并更新。` 
                            : `Version ${msg.info.version} is out! Click here to download and apply.`,
                        icon: iconPath,
                        timeoutType: 'never'
                    });
                    notification.on('click', () => {
                        openDashboard();
                        // Wait a brief moment to ensure window is ready/focused and UI is loaded
                        setTimeout(() => {
                           if (dashboardWindow && !dashboardWindow.isDestroyed()) {
                               // Restore update UI state in case it was a cold start
                               dashboardWindow.webContents.send('update-message', { type: 'update-available', info: pendingUpdateInfo });
                               // Trigger the download automatically
                               dashboardWindow.webContents.send('update-message', { type: 'trigger-download' });
                           }
                        }, 500); 
                    });
                    notification.show();
                }
            }
        };

        autoUpdater.on('update-available', (info) => notifyDashboardUpdate({ type: 'update-available', info }));
        autoUpdater.on('update-not-available', (info) => notifyDashboardUpdate({ type: 'update-not-available', info }));
        autoUpdater.on('download-progress', (progressObj) => notifyDashboardUpdate({ type: 'download-progress', progress: progressObj }));
        autoUpdater.on('update-downloaded', (info) => notifyDashboardUpdate({ type: 'update-downloaded', info }));
        autoUpdater.on('error', (err) => notifyDashboardUpdate({ type: 'error', error: err.message }));

        ipcMain.handle('get-autoupdate', () => {
            const cfg = syncEngine.getConfig(app) || {};
            return cfg.autoUpdateEnabled !== false;
        });

        ipcMain.handle('set-autoupdate', (event, enable) => {
            const currentCfg = syncEngine.getConfig(app) || {};
            currentCfg.autoUpdateEnabled = enable;
            syncEngine.setConfig(app, currentCfg);
            return enable;
        });

        // Initial silent check
        setTimeout(() => {
            const cfg = syncEngine.getConfig(app) || {};
            if (cfg.autoUpdateEnabled !== false && app.isPackaged) {
                autoUpdater.checkForUpdates().catch(()=>{});
            }
        }, 8000);
        // --- Updater IPCs ---

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
