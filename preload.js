const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    searchWord: (text) => ipcRenderer.invoke('search-word', text),
    saveWord: (wordData) => ipcRenderer.invoke('save-word', wordData),
    hideWindow: () => ipcRenderer.send('hide-window'),
    resizeWindow: (height) => ipcRenderer.send('resize-window', height),
    onReviewWord: (callback) => ipcRenderer.on('review-word', (e, w) => callback(w)),
    submitReview: (id, mastery, score) => ipcRenderer.send('submit-review', id, mastery, score),
    hideFlashcard: () => ipcRenderer.send('hide-flashcard'),
    setIgnoreMouse: (ignore, options) => ipcRenderer.send('set-ignore-mouse', ignore, options),
    moveFlashcardBy: (dx, dy) => ipcRenderer.send('move-flashcard-by', dx, dy),
    toggleDock: () => ipcRenderer.send('toggle-dock'),
    snapToEdge: () => ipcRenderer.send('snap-to-edge'),
    onDockStateChanged: (callback) => ipcRenderer.on('dock-state-changed', (e, isDocked, side) => callback(isDocked, side)),
    
    // Phase 4: Dashboard & Sync
    getAllWords: () => ipcRenderer.invoke('get-all-words'),
    getAnalytics: () => ipcRenderer.invoke('get-analytics'),
    getSyncConfig: () => ipcRenderer.invoke('get-sync-config'),
    selectSyncFolder: () => ipcRenderer.invoke('select-sync-folder'),
    setSyncFolder: (path) => ipcRenderer.invoke('set-sync-folder', path),
    forceSync: () => ipcRenderer.invoke('force-sync'),
    setShortcut: (keys) => ipcRenderer.invoke('set-shortcut', keys),
    deleteWord: (id) => ipcRenderer.invoke('delete-word', id),
    getAutoStart: () => ipcRenderer.invoke('get-autostart'),
    setAutoStart: (enabled) => ipcRenderer.invoke('set-autostart', enabled),
    getAutoPopup: () => ipcRenderer.invoke('get-autopopup'),
    setAutoPopup: (enabled) => ipcRenderer.invoke('set-autopopup', enabled),
    getAutoReview: () => ipcRenderer.invoke('get-autoreview'),
    setAutoReview: (enabled) => ipcRenderer.invoke('set-autoreview', enabled),
    getTheme: () => ipcRenderer.invoke('get-theme'),
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    startShufflePlay: () => ipcRenderer.send('start-shuffle-play'),
    startAutoSlideshow: () => ipcRenderer.send('start-auto-slideshow'),
    slideshowNext: () => ipcRenderer.send('slideshow-next'),
    
    // Auto Updater
    checkUpdate: () => ipcRenderer.invoke('check-update'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateMessage: (callback) => ipcRenderer.on('update-message', (e, msg) => callback(msg)),
    getAutoUpdate: () => ipcRenderer.invoke('get-autoupdate'),
    setAutoUpdate: (enabled) => ipcRenderer.invoke('set-autoupdate', enabled),
    getVersion: () => ipcRenderer.invoke('get-version'),
    
    setLlmConfig: (config) => ipcRenderer.invoke('set-llm-config', config),
    testLlmConnection: (config) => ipcRenderer.invoke('test-llm-connection', config),
    setFreeEngineConfig: (config) => ipcRenderer.invoke('set-free-engine-config', config),
    setScreenshotConfig: (config) => ipcRenderer.invoke('set-screenshot-config', config),
    
    
    // Auto-clipboard
    onClipboardData: (callback) => ipcRenderer.on('clipboard-data', (e, text) => callback(text)),
    onUpdatePhonetics: (callback) => ipcRenderer.on('update-phonetics', (e, data) => callback(data)),
    isTest: process.env.PLAYWRIGHT_TEST === 'true',

    // Screenshot Translation
    triggerScreenshot: () => ipcRenderer.send('trigger-screenshot'),
    getScreenshotImage: () => ipcRenderer.invoke('get-screenshot-image'),
    closeScreenshot: () => ipcRenderer.send('close-screenshot'),
    completeScreenshot: (croppedBase64) => ipcRenderer.invoke('complete-screenshot', croppedBase64),
    onScreenshotOcrStart: (callback) => ipcRenderer.on('screenshot-ocr-start', () => callback()),
    onScreenshotOcrSuccess: (callback) => ipcRenderer.on('screenshot-ocr-success', (e, text) => callback(text)),
    onScreenshotOcrError: (callback) => ipcRenderer.on('screenshot-ocr-error', (e, err) => callback(err))
});
