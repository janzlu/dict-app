const navWords = document.getElementById('navWords');
const navSettings = document.getElementById('navSettings');
const viewWords = document.getElementById('viewWords');
const viewSettings = document.getElementById('viewSettings');

const tbody = document.getElementById('wordTableBody');
const totalWordsLabel = document.getElementById('totalWords');
const masteredWordsLabel = document.getElementById('masteredWords');

const btnSelectFolder = document.getElementById('btnSelectFolder');
const syncPathInput = document.getElementById('syncPathInput');
const syncStatusText = document.getElementById('syncStatusText');
const btnForceSync = document.getElementById('btnForceSync');

// i18n
const locales = {
    en: {
        nav_wordbook: "Wordbook",
        nav_settings: "Settings & Sync",
        title_wordbook: "Wordbook Asset",
        th_word: "Word",
        th_translation: "Translation",
        th_mastery: "Mastery",
        th_next_review: "Next Review",
        th_action: "Action",
        title_settings: "Zero Server Sync",
        desc_settings: "Select a folder inside your cloud drive (e.g. OneDrive, Dropbox) to keep your devices in sync fully automatically.",
        label_shortcut: "Spotlight Global Shortcut",
        hint_shortcut: "Modifiers: Command, Control, Alt, Shift. Example: Alt+Space",
        btn_save_shortcut: "Save Shortcut",
        label_sync_path: "Sync Folder Path",
        btn_select_folder: "Select Folder",
        status_prefix: "Status: ",
        btn_force_sync: "Force Sync Now",
        label_language: "Interface Language",
        btn_del: "Del",
        label_autostart: "Start on Boot",
        desc_autostart: "Launch DictApp silently in the tray when you sign in",
        label_autopopup: "Clipboard Auto-Pop",
        desc_autopopup: "Automatically show Spotlight when a short English text is copied"
    },
    zh: {
        nav_wordbook: "生词本",
        nav_settings: "设置与同步",
        title_wordbook: "生词本总览",
        th_word: "单词",
        th_translation: "自动释义",
        th_mastery: "熟练度",
        th_next_review: "下次复习",
        th_action: "操作",
        title_settings: "免服务无感跨端同步",
        desc_settings: "请指定你云盘的某个专用文件夹（如 OneDrive等），后台便会静默将你的背诵进度和词库进行多设备双向极速合并同步。",
        label_shortcut: "聚合查词全域快捷键",
        hint_shortcut: "修饰键: Command, Control, Alt, Shift。例如: Alt+Space",
        btn_save_shortcut: "应用快捷键配置",
        label_sync_path: "网盘数据链路目录",
        btn_select_folder: "浏览文件夹",
        status_prefix: "驱动状态：",
        btn_force_sync: "手动执行硬同步校验",
        label_language: "客户端界面展现语言",
        btn_del: "删除条目",
        label_autostart: "开机自动运行",
        desc_autostart: "系统登录时，自动在后台托盘静默启动此软件引擎",
        label_autopopup: "划词复制唤起",
        desc_autopopup: "默认开启。当您按下复制键提取短语文本时，将零延迟触发弹出大面板进行光速查词"
    }
};

let currentLang = localStorage.getItem('dictapp_lang') || 'en';

function applyLanguage() {
    const texts = locales[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) el.textContent = texts[key];
    });

    // update delete buttons dynamically
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.textContent = texts.btn_del;
    });
}

const languageSelect = document.getElementById('languageSelect');
if (languageSelect) {
    languageSelect.value = currentLang;
    languageSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        localStorage.setItem('dictapp_lang', currentLang);
        applyLanguage();
    });
}


// Navigation
const shortcutInput = document.getElementById('shortcutInput');
const btnSaveShortcut = document.getElementById('btnSaveShortcut');

navWords.addEventListener('click', () => {
    navWords.classList.add('active');
    navSettings.classList.remove('active');
    viewWords.classList.add('active');
    viewSettings.classList.remove('active');
    loadWords();
});

navSettings.addEventListener('click', () => {
    navSettings.classList.add('active');
    navWords.classList.remove('active');
    viewSettings.classList.add('active');
    viewWords.classList.remove('active');
    loadSyncConfig();
});

// Logic
let allWordsData = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;
async function loadWords() {
    try {
        allWordsData = await window.api.getAllWords();

        let masteredCtx = 0;
        allWordsData.forEach(w => {
            if (w.mastery_level === 5) masteredCtx++;
        });

        totalWordsLabel.textContent = allWordsData.length;
        masteredWordsLabel.textContent = masteredCtx;

        const maxPage = Math.ceil(allWordsData.length / ITEMS_PER_PAGE) || 1;
        if (currentPage > maxPage) currentPage = maxPage;

        renderTablePage();
    } catch (err) {
        console.error(err);
    }
}

function renderTablePage() {
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageData = allWordsData.slice(startIndex, endIndex);

    pageData.forEach(w => {
        const tr = document.createElement('tr');
        let reviewText = w.next_review_time ? new Date(w.next_review_time).toLocaleString() : 'N/A';
        if (w.mastery_level === 5) reviewText = 'Mastered';

        tr.innerHTML = `
            <td class="td-word">${w.word}</td>
            <td>${w.translation || ''}</td>
            <td>Lv. ${w.mastery_level}</td>
            <td>${reviewText}</td>
            <td>
                <button class="delete-btn" data-id="${w.id}" title="${locales[currentLang].btn_del}">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm("Are you sure you want to delete this word?")) {
                await window.api.deleteWord(id);
                loadWords();
            }
        });
    });

    updatePaginationControls();
}

function updatePaginationControls() {
    const maxPage = Math.ceil(allWordsData.length / ITEMS_PER_PAGE) || 1;
    const paginationControls = document.getElementById('paginationControls');
    const pageIndicator = document.getElementById('pageIndicator');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');

    if (allWordsData.length > 0) {
        paginationControls.style.display = 'flex';
        pageIndicator.textContent = `Page ${currentPage} of ${maxPage}`;

        btnPrevPage.style.opacity = currentPage === 1 ? '0.5' : '1';
        btnPrevPage.style.pointerEvents = currentPage === 1 ? 'none' : 'auto';

        btnNextPage.style.opacity = currentPage === maxPage ? '0.5' : '1';
        btnNextPage.style.pointerEvents = currentPage === maxPage ? 'none' : 'auto';
    } else {
        paginationControls.style.display = 'none';
    }
}

document.getElementById('btnPrevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTablePage();
    }
});

document.getElementById('btnNextPage').addEventListener('click', () => {
    const maxPage = Math.ceil(allWordsData.length / ITEMS_PER_PAGE) || 1;
    if (currentPage < maxPage) {
        currentPage++;
        renderTablePage();
    }
});

async function loadSyncConfig() {
    const config = await window.api.getSyncConfig();

    if (config && config.shortcut) {
        shortcutInput.value = config.shortcut;
    }

    if (config && config.syncPath) {
        syncPathInput.value = config.syncPath;
        syncStatusText.textContent = "Monitoring...";
        syncStatusText.style.color = "var(--accent)";
    } else {
        syncPathInput.value = "";
        syncStatusText.textContent = "Not configured";
        syncStatusText.style.color = "var(--text-secondary)";
    }

    if (window.api.getAutoStart) {
        const isAutoStart = await window.api.getAutoStart();
        document.getElementById('autoStartCheckbox').checked = isAutoStart;
    }

    if (window.api.getAutoPopup) {
        const isAutoPopup = await window.api.getAutoPopup();
        document.getElementById('autoPopupCheckbox').checked = isAutoPopup;
    }
}

document.getElementById('autoStartCheckbox').addEventListener('change', async (e) => {
    if (window.api.setAutoStart) {
        await window.api.setAutoStart(e.target.checked);
    }
});

document.getElementById('autoPopupCheckbox').addEventListener('change', async (e) => {
    if (window.api.setAutoPopup) {
        await window.api.setAutoPopup(e.target.checked);
    }
});

btnSelectFolder.addEventListener('click', async () => {
    const path = await window.api.selectSyncFolder();
    if (path) {
        await window.api.setSyncFolder(path);
        loadSyncConfig();
    }
});

btnForceSync.addEventListener('click', async () => {
    syncStatusText.textContent = "Syncing...";
    syncStatusText.style.color = "yellow";
    try {
        const res = await window.api.forceSync();

        if (res && res.status === 'no_config') {
            syncStatusText.textContent = "Invalid Settings (Not Configured)";
            syncStatusText.style.color = "red";
            return;
        }
        if (res && res.status === 'folder_missing') {
            syncStatusText.textContent = "Invalid Folder Path";
            syncStatusText.style.color = "red";
            return;
        }

        syncStatusText.textContent = "Sync Complete";
        syncStatusText.style.color = "var(--accent)"; Complete
        setTimeout(loadSyncConfig, 3000);
    } catch (e) {
        syncStatusText.textContent = "Sync Failed: " + e.message;
        syncStatusText.style.color = "red";
    }
});

// Smart Shortcut Input Catcher
shortcutInput.addEventListener('keydown', (e) => {
    e.preventDefault(); // Prevent actual typing

    let keys = [];
    // Standardize across mac and win
    if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    const keyName = e.key;
    const isModifierOnly = ['Control', 'Alt', 'Shift', 'Meta'].includes(keyName);

    if (isModifierOnly) {
        shortcutInput.value = keys.join('+') + '+...';
        return;
    }

    let finalKey = keyName.toUpperCase();
    if (finalKey === ' ') finalKey = 'Space';

    keys.push(finalKey);
    shortcutInput.value = keys.join('+');
});

btnSaveShortcut.addEventListener('click', async () => {
    const newShortcut = shortcutInput.value.trim();
    if (!newShortcut) return;

    const originalText = btnSaveShortcut.textContent;
    btnSaveShortcut.textContent = "Saving...";

    const res = await window.api.setShortcut(newShortcut);
    if (res && res.success) {
        btnSaveShortcut.textContent = "Saved!";
        btnSaveShortcut.style.background = "#00d2ff"; // accent
        setTimeout(() => {
            btnSaveShortcut.textContent = originalText;
        }, 2000);
    } else {
        alert("Failed to register shortcut. The combination might be invalid or already in use by the OS.");
        btnSaveShortcut.textContent = originalText;
    }
});

// Help Modal Logic
const syncHelpModal = document.getElementById('syncHelpModal');
const openSyncHelp = document.getElementById('openSyncHelp');
const closeSyncHelp = document.getElementById('closeSyncHelp');

if (openSyncHelp) {
    openSyncHelp.addEventListener('click', () => {
        syncHelpModal.classList.add('show');
    });
}
if (closeSyncHelp) {
    closeSyncHelp.addEventListener('click', () => {
        syncHelpModal.classList.remove('show');
    });
}
if (syncHelpModal) {
    // Click outside to close
    syncHelpModal.addEventListener('click', (e) => {
        if (e.target === syncHelpModal) {
            syncHelpModal.classList.remove('show');
        }
    });
}

// Init
applyLanguage();
loadWords();
loadSyncConfig();
