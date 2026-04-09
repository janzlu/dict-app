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
    
    // Auto-clipboard
    onClipboardData: (callback) => ipcRenderer.on('clipboard-data', (e, text) => callback(text))
});
