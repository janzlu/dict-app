const { contextBridge, ipcRenderer } = require('electron');

function registerChannelListener(channel, callback) {
    ipcRenderer.removeAllListeners(channel);
    const handler = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('api', {
    searchWord: (text) => ipcRenderer.invoke('search-word', text),
    saveWord: (wordData) => ipcRenderer.invoke('save-word', wordData),
    hideWindow: () => ipcRenderer.send('hide-window'),
    resizeWindow: (height) => ipcRenderer.send('resize-window', height),
    onReviewWord: (callback) => registerChannelListener('review-word', callback),
    submitReview: (id, mastery, score) => ipcRenderer.send('submit-review', id, mastery, score),
    hideFlashcard: () => ipcRenderer.send('hide-flashcard'),
    setIgnoreMouse: (ignore, options) => ipcRenderer.send('set-ignore-mouse', ignore, options),
    moveFlashcardBy: (dx, dy) => ipcRenderer.send('move-flashcard-by', dx, dy),
    toggleDock: () => ipcRenderer.send('toggle-dock'),
    snapToEdge: () => ipcRenderer.send('snap-to-edge'),
    onDockStateChanged: (callback) => registerChannelListener('dock-state-changed', callback),
    
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
    onUpdateMessage: (callback) => registerChannelListener('update-message', callback),
    getAutoUpdate: () => ipcRenderer.invoke('get-autoupdate'),
    setAutoUpdate: (enabled) => ipcRenderer.invoke('set-autoupdate', enabled),
    getVersion: () => ipcRenderer.invoke('get-version'),
    
    setLlmConfig: (config) => ipcRenderer.invoke('set-llm-config', config),
    testLlmConnection: (config) => ipcRenderer.invoke('test-llm-connection', config),
    setFreeEngineConfig: (config) => ipcRenderer.invoke('set-free-engine-config', config),
    setScreenshotConfig: (config) => ipcRenderer.invoke('set-screenshot-config', config),
    
    
    // Auto-clipboard
    onClipboardData: (callback) => registerChannelListener('clipboard-data', callback),
    onUpdatePhonetics: (callback) => registerChannelListener('update-phonetics', callback),
    isTest: process.env.PLAYWRIGHT_TEST === 'true',

    // Screenshot Translation & Saving
    triggerScreenshot: () => ipcRenderer.send('trigger-screenshot'),
    getScreenshotImage: () => ipcRenderer.invoke('get-screenshot-image'),
    closeScreenshot: () => ipcRenderer.send('close-screenshot'),
    completeScreenshot: (croppedBase64) => ipcRenderer.invoke('complete-screenshot', croppedBase64),
    saveScreenshotImage: (base64) => ipcRenderer.invoke('save-screenshot-image', base64),
    copyScreenshotImage: (base64) => ipcRenderer.invoke('copy-screenshot-image', base64),
    getWordImage: (imagePath) => ipcRenderer.invoke('get-word-image', imagePath),
    onScreenshotOcrStart: (callback) => registerChannelListener('screenshot-ocr-start', callback),
    onScreenshotOcrSuccess: (callback) => registerChannelListener('screenshot-ocr-success', callback),
    onScreenshotOcrError: (callback) => registerChannelListener('screenshot-ocr-error', callback),

    // Image Text Extraction (OCR)
    extractTextFromImage: (payload) => ipcRenderer.invoke('extract-text-from-image', payload),
    openImageOcrDialog: () => ipcRenderer.invoke('open-image-ocr-dialog'),
    saveTextFile: (content, defaultName) => ipcRenderer.invoke('save-text-file', content, defaultName),
    copyTextToClipboard: (text) => ipcRenderer.invoke('copy-text-to-clipboard', text)
});
