const electron = require('electron');
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, nativeTheme, systemPreferences, shell } = electron;
let globalShortcut = electron.globalShortcut;

if (process.env.PLAYWRIGHT_TEST === 'true') {
    const registeredShortcuts = new Set();
    const mock = {
        register: (shortcut, callback) => {
            registeredShortcuts.add(shortcut);
            return true;
        },
        unregister: (shortcut) => {
            registeredShortcuts.delete(shortcut);
            return true;
        },
        unregisterAll: () => {
            registeredShortcuts.clear();
        },
        isRegistered: (shortcut) => {
            return registeredShortcuts.has(shortcut);
        }
    };
    global.globalShortcutMock = mock;
    globalShortcut = mock;
}

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { initDb } = require('./utils/db');
const { calculateNextReview } = require('./utils/sm2');
const { translateWithPreservation } = require('./utils/preservation');
const syncEngine = require('./utils/sync');
const ocrEngine = require('./utils/ocr');
const translator = require('./utils/translator');
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
        tray.on('click', () => {
            openDashboard();
        });

        // 2.1 macOS Dock Menu Configuration
        if (process.platform === 'darwin' && app.dock) {
            const dockMenu = Menu.buildFromTemplate([
                { label: '打开生词本中心 (Dashboard)', click: () => openDashboard() },
                { label: '🔍 查词面板 (Search Word)', click: () => { inputWindow.show(); inputWindow.focus(); } },
                { label: '🎲 碎片复习 (Shuffle Play)', click: () => checkReviewQueue() }
            ]);
            app.dock.setMenu(dockMenu);
        }

        // 3. Create the frameless Spotlight Input Window
        inputWindow = new BrowserWindow({
            width: 800,
            height: 450,
            frame: false,
            transparent: true,
            backgroundColor: '#00000000',
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
            backgroundColor: '#00000000',
            hasShadow: false, // Turn off native OS rectangular shadow to remove grey corners
            resizable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            show: false,
            ...(process.platform === 'win32' ? { backgroundMaterial: 'none' } : {}),
            icon: iconPath,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });
        if (typeof flashcardWindow.setBackgroundColor === 'function') {
            flashcardWindow.setBackgroundColor('#00000000');
        }
        
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        
        let initialConfig = syncEngine.getConfig(app) || {};
        if (initialConfig.flashcardX !== undefined && initialConfig.flashcardY !== undefined) {
             flashcardWindow.setPosition(initialConfig.flashcardX, initialConfig.flashcardY);
        } else {
             flashcardWindow.setPosition(width - 360, height - 200);
        }
        
        // Track position to save it (debounced to avoid blocking disk I/O during drag)
        flashcardWindow.on('moved', () => {
             if (isFlashcardDocked) return;
             const [x, y] = flashcardWindow.getPosition();
             const currentConfig = syncEngine.getConfig(app) || {};
             currentConfig.flashcardX = x;
             currentConfig.flashcardY = y;
             syncEngine.setConfigDebounced(app, currentConfig, 300);
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

            console.log(`[Main] Registered shortcuts -> Search: ${searchShortcut} (${searchOk ? 'OK' : 'FAILED'}), Screenshot: ${screenshotShortcut} (${screenshotOk ? 'OK' : 'FAILED'})`);

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

        function checkScreenPermission() {
            if (process.platform === 'darwin') {
                try {
                    const status = systemPreferences.getMediaAccessStatus ? systemPreferences.getMediaAccessStatus('screen') : 'granted';
                    console.log("[Main] macOS screen mediaAccessStatus:", status);
                    if (status === 'denied' || status === 'restricted') {
                        app.focus({ steal: true });
                        const appTargetName = app.isPackaged ? 'Lumina (识光)' : 'Electron';
                        dialog.showMessageBox({
                            type: 'warning',
                            title: '屏幕录制权限未授予',
                            message: '识光 (Lumina) 需要屏幕录制权限',
                            detail: `macOS 安全机制要求授予屏幕录制权限后方可划选截屏。\n\n⚠️ 重要提示：在本地开发运行环境下，请在系统设置中找到并勾选允许【${appTargetName}】（非打包状态下显示为 Electron）。\n\n开启权限后重新按下快捷键即可正常截屏。`,
                            buttons: ['打开系统设置', '稍后再说'],
                            defaultId: 0
                        }).then(({ response }) => {
                            if (response === 0) {
                                shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
                            }
                        });
                        return false;
                    }
                } catch (e) {
                    console.error("[Main] Error checking screen permission:", e);
                }
            }
            return true;
        }

        async function triggerScreenshotTranslation() {
            try {
                if (screenshotWindow) return;

                if (!checkScreenPermission()) {
                    return;
                }

                const wasInputVisible = inputWindow && inputWindow.isVisible();
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
                            backgroundColor: '#00000000',
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
                            screenshotWindow.setAlwaysOnTop(true, 'screen-saver');
                            screenshotWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                            screenshotWindow.setSimpleFullScreen(true);
                        }

                        screenshotWindow.loadFile(path.join(__dirname, 'src', 'screenshot.html'));
                        screenshotWindow.show();
                        screenshotWindow.focus();
                        
                        screenshotWindow.on('closed', () => {
                            screenshotWindow = null;
                        });

                    } catch (err) {
                        console.error("Screenshot capture failed:", err);
                        if (wasInputVisible && inputWindow) inputWindow.show();
                        if (wasFlashcardVisible && flashcardWindow) flashcardWindow.show();
                        if (process.platform === 'darwin') {
                            dialog.showMessageBox({
                                type: 'warning',
                                title: '屏幕捕获受阻',
                                message: '无法获取屏幕画面',
                                detail: 'macOS 屏幕录制权限可能已被关闭或尚未生效。\n\n请前往「系统设置 ➔ 隐私与安全性 ➔ 屏幕录制」确认已勾选允许。',
                                buttons: ['前往系统设置', '取消'],
                                defaultId: 0
                            }).then(({ response }) => {
                                if (response === 0) {
                                    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
                                }
                            });
                        }
                    }
                }, 150);
            } catch (outerErr) {
                console.error("triggerScreenshotTranslation unexpected error:", outerErr);
            }
        }

        async function performOCR(base64Image, config, overrideLang = null) {
            return ocrEngine.performOCR(base64Image, config, overrideLang, app);
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


        ipcMain.handle('search-word', async (event, wordText) => {
            console.log(`[Main] searching for: ${wordText}`);
            if (!wordText) return { error: 'Empty query' };

            let cleanWord = wordText.trim();
            cleanWord = cleanWord.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+|[^a-zA-Z0-9\u4e00-\u9fa5]+$/g, '');
            if (!cleanWord) return { error: 'Empty query' };
            console.log(`[Main] cleaned query: ${cleanWord}`);

            const config = syncEngine.getConfig(app) || {};
            return translator.searchWordCascade({
                cleanWord,
                db,
                ecdictDb,
                config,
                sender: event.sender
            });
        });


        ipcMain.handle('save-word', async (event, wordData) => {
            // Save to local SQLite
            try {
                // Deduplicate explicitly (ignore case and spacing)
                const safeWord = (wordData.word || '').toLowerCase().trim();
                
                let imagePath = null;
                if (wordData.image && typeof wordData.image === 'string' && wordData.image.startsWith('data:image')) {
                    try {
                        const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
                        if (!fs.existsSync(screenshotsDir)) {
                            fs.mkdirSync(screenshotsDir, { recursive: true });
                        }
                        const cleanFilename = safeWord.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_').slice(0, 30);
                        const filename = `${cleanFilename || 'word'}_${Date.now()}.png`;
                        const fullPath = path.join(screenshotsDir, filename);
                        const base64Data = wordData.image.replace(/^data:image\/\w+;base64,/, '');
                        fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
                        imagePath = fullPath;
                        console.log(`[Main] Saved screenshot for '${safeWord}' to: ${imagePath}`);
                    } catch (imgErr) {
                        console.error("[Main] Failed to save screenshot image:", imgErr);
                    }
                }
                
                // Pre-flight check for case-insensitive matches
                const existing = db.prepare('SELECT id, image_path FROM words WHERE LOWER(word) = ?').get(safeWord);
                if (existing) {
                    // If existing word doesn't have an image but new save does, update it
                    if (!existing.image_path && imagePath) {
                        db.prepare('UPDATE words SET image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(imagePath, existing.id);
                    }
                    return { success: true, inserted: false, reason: 'duplicate', id: existing.id, imagePath: existing.image_path || imagePath };
                }

                let stmt = db.prepare(`
                    INSERT INTO words (word, translation, phonetic, image_path) 
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(word) DO NOTHING
                `);
                const info = stmt.run(safeWord, wordData.translation, wordData.phonetic, imagePath);
                return { success: true, inserted: info.changes > 0, imagePath };
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
                if (typeof flashcardWindow.setVibrancy === 'function') {
                    flashcardWindow.setVibrancy(null);
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
            const config = syncEngine.getConfig(app) || {};
            const searchShortcut = config.shortcut || 'CommandOrControl+Shift+D';
            const screenshotShortcut = config.screenshotShortcut || 'CommandOrControl+Shift+X';
            let searchShortcutRegistered = false;
            let screenshotShortcutRegistered = false;
            try {
                searchShortcutRegistered = globalShortcut.isRegistered(searchShortcut);
            } catch(e) {}
            try {
                screenshotShortcutRegistered = globalShortcut.isRegistered(screenshotShortcut);
            } catch(e) {}
            return {
                ...config,
                platform: process.platform,
                ocrEngine: config.ocrEngine || (process.platform === 'darwin' ? 'mac_vision' : 'ocr_space'),
                ocrLang: config.ocrLang || 'auto',
                searchShortcutRegistered,
                screenshotShortcutRegistered
            };
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
                    inputWindow.webContents.send('screenshot-ocr-success', { text: recognizedText, image: croppedBase64 });
                }
                return { success: true };
            } catch (err) {
                if (inputWindow) {
                    inputWindow.webContents.send('screenshot-ocr-error', err.message || err);
                }
                return { success: false, error: err.message || err };
            }
        });

        ipcMain.handle('save-screenshot-image', async (event, payload) => {
            try {
                let base64DataUrl = typeof payload === 'string' ? payload : payload?.image;
                const keepWindow = payload && typeof payload === 'object' && payload.keepWindow;
                if (!base64DataUrl) return { success: false, error: 'No image data' };

                const win = BrowserWindow.fromWebContents(event.sender);
                const isScreenshotWin = (screenshotWindow && win === screenshotWindow);

                if (isScreenshotWin && win && !win.isDestroyed()) {
                    win.hide();
                }

                const defaultFilename = `Lumina_Screenshot_${Date.now()}.png`;
                const dialogParent = isScreenshotWin ? undefined : win;
                const { canceled, filePath } = await dialog.showSaveDialog(dialogParent, {
                    title: '保存截图至本地',
                    defaultPath: path.join(app.getPath('downloads'), defaultFilename),
                    filters: [
                        { name: 'PNG Image (*.png)', extensions: ['png'] },
                        { name: 'All Files (*.*)', extensions: ['*'] }
                    ]
                });

                if (canceled || !filePath) {
                    if (isScreenshotWin && win && !win.isDestroyed()) {
                        if (keepWindow) {
                            win.show();
                            win.focus();
                        } else {
                            win.close();
                        }
                    }
                    return { canceled: true };
                }

                const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

                const { Notification } = require('electron');
                if (Notification && Notification.isSupported()) {
                    new Notification({
                        title: '识光 Lumina',
                        body: `截图已保存至：${path.basename(filePath)}`
                    }).show();
                }

                if (isScreenshotWin && win && !win.isDestroyed()) {
                    if (keepWindow) {
                        win.show();
                        win.focus();
                    } else {
                        win.close();
                    }
                }

                return { success: true, filePath };
            } catch (err) {
                console.error("Save screenshot failed:", err);
                return { success: false, error: err.message };
            }
        });

        ipcMain.handle('copy-screenshot-image', (event, base64DataUrl) => {
            try {
                if (!base64DataUrl) return { success: false, error: 'No image data' };
                const { clipboard, nativeImage } = require('electron');
                const img = nativeImage.createFromDataURL(base64DataUrl);
                clipboard.writeImage(img);
                return { success: true };
            } catch (err) {
                console.error("Copy screenshot failed:", err);
                return { success: false, error: err.message };
            }
        });

        ipcMain.handle('get-word-image', (event, imagePath) => {
            try {
                if (!imagePath || !fs.existsSync(imagePath)) return null;
                const fileBuffer = fs.readFileSync(imagePath);
                return `data:image/png;base64,${fileBuffer.toString('base64')}`;
            } catch (err) {
                console.error("Get word image failed:", err);
                return null;
            }
        });

        // Image Text Extraction (OCR) Handlers
        ipcMain.handle('extract-text-from-image', async (event, payload) => {
            try {
                let base64Data = null;
                let lang = null;
                let copyToClipboard = false;

                if (typeof payload === 'string') {
                    if (payload.startsWith('data:image')) {
                        base64Data = payload;
                    } else if (fs.existsSync(payload)) {
                        const fileBuf = fs.readFileSync(payload);
                        const ext = path.extname(payload).toLowerCase().replace('.', '') || 'png';
                        base64Data = `data:image/${ext};base64,${fileBuf.toString('base64')}`;
                    }
                } else if (payload && typeof payload === 'object') {
                    if (payload.image) {
                        if (payload.image.startsWith('data:image')) {
                            base64Data = payload.image;
                        } else if (fs.existsSync(payload.image)) {
                            const fileBuf = fs.readFileSync(payload.image);
                            const ext = path.extname(payload.image).toLowerCase().replace('.', '') || 'png';
                            base64Data = `data:image/${ext};base64,${fileBuf.toString('base64')}`;
                        }
                    }
                    lang = payload.lang;
                    if (payload.copyToClipboard !== undefined) {
                        copyToClipboard = payload.copyToClipboard;
                    }
                }

                if (!base64Data) {
                    return { success: false, error: '无效的图片数据 (Invalid image data)' };
                }

                const config = syncEngine.getConfig(app) || {};
                const engine = config.ocrEngine || (process.platform === 'darwin' ? 'mac_vision' : 'ocr_space');
                const recognizedText = await performOCR(base64Data, config, lang);

                if (copyToClipboard && recognizedText) {
                    const { clipboard } = require('electron');
                    clipboard.writeText(recognizedText);
                }

                return {
                    success: true,
                    text: recognizedText,
                    image: base64Data,
                    engine: engine
                };
            } catch (err) {
                console.error("[Main] Extract text from image failed:", err);
                return { success: false, error: err.message || '文字提取失败' };
            }
        });

        ipcMain.handle('open-image-ocr-dialog', async (event) => {
            try {
                const { canceled, filePaths } = await dialog.showOpenDialog({
                    title: '选择需要提取文字的图片',
                    properties: ['openFile'],
                    filters: [
                        { name: '图片文件 (*.png;*.jpg;*.jpeg;*.webp;*.bmp;*.gif)', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] },
                        { name: '所有文件 (*.*)', extensions: ['*'] }
                    ]
                });

                if (canceled || !filePaths || filePaths.length === 0) {
                    return { canceled: true };
                }

                const filePath = filePaths[0];
                const fileBuf = fs.readFileSync(filePath);
                const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'png';
                const base64Data = `data:image/${ext};base64,${fileBuf.toString('base64')}`;

                const config = syncEngine.getConfig(app) || {};
                const recognizedText = await performOCR(base64Data, config);

                return {
                    success: true,
                    filePath,
                    image: base64Data,
                    text: recognizedText
                };
            } catch (err) {
                console.error("[Main] Open image OCR failed:", err);
                return { success: false, error: err.message || '文件读取或识别失败' };
            }
        });

        ipcMain.handle('save-text-file', async (event, content, defaultName = 'extracted_text.txt') => {
            try {
                const { canceled, filePath } = await dialog.showSaveDialog({
                    title: '导出提取文字',
                    defaultPath: path.join(app.getPath('downloads'), defaultName),
                    filters: [
                        { name: '文本文档 (*.txt)', extensions: ['txt'] },
                        { name: 'Markdown (*.md)', extensions: ['md'] },
                        { name: '所有文件 (*.*)', extensions: ['*'] }
                    ]
                });
                if (canceled || !filePath) return { canceled: true };
                fs.writeFileSync(filePath, content || '', 'utf8');
                return { success: true, filePath };
            } catch (err) {
                console.error("Save text file failed:", err);
                return { success: false, error: err.message };
            }
        });

        ipcMain.handle('copy-text-to-clipboard', (event, text) => {
            try {
                if (text) {
                    const { clipboard } = require('electron');
                    clipboard.writeText(text);
                }
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        });

        ipcMain.handle('test-llm-connection', async (event, llmConfig) => {
            return translator.testLlmConnection(llmConfig);
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
        // --- Updater IPCs ---
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false; // We want manual control or explicit

        let isInitialSilentCheck = true;

        function sanitizeUpdateError(err) {
            if (!err) return '未知更新错误';
            const raw = typeof err === 'string' ? err : (err.message || String(err));
            if (raw.includes('404')) {
                return '暂未检测到匹配当前系统架构的更新通道文件 (404: latest-mac.yml)';
            }
            if (raw.includes('ETIMEDOUT') || raw.includes('ENOTFOUND') || raw.includes('timeout') || raw.includes('net::ERR_')) {
                return '更新检测网络连接超时，请检查网络设置或稍后重试';
            }
            const firstLine = raw.split('\n')[0].replace(/^Error:\s*/i, '');
            return firstLine.slice(0, 120);
        }

        function setPrimaryFeedUrl() {
            autoUpdater.setFeedURL({
                provider: 'generic',
                url: 'https://dict-app-web.vercel.app/'
            });
        }
        setPrimaryFeedUrl();

        ipcMain.handle('check-update', async () => {
            isInitialSilentCheck = false;
            try {
                if (!app.isPackaged) return { success: false, error: '开发模式下不支持自动更新检测' };
                // Ensure primary feed is tried first
                setPrimaryFeedUrl();
                try {
                    const result = await autoUpdater.checkForUpdates();
                    return { success: true, updateInfo: result.updateInfo };
                } catch (genericErr) {
                    console.warn("[AutoUpdater] Generic feed failed, falling back to GitHub Releases...", genericErr.message);
                    autoUpdater.setFeedURL({
                        provider: 'github',
                        owner: 'janzlu',
                        repo: 'dict-app'
                    });
                    const result = await autoUpdater.checkForUpdates();
                    return { success: true, updateInfo: result.updateInfo };
                }
            } catch (err) {
                console.error("Update check failed:", err);
                const friendlyMsg = sanitizeUpdateError(err);
                notifyDashboardUpdate({ type: 'error', error: friendlyMsg });
                return { success: false, error: friendlyMsg };
            }
        });

        ipcMain.handle('download-update', async () => {
            try {
                await autoUpdater.downloadUpdate();
                return { success: true };
            } catch (err) {
                return { success: false, error: sanitizeUpdateError(err) };
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
        autoUpdater.on('error', (err) => {
            console.error("AutoUpdater Error:", err);
            // Suppress error banner during initial silent background check
            if (isInitialSilentCheck) {
                console.log("[AutoUpdater] Suppressed error banner during initial silent check");
                return;
            }
            notifyDashboardUpdate({ type: 'error', error: sanitizeUpdateError(err) });
        });

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
                autoUpdater.checkForUpdates().catch((err) => {
                    console.log("[AutoUpdater] Silent background check caught:", err.message);
                });
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
            openDashboard();
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
