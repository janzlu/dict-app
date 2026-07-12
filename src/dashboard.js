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

const globalUpdateBanner = document.getElementById('globalUpdateBanner');
const globalUpdateText = document.getElementById('globalUpdateText');
const globalUpdateProgressContainer = document.getElementById('globalUpdateProgressContainer');
const globalUpdateProgressFill = document.getElementById('globalUpdateProgressFill');
const btnGlobalDownload = document.getElementById('btnGlobalDownload');
const btnGlobalInstall = document.getElementById('btnGlobalInstall');
const btnGlobalClose = document.getElementById('btnGlobalClose');

// i18n
const locales = {
    en: {
        title_dashboard: "Dashboard - Lumina",
        logo: "Lumina",
        nav_wordbook: "Wordbook",
        nav_settings: "Settings & Sync",
        update_available_title: "New version available!",
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
        btn_shuffle: "🎲 Shuffle Play",
        btn_slideshow: "📺 Auto Slideshow",
        label_theme: "Interface Theme",
        theme_dark: "Dark Mode (Default)",
        theme_light: "Light Mode",
        theme_system: "Follow OS System",
        label_autostart: "Start on Boot",
        desc_autostart: "Launch Lumina silently in the tray when you sign in",
        label_autoupdate: "Auto Update",
        desc_autoupdate: "Automatically check for updates and notify when available",
        label_check_update: "Version Update",
        btn_check_update: "Check for Updates",
        btn_download_update: "Download Update",
        btn_install_update: "Install & Relaunch",
        label_autopopup: "Clipboard Auto-Pop",
        desc_autopopup: "Automatically show Spotlight when a short English text is copied",
        label_autoreview: "Ebbinghaus Auto-Pop",
        desc_autoreview: "Silently interrupt with Ebbinghaus memory cards when due",
        title_llm_settings: "AI Translation Engine Settings",
        desc_llm_settings: "Configure your custom Large Language Model (e.g. DeepSeek, OpenAI) for contextual, high-precision translation.",
        label_llm_enabled: "Enable AI Translation",
        desc_llm_enabled: "Prioritize LLM for translation when enabled and API key is set",
        label_llm_provider: "AI Provider",
        label_llm_url: "API Base URL",
        label_llm_key: "API Key",
        label_llm_model: "Model Name",
        btn_save_llm: "Save AI Settings",
        btn_test_llm: "Test Connection",
        label_free_engine: "Free Translation Engine",
        engine_edge: "Microsoft Edge Translate (Domestic Optimized)",
        engine_deeplx: "DeepLX Translate (High-Speed Mirror / Self-hosted)",
        engine_google: "Google Translate (GTX API)",
        label_deeplx_url: "DeepLX API Endpoint URL",
        title_screenshot_settings: "Screenshot Translation Settings",
        desc_screenshot_settings: "Configure your global screenshot shortcut, OCR engines, and API keys.",
        label_screenshot_shortcut: "Screenshot Global Shortcut",
        btn_save_screenshot_shortcut: "Save Shortcut",
        label_ocr_engine: "OCR Engine",
        label_ocr_key: "OCR.space API Key (Optional)",
        label_youdao_ocr_app_key: "Youdao OCR App Key",
        label_youdao_ocr_secret_key: "Youdao OCR Secret Key",
        label_ocr_lang: "OCR Default Language",
        btn_save_screenshot_settings: "Save Screenshot & OCR Settings"
    },

    zh: {
        title_dashboard: "控制台 - 识光",
        logo: "识光",
        nav_wordbook: "生词本",
        nav_settings: "设置与同步",
        update_available_title: "发现新版本！",
        title_wordbook: "生词本总览",
        th_word: "单词",
        th_translation: "自动释义",
        th_mastery: "熟练度",
        th_next_review: "下次复习",
        th_action: "操作",
        title_settings: "免服务无感跨端同步",
        desc_settings: "请指定你云盘的某个专用文件夹（如 OneDrive等），后台便会静默将你的背诵进度 and 词库进行多设备双向极速合并同步。",
        label_shortcut: "聚合查词全域快捷键",
        hint_shortcut: "修饰键: Command, Control, Alt, Shift。例如: Alt+Space",
        btn_save_shortcut: "应用快捷键配置",
        label_sync_path: "网盘数据链路目录",
        btn_select_folder: "浏览文件夹",
        status_prefix: "驱动状态：",
        btn_force_sync: "手动执行硬同步校验",
        label_language: "客户端界面展现语言",
        btn_del: "删除条目",
        btn_shuffle: "🎲 碎片时间随机复习",
        btn_slideshow: "📺 自动随机轮播",
        label_theme: "客户端 UI 主题色彩",
        theme_dark: "深色幽能模式 (默认)",
        theme_light: "高亮柔和模式",
        theme_system: "跟随操作系统动态变换",
        label_autostart: "开机自动运行",
        desc_autostart: "系统登录时，自动在后台托盘静默启动此软件引擎",
        label_autoupdate: "静默更新检测",
        desc_autoupdate: "自动在后台检查客户端新版本",
        label_check_update: "版本更新",
        btn_check_update: "手动检查更新",
        btn_download_update: "高速下载更新包",
        btn_install_update: "立即安装并重启",
        label_autopopup: "划词复制唤起",
        desc_autopopup: "默认开启。当您按下复制键提取短语文本时，将零延迟触发弹出大面板进行光速查词",
        label_autoreview: "艾宾浩斯自动弹出",
        desc_autoreview: "默认开启。当背诵卡片到期时，在后台静默唤起艾宾浩斯记忆闪卡进行复习",
        title_llm_settings: "AI 智能大模型翻译引擎",
        desc_llm_settings: "配置自定义大模型（如 DeepSeek、OpenAI）以获得最具上下文感知、极高精度的查词与句子翻译体验。",
        label_llm_enabled: "启用 AI 智能翻译",
        desc_llm_enabled: "开启后，若配置了 API Key，系统查词和整句翻译将优先使用大模型",
        label_llm_provider: "大模型云服务商",
        label_llm_url: "API 接口 Base URL",
        label_llm_key: "API Key / 密钥",
        label_llm_model: "模型名称 (Model)",
        btn_save_llm: "保存 AI 引擎配置",
        btn_test_llm: "测试 API 联通性",
        label_free_engine: "免 Key 优化翻译线路",
        engine_edge: "微软 Edge 翻译 (国内直连、延迟极低)",
        engine_deeplx: "DeepLX 翻译 (极高品质、支持自建)",
        engine_google: "谷歌翻译 (经典 GTX 引擎)",
        label_deeplx_url: "DeepLX 自定义接口 URL",
        title_screenshot_settings: "截图翻译功能配置",
        desc_screenshot_settings: "在此配置全域截图翻译的快捷键、OCR 文本识别引擎及开发者授权密钥。",
        label_screenshot_shortcut: "全域区域截图翻译快捷键",
        btn_save_screenshot_shortcut: "应用快捷键配置",
        label_ocr_engine: "OCR 识别引擎",
        label_ocr_key: "OCR.space API Key (可选)",
        label_youdao_ocr_app_key: "有道 OCR 接口 App Key",
        label_youdao_ocr_secret_key: "有道 OCR 接口 Secret Key",
        label_ocr_lang: "OCR 默认识别目标语言",
        btn_save_screenshot_settings: "保存截图与 OCR 配置"
    }


};

// Auto-detect system language optimally on first run
let defaultLang = 'en';
if (navigator.language && navigator.language.toLowerCase().startsWith('zh')) {
    defaultLang = 'zh';
}
let currentLang = localStorage.getItem('dictapp_lang') || defaultLang;
let appVersionCache = '';

function updateVersionText() {
    const d = document.getElementById('appVersionDisplay');
    if (d && appVersionCache) {
        d.textContent = (currentLang === 'zh' ? '当前版本 v' : 'Current Version v') + appVersionCache;
    }
}

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
    
    updateVersionText();
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
const btnShufflePlay = document.getElementById('btnShufflePlay');
const btnAutoSlideshow = document.getElementById('btnAutoSlideshow');

if (btnShufflePlay) {
    btnShufflePlay.addEventListener('click', () => {
        if (window.api.startShufflePlay) window.api.startShufflePlay();
    });
}

if (btnAutoSlideshow) {
    btnAutoSlideshow.addEventListener('click', () => {
        if (window.api.startAutoSlideshow) window.api.startAutoSlideshow();
    });
}

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
        let totalMastery = 0;
        allWordsData.forEach(w => {
            if (w.mastery_level === 5) masteredCtx++;
            totalMastery += w.mastery_level;
        });

        totalWordsLabel.textContent = allWordsData.length;
        masteredWordsLabel.textContent = masteredCtx;
        
        const rRate = allWordsData.length > 0 ? ((totalMastery / (allWordsData.length * 5)) * 100).toFixed(1) : 0;
        const rateSpan = document.getElementById('retentionRate');
        if (rateSpan) rateSpan.textContent = rRate + '%';

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
                loadAnalytics();
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

    if (window.api.getAutoReview) {
        const isAutoReview = await window.api.getAutoReview();
        document.getElementById('autoReviewCheckbox').checked = isAutoReview;
    }

    if (window.api.getAutoUpdate) {
        const isAutoUpdate = await window.api.getAutoUpdate();
        const autoUpdateCheckbox = document.getElementById('autoUpdateCheckbox');
        if (autoUpdateCheckbox) autoUpdateCheckbox.checked = isAutoUpdate;
    }

    if (window.api.getTheme) {
        const theme = await window.api.getTheme();
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = theme;
    }

    // Load AI / LLM translation configs
    if (config) {
        const llmEnabledCheckbox = document.getElementById('llmEnabledCheckbox');
        const llmProviderSelect = document.getElementById('llmProviderSelect');
        const llmUrlInput = document.getElementById('llmUrlInput');
        const llmKeyInput = document.getElementById('llmKeyInput');
        const llmModelInput = document.getElementById('llmModelInput');

        if (llmEnabledCheckbox) llmEnabledCheckbox.checked = !!config.llmEnabled;
        if (llmProviderSelect) llmProviderSelect.value = config.llmProvider || 'deepseek';
        if (llmUrlInput) {
            llmUrlInput.value = config.llmUrl || '';
            llmUrlInput.placeholder = (config.llmProvider === 'openai') ? 'e.g. https://api.openai.com/v1' : 'e.g. https://api.deepseek.com/v1';
        }
        if (llmKeyInput) llmKeyInput.value = config.llmKey || '';
        if (llmModelInput) {
            llmModelInput.value = config.llmModel || '';
            llmModelInput.placeholder = (config.llmProvider === 'openai') ? 'e.g. gpt-4o-mini' : 'e.g. deepseek-chat';
        }

        // Load Free Translation Engine Config
        const freeEngineSelect = document.getElementById('freeEngineSelect');
        const deeplxUrlInput = document.getElementById('deeplxUrlInput');
        const deeplxUrlGroup = document.getElementById('deeplxUrlGroup');

        if (freeEngineSelect) {
            freeEngineSelect.value = config.freeEngine || 'edge';
            if (deeplxUrlGroup) {
                deeplxUrlGroup.style.display = (freeEngineSelect.value === 'deeplx') ? 'block' : 'none';
            }
        }
        if (deeplxUrlInput) {
            deeplxUrlInput.value = config.deeplxUrl || 'https://deeplx.demo.tar.mil.pl/translate';
        }

        // Load Screenshot translation config
        const ssShortcutInput = document.getElementById('screenshotShortcutInput');
        const ocrEngineSelect = document.getElementById('ocrEngineSelect');
        const ocrKeyInput = document.getElementById('ocrKeyInput');
        const youdaoOcrAppKeyInput = document.getElementById('youdaoOcrAppKeyInput');
        const youdaoOcrSecretKeyInput = document.getElementById('youdaoOcrSecretKeyInput');
        const ocrLangSelect = document.getElementById('ocrLangSelect');

        if (ssShortcutInput) ssShortcutInput.value = config.screenshotShortcut || 'CommandOrControl+Shift+X';
        if (ocrEngineSelect) {
            ocrEngineSelect.value = config.ocrEngine || 'ocr_space';
            toggleOcrInputs(ocrEngineSelect.value);
        }
        if (ocrKeyInput) ocrKeyInput.value = config.ocrApiKey || '';
        if (youdaoOcrAppKeyInput) youdaoOcrAppKeyInput.value = config.youdaoOcrAppKey || '';
        if (youdaoOcrSecretKeyInput) youdaoOcrSecretKeyInput.value = config.youdaoOcrSecretKey || '';
        if (ocrLangSelect) ocrLangSelect.value = config.ocrLang || 'eng';

        // Display Shortcut Status Badges
        const shortcutStatus = document.getElementById('shortcutStatus');
        const screenshotShortcutStatus = document.getElementById('screenshotShortcutStatus');

        if (shortcutStatus) {
            if (config.searchShortcutRegistered) {
                shortcutStatus.className = 'shortcut-status active';
                shortcutStatus.innerHTML = currentLang === 'zh' ? '● 激活' : '● Active';
                shortcutStatus.title = currentLang === 'zh' ? '该全局快捷键已成功注册，在任何界面均可使用。' : 'This global shortcut is successfully registered and active.';
            } else {
                shortcutStatus.className = 'shortcut-status conflict';
                shortcutStatus.innerHTML = currentLang === 'zh' ? '● 冲突' : '● Conflict';
                shortcutStatus.title = currentLang === 'zh' ? '该快捷键已被系统或其他应用占用/无效，请尝试更改为其他组合。' : 'This shortcut is already occupied by the system or another app, please try another combination.';
            }
        }

        if (screenshotShortcutStatus) {
            if (config.screenshotShortcutRegistered) {
                screenshotShortcutStatus.className = 'shortcut-status active';
                screenshotShortcutStatus.innerHTML = currentLang === 'zh' ? '● 激活' : '● Active';
                screenshotShortcutStatus.title = currentLang === 'zh' ? '该全域截图快捷键已成功注册，在任何界面均可使用。' : 'This screenshot global shortcut is successfully registered and active.';
            } else {
                screenshotShortcutStatus.className = 'shortcut-status conflict';
                screenshotShortcutStatus.innerHTML = currentLang === 'zh' ? '● 冲突' : '● Conflict';
                screenshotShortcutStatus.title = currentLang === 'zh' ? '该快捷键已被系统或其他应用占用/无效，请尝试更改为其他组合。' : 'This shortcut is already occupied by the system or another app, please try another combination.';
            }
        }
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

document.getElementById('autoReviewCheckbox').addEventListener('change', async (e) => {
    if (window.api.setAutoReview) {
        await window.api.setAutoReview(e.target.checked);
    }
});

const autoUpdateCheckbox = document.getElementById('autoUpdateCheckbox');
if (autoUpdateCheckbox) {
    autoUpdateCheckbox.addEventListener('change', async (e) => {
        if (window.api.setAutoUpdate) {
            await window.api.setAutoUpdate(e.target.checked);
        }
    });
}

// Updater UI Logic
const btnCheckUpdate = document.getElementById('btnCheckUpdate');
const updateStatusContainer = document.getElementById('updateStatusContainer');
const updateStatusText = document.getElementById('updateStatusText');
const updateProgressBar = document.getElementById('updateProgressBar');
const updateProgressFill = document.getElementById('updateProgressFill');
const btnDownloadUpdate = document.getElementById('btnDownloadUpdate');
const btnInstallUpdate = document.getElementById('btnInstallUpdate');

if (btnCheckUpdate) {
    btnCheckUpdate.addEventListener('click', async () => {
        if (!window.api.checkUpdate) return;
        updateStatusContainer.style.display = 'block';
        updateStatusText.textContent = currentLang === 'en' ? 'Checking for updates...' : '正在检查更新...';
        updateStatusText.style.color = 'var(--text-secondary)';
        btnDownloadUpdate.style.display = 'none';
        btnInstallUpdate.style.display = 'none';
        updateProgressBar.style.display = 'none';

        const res = await window.api.checkUpdate();
        if (!res.success) {
            updateStatusText.textContent = (currentLang === 'en' ? 'Check failed: ' : '检查失败: ') + res.error;
            updateStatusText.style.color = '#ff5555';
        }
    });
}

if (btnDownloadUpdate) {
    btnDownloadUpdate.addEventListener('click', async () => {
        if (!window.api.downloadUpdate) return;
        btnDownloadUpdate.style.display = 'none';
        updateProgressBar.style.display = 'block';
        updateProgressFill.style.width = '0%';
        updateStatusText.textContent = currentLang === 'en' ? 'Downloading update...' : '正在下载更新...';
        updateStatusText.style.color = 'var(--accent)';
        
        await window.api.downloadUpdate();
    });
}

if (btnInstallUpdate) {
    btnInstallUpdate.addEventListener('click', () => {
        if (window.api.installUpdate) window.api.installUpdate();
    });
}

// Global Update Banner Event Listeners
if (btnGlobalDownload) {
    btnGlobalDownload.addEventListener('click', async () => {
        if (!window.api.downloadUpdate) return;
        btnGlobalDownload.style.display = 'none';
        if (globalUpdateProgressContainer) globalUpdateProgressContainer.style.display = 'block';
        if (globalUpdateProgressFill) globalUpdateProgressFill.style.width = '0%';
        if (globalUpdateText) {
            globalUpdateText.textContent = currentLang === 'en' ? 'Downloading update...' : '正在下载更新...';
        }
        
        // Also update the settings-view specific elements if they exist
        if (btnDownloadUpdate) btnDownloadUpdate.style.display = 'none';
        if (updateProgressBar) updateProgressBar.style.display = 'block';
        if (updateProgressFill) updateProgressFill.style.width = '0%';
        if (updateStatusText) {
            updateStatusText.textContent = currentLang === 'en' ? 'Downloading update...' : '正在下载更新...';
            updateStatusText.style.color = 'var(--accent)';
        }

        await window.api.downloadUpdate();
    });
}

if (btnGlobalInstall) {
    btnGlobalInstall.addEventListener('click', () => {
        if (window.api.installUpdate) window.api.installUpdate();
    });
}

if (btnGlobalClose) {
    btnGlobalClose.addEventListener('click', () => {
        if (globalUpdateBanner) globalUpdateBanner.style.display = 'none';
    });
}

if (window.api.onUpdateMessage) {
    window.api.onUpdateMessage((msg) => {
        let currentVersion = '1.9.0';
        if (msg.info && msg.info.version) {
            currentVersion = msg.info.version;
        }

        // --- Settings view updater elements ---
        if (updateStatusContainer) {
            updateStatusContainer.style.display = 'block';
            
            if (msg.type === 'trigger-download') {
                if (typeof navSettings !== 'undefined' && navSettings && !navSettings.classList.contains('active')) {
                    navSettings.click();
                }
                if (typeof btnDownloadUpdate !== 'undefined' && btnDownloadUpdate) {
                    btnDownloadUpdate.scrollIntoView({ behavior: 'smooth' });
                    btnDownloadUpdate.click();
                }
            } else if (msg.type === 'update-available') {
                const ver = msg.info.version;
                updateStatusText.textContent = currentLang === 'en' ? `New version available! (${ver})` : `发现新版本！ (${ver})`;
                updateStatusText.style.color = '#00ffaa';
                btnDownloadUpdate.style.display = 'inline-block';
                btnInstallUpdate.style.display = 'none';
                updateProgressBar.style.display = 'none';
            } else if (msg.type === 'update-not-available') {
                updateStatusText.textContent = currentLang === 'en' ? 'You are on the latest version.' : '当前已经是最新版本。';
                updateStatusText.style.color = 'var(--text-secondary)';
                btnDownloadUpdate.style.display = 'none';
                btnInstallUpdate.style.display = 'none';
                updateProgressBar.style.display = 'none';
            } else if (msg.type === 'download-progress') {
                updateProgressBar.style.display = 'block';
                const percent = msg.progress.percent || 0;
                updateProgressFill.style.width = `${percent}%`;
                updateStatusText.textContent = currentLang === 'en' 
                    ? `Downloading... ${Math.round(percent)}%` 
                    : `下载中... ${Math.round(percent)}%`;
            } else if (msg.type === 'update-downloaded') {
                updateProgressBar.style.display = 'none';
                updateStatusText.textContent = currentLang === 'en' ? 'Download complete. Ready to install.' : '下载完成。准备好安装。';
                updateStatusText.style.color = '#00ffaa';
                btnDownloadUpdate.style.display = 'none';
                btnInstallUpdate.style.display = 'inline-block';
            } else if (msg.type === 'error') {
                updateStatusText.textContent = (currentLang === 'en' ? 'Update Error: ' : '更新错误: ') + msg.error;
                updateStatusText.style.color = '#ff5555';
                btnDownloadUpdate.style.display = 'none';
                btnInstallUpdate.style.display = 'none';
                updateProgressBar.style.display = 'none';
            }
        }

        // --- Global banner updater elements ---
        if (globalUpdateBanner) {
            if (msg.type === 'trigger-download') {
                globalUpdateBanner.style.display = 'flex';
                btnGlobalDownload.style.display = 'none';
                btnGlobalInstall.style.display = 'none';
                if (globalUpdateProgressContainer) globalUpdateProgressContainer.style.display = 'block';
                if (globalUpdateProgressFill) globalUpdateProgressFill.style.width = '0%';
                if (globalUpdateText) {
                    globalUpdateText.textContent = currentLang === 'en' ? 'Downloading update...' : '正在下载更新...';
                    globalUpdateText.style.color = '';
                }
                // Call download API in backend
                if (window.api.downloadUpdate) window.api.downloadUpdate();
            } else if (msg.type === 'update-available') {
                const ver = msg.info.version;
                globalUpdateBanner.style.display = 'flex';
                btnGlobalDownload.style.display = 'inline-block';
                btnGlobalInstall.style.display = 'none';
                if (globalUpdateProgressContainer) globalUpdateProgressContainer.style.display = 'none';
                if (globalUpdateText) {
                    globalUpdateText.textContent = currentLang === 'en' ? `New version v${ver} is available!` : `发现新版本 v${ver} ！`;
                    globalUpdateText.style.color = '';
                }
            } else if (msg.type === 'update-not-available') {
                globalUpdateBanner.style.display = 'none';
            } else if (msg.type === 'download-progress') {
                globalUpdateBanner.style.display = 'flex';
                btnGlobalDownload.style.display = 'none';
                btnGlobalInstall.style.display = 'none';
                if (globalUpdateProgressContainer) globalUpdateProgressContainer.style.display = 'block';
                const percent = msg.progress.percent || 0;
                if (globalUpdateProgressFill) globalUpdateProgressFill.style.width = `${percent}%`;
                if (globalUpdateText) {
                    globalUpdateText.textContent = currentLang === 'en' 
                        ? `Downloading update... ${Math.round(percent)}%` 
                        : `正在下载更新... ${Math.round(percent)}%`;
                    globalUpdateText.style.color = '';
                }
            } else if (msg.type === 'update-downloaded') {
                globalUpdateBanner.style.display = 'flex';
                btnGlobalDownload.style.display = 'none';
                btnGlobalInstall.style.display = 'inline-block';
                if (globalUpdateProgressContainer) globalUpdateProgressContainer.style.display = 'none';
                if (globalUpdateText) {
                    globalUpdateText.textContent = currentLang === 'en' 
                        ? `Download complete! Ready to install v${currentVersion}.` 
                        : `更新包下载完毕，准备好安装 v${currentVersion}。`;
                    globalUpdateText.style.color = '#00ffaa';
                }
            } else if (msg.type === 'error') {
                globalUpdateBanner.style.display = 'flex';
                btnGlobalDownload.style.display = 'inline-block'; // Allow retry
                btnGlobalInstall.style.display = 'none';
                if (globalUpdateProgressContainer) globalUpdateProgressContainer.style.display = 'none';
                if (globalUpdateText) {
                    globalUpdateText.textContent = (currentLang === 'en' ? 'Update failed: ' : '更新失败: ') + msg.error;
                    globalUpdateText.style.color = '#ff5555';
                }
            }
        }
    });
}

const themeSelect = document.getElementById('themeSelect');
if (themeSelect) {
    themeSelect.addEventListener('change', async (e) => {
        if (window.api.setTheme) {
            await window.api.setTheme(e.target.value);
        }
    });
}

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
        syncStatusText.style.color = "var(--accent)";
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

// Validate helper to ensure shortcut format is correct and has a modifier
function validateShortcut(value) {
    if (!value) return false;
    const parts = value.split('+');
    const modifiers = ['CommandOrControl', 'Alt', 'Shift'];
    const hasModifier = parts.some(part => modifiers.includes(part));
    const lastPart = parts[parts.length - 1];
    const hasValidKey = lastPart && lastPart !== '...' && !modifiers.includes(lastPart);
    return hasModifier && hasValidKey;
}

btnSaveShortcut.addEventListener('click', async () => {
    const newShortcut = shortcutInput.value.trim();
    if (!newShortcut) return;

    if (!validateShortcut(newShortcut)) {
        alert(currentLang === 'zh' ? "快捷键格式无效。必须包含修饰键（如 Ctrl/Alt/Shift）和字母/数字。" : "Invalid shortcut format. Must include modifier(s) (e.g. Ctrl/Alt/Shift) and a key.");
        return;
    }

    const originalText = btnSaveShortcut.textContent;
    btnSaveShortcut.textContent = "Saving...";

    const res = await window.api.setShortcut(newShortcut);
    if (res && res.success) {
        btnSaveShortcut.textContent = "Saved!";
        btnSaveShortcut.style.background = "#00d2ff"; // accent
        await loadSyncConfig(); // Refresh status badges
        setTimeout(() => {
            btnSaveShortcut.textContent = originalText;
            btnSaveShortcut.style.background = "";
        }, 2000);
    } else {
        alert(currentLang === 'zh' ? "无法注册快捷键。该组合键可能无效或已被其他程序占用。" : "Failed to register shortcut. The combination might be invalid or already in use by the OS.");
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

let chartDist = null;
let chartFore = null;
let chartHeat = null;
let _isResizeRegistered = false;

async function loadAnalytics() {
    if (!window.echarts) return;
    
    if (!_isResizeRegistered) {
        window.addEventListener('resize', () => {
            if(chartDist) chartDist.resize();
            if(chartFore) chartFore.resize();
            if(chartHeat) chartHeat.resize();
        });
        _isResizeRegistered = true;
    }

    if (!chartDist) {
        chartDist = echarts.init(document.getElementById('chartDistribution'), 'dark');
        chartDist.getDom().style.backgroundColor = 'transparent';
    }
    if (!chartFore) {
        chartFore = echarts.init(document.getElementById('chartForecast'), 'dark');
        chartFore.getDom().style.backgroundColor = 'transparent';
    }
    if (!chartHeat) {
        chartHeat = echarts.init(document.getElementById('chartHeatmap'), 'dark');
        chartHeat.getDom().style.backgroundColor = 'transparent';
    }

    try {
        const data = await window.api.getAnalytics();
        
        const distMap = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0};
        if(data.distribution) {
            data.distribution.forEach(d => distMap[d.level] = d.count);
        }

        chartDist.setOption({
            backgroundColor: 'transparent',
            tooltip: { trigger: 'item', padding: 12, backgroundColor: 'rgba(20,20,20,0.9)', borderColor: '#333' },
            series: [{
                name: '熟练层级',
                type: 'pie',
                radius: ['20%', '80%'],
                center: ['50%', '50%'],
                roseType: 'area',
                itemStyle: { borderRadius: 6, borderColor: '#111', borderWidth: 2 },
                data: [
                    { value: distMap[0] + distMap[1], name: '初识边界', itemStyle: {color: '#4a4a50'} },
                    { value: distMap[2] + distMap[3], name: '潜意识区', itemStyle: {color: '#9a30ff'} },
                    { value: distMap[4] + distMap[5], name: '本能反应', itemStyle: {color: '#00d2ff'} }
                ]
            }]
        });

        const xAxis = [];
        const yAxis = [];
        if(data.forecast && data.forecast.length > 0) {
            data.forecast.forEach(f => {
                xAxis.push(f.reviewDate ? f.reviewDate.substring(5) : 'Unknown'); // 'MM-DD'
                yAxis.push(f.count);
            });
        }
        
        chartFore.setOption({
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: xAxis.length ? xAxis : ['无需复习'], axisLine: { lineStyle: { color: '#666' } } },
            yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#222' } } },
            series: [{
                name: '待复习词汇量',
                type: 'bar',
                barWidth: '40%',
                data: yAxis.length ? yAxis : [0],
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#00d2ff' },
                        { offset: 1, color: '#3a7bd5' }
                    ]),
                    borderRadius: [4, 4, 0, 0]
                }
            }]
        });

        // 3. 365-Day Heatmap
        let maxReviews = 1;
        const heatData = [];
        if(data.heatmap && data.heatmap.length > 0) {
            data.heatmap.forEach(h => {
                heatData.push([h.reviewDate, h.count]);
                if (h.count > maxReviews) maxReviews = h.count;
            });
        }
        
        // Define rolling 12 months range
        const today = new Date();
        const endStr = today.toISOString().split('T')[0];
        const start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        const startStr = start.toISOString().split('T')[0];

        chartHeat.setOption({
            backgroundColor: 'transparent',
            tooltip: { 
                position: 'top',
                formatter: function (p) {
                    const format = echarts.format.formatTime('yyyy-MM-dd', p.data[0]);
                    return format + ': ' + p.data[1] + ' 个复习切片';
                }
            },
            visualMap: {
                min: 0,
                max: Math.max(maxReviews, 10),
                calculable: true,
                orient: 'horizontal',
                left: 'right',
                top: 0,
                itemWidth: 12,
                itemHeight: 120, // Length of the gradient bar
                inRange: {
                    color: ['#1f2026', '#314c81', '#00d2ff', '#00ffaa']
                },
                textStyle: { color: '#888', fontSize: 12 }
            },
            calendar: [{
                range: [startStr, endStr],
                cellSize: ['auto', 20], // Increase base height to prevent vertical squash
                right: 30,
                left: 60,
                top: 65, // Push calendar down to clear visualMap
                bottom: 10,
                splitLine: { show: false },
                itemStyle: {
                    color: '#16171d', // Slightly brighter base for empty days
                    borderWidth: 2, // Thinner border to reveal more colored block area
                    borderColor: 'var(--bg-card)'
                },
                yearLabel: { show: false },
                dayLabel: { color: '#888', firstDay: 1, nameMap: 'ZH', fontSize: 11, margin: 12 },
                monthLabel: { color: '#888', nameMap: 'ZH', fontSize: 12 }
            }],
            series: [{
                type: 'heatmap',
                coordinateSystem: 'calendar',
                calendarIndex: 0,
                data: heatData
            }]
        });

    } catch(err) {
        console.error("Dashboard Analytics Error:", err);
    }
}

// Init
applyLanguage();
loadWords();
loadAnalytics();
loadSyncConfig();

// Load static version
if (window.api.getVersion) {
    window.api.getVersion().then(v => {
        appVersionCache = v;
        updateVersionText();
    });
}

// AI LLM Translation Controller Logic
const llmProviderSelect = document.getElementById('llmProviderSelect');
if (llmProviderSelect) {
    llmProviderSelect.addEventListener('change', (e) => {
        const provider = e.target.value;
        const urlInput = document.getElementById('llmUrlInput');
        const modelInput = document.getElementById('llmModelInput');
        if (provider === 'deepseek') {
            urlInput.placeholder = 'e.g. https://api.deepseek.com/v1';
            urlInput.value = 'https://api.deepseek.com/v1';
            modelInput.placeholder = 'e.g. deepseek-chat';
            modelInput.value = 'deepseek-chat';
        } else if (provider === 'openai') {
            urlInput.placeholder = 'e.g. https://api.openai.com/v1';
            urlInput.value = 'https://api.openai.com/v1';
            modelInput.placeholder = 'e.g. gpt-4o-mini';
            modelInput.value = 'gpt-4o-mini';
        } else {
            urlInput.placeholder = 'e.g. https://custom-endpoint/v1';
            urlInput.value = '';
            modelInput.placeholder = 'e.g. my-custom-model';
            modelInput.value = '';
        }
    });
}

const btnSaveLlm = document.getElementById('btnSaveLlm');
if (btnSaveLlm) {
    btnSaveLlm.addEventListener('click', async () => {
        const llmEnabled = document.getElementById('llmEnabledCheckbox').checked;
        const llmProvider = document.getElementById('llmProviderSelect').value;
        const llmUrl = document.getElementById('llmUrlInput').value.trim();
        const llmKey = document.getElementById('llmKeyInput').value.trim();
        const llmModel = document.getElementById('llmModelInput').value.trim();

        if (window.api.setLlmConfig) {
            await window.api.setLlmConfig({ llmEnabled, llmProvider, llmUrl, llmKey, llmModel });
            const statusDiv = document.getElementById('llmTestStatus');
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.color = '#00ffaa';
                statusDiv.textContent = currentLang === 'zh' ? '✅ AI 配置保存成功！' : '✅ AI Settings saved successfully!';
                setTimeout(() => { statusDiv.style.display = 'none'; }, 4000);
            }
        }
    });
}

const btnTestLlm = document.getElementById('btnTestLlm');
if (btnTestLlm) {
    btnTestLlm.addEventListener('click', async () => {
        const llmProvider = document.getElementById('llmProviderSelect').value;
        const llmUrl = document.getElementById('llmUrlInput').value.trim();
        const llmKey = document.getElementById('llmKeyInput').value.trim();
        const llmModel = document.getElementById('llmModelInput').value.trim();
        const statusDiv = document.getElementById('llmTestStatus');

        if (!llmKey) {
            statusDiv.style.display = 'block';
            statusDiv.style.color = '#ff5555';
            statusDiv.textContent = currentLang === 'zh' ? '❌ API Key 不能为空。' : '❌ API Key cannot be empty.';
            return;
        }

        statusDiv.style.display = 'block';
        statusDiv.style.color = 'var(--text-secondary)';
        statusDiv.textContent = currentLang === 'zh' ? '⚡ 正在测试 API 联通性，请稍候...' : '⚡ Testing API connection, please wait...';

        if (window.api.testLlmConnection) {
            const res = await window.api.testLlmConnection({ llmProvider, llmUrl, llmKey, llmModel });
            if (res.success) {
                statusDiv.style.color = '#00ffaa';
                statusDiv.textContent = currentLang === 'zh' ? '✅ 连接成功！API 正常响应。' : '✅ Connection successful! API responded successfully.';
            } else {
                statusDiv.style.color = '#ff5555';
                statusDiv.textContent = (currentLang === 'zh' ? '❌ 连接失败：' : '❌ Connection failed: ') + res.error;
            }
        }
    });
}

// Free Engine Settings Controller Logic
const freeEngineSelect = document.getElementById('freeEngineSelect');
const deeplxUrlInput = document.getElementById('deeplxUrlInput');
const deeplxUrlGroup = document.getElementById('deeplxUrlGroup');

async function saveFreeEngineConfig() {
    if (window.api.setFreeEngineConfig) {
        const freeEngine = freeEngineSelect.value;
        const deeplxUrl = deeplxUrlInput.value.trim();
        await window.api.setFreeEngineConfig({ freeEngine, deeplxUrl });
    }
}

if (freeEngineSelect) {
    freeEngineSelect.addEventListener('change', async (e) => {
        const value = e.target.value;
        if (deeplxUrlGroup) {
            deeplxUrlGroup.style.display = (value === 'deeplx') ? 'block' : 'none';
        }
        await saveFreeEngineConfig();
    });
}

if (deeplxUrlInput) {
    deeplxUrlInput.addEventListener('change', async () => {
        await saveFreeEngineConfig();
    });
    deeplxUrlInput.addEventListener('blur', async () => {
        await saveFreeEngineConfig();
    });
}

// Screenshot Settings Controller Logic
const ocrEngineSelect = document.getElementById('ocrEngineSelect');
if (ocrEngineSelect) {
    ocrEngineSelect.addEventListener('change', (e) => {
        toggleOcrInputs(e.target.value);
    });
}

function toggleOcrInputs(engine) {
    const ocrSpaceKeyGroup = document.getElementById('ocrSpaceKeyGroup');
    const youdaoOcrAppKeyGroup = document.getElementById('youdaoOcrAppKeyGroup');
    const youdaoOcrSecretKeyGroup = document.getElementById('youdaoOcrSecretKeyGroup');
    
    if (engine === 'youdao') {
        if (ocrSpaceKeyGroup) ocrSpaceKeyGroup.style.display = 'none';
        if (youdaoOcrAppKeyGroup) youdaoOcrAppKeyGroup.style.display = 'block';
        if (youdaoOcrSecretKeyGroup) youdaoOcrSecretKeyGroup.style.display = 'block';
    } else {
        if (ocrSpaceKeyGroup) ocrSpaceKeyGroup.style.display = 'block';
        if (youdaoOcrAppKeyGroup) youdaoOcrAppKeyGroup.style.display = 'none';
        if (youdaoOcrSecretKeyGroup) youdaoOcrSecretKeyGroup.style.display = 'none';
    }
}

const screenshotShortcutInput = document.getElementById('screenshotShortcutInput');
if (screenshotShortcutInput) {
    screenshotShortcutInput.addEventListener('keydown', (e) => {
        e.preventDefault();
        let keys = [];
        if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');

        const keyName = e.key;
        const isModifierOnly = ['Control', 'Alt', 'Shift', 'Meta'].includes(keyName);
        if (isModifierOnly) {
            screenshotShortcutInput.value = keys.join('+') + '+...';
            return;
        }

        let finalKey = keyName.toUpperCase();
        if (finalKey === ' ') finalKey = 'Space';
        keys.push(finalKey);
        screenshotShortcutInput.value = keys.join('+');
    });
}

const btnSaveScreenshotShortcut = document.getElementById('btnSaveScreenshotShortcut');
if (btnSaveScreenshotShortcut) {
    btnSaveScreenshotShortcut.addEventListener('click', async () => {
        const newShortcut = screenshotShortcutInput.value.trim();
        if (!newShortcut) return;

        if (!validateShortcut(newShortcut)) {
            alert(currentLang === 'zh' ? "快捷键格式无效。必须包含修饰键（如 Ctrl/Alt/Shift）和字母/数字。" : "Invalid shortcut format. Must include modifier(s) (e.g. Ctrl/Alt/Shift) and a key.");
            return;
        }
        
        const originalText = btnSaveScreenshotShortcut.textContent;
        btnSaveScreenshotShortcut.textContent = "Saving...";
        
        if (window.api.setScreenshotConfig) {
            try {
                const res = await window.api.setScreenshotConfig({ screenshotShortcut: newShortcut });
                if (res && res.success) {
                    btnSaveScreenshotShortcut.textContent = "Saved!";
                    btnSaveScreenshotShortcut.style.background = "#00d2ff";
                    await loadSyncConfig(); // Refresh status badges
                    setTimeout(() => {
                        btnSaveScreenshotShortcut.textContent = originalText;
                        btnSaveScreenshotShortcut.style.background = "";
                    }, 2000);
                } else {
                    const errMsg = res && res.error ? `\nError: ${res.error}` : "";
                    alert((currentLang === 'zh' ? "无法注册快捷键。该组合键可能无效或已被其他程序占用。" : "Failed to register shortcut. The combination might be invalid or already in use by the OS.") + errMsg);
                    btnSaveScreenshotShortcut.textContent = originalText;
                }
            } catch (err) {
                console.error("IPC call failed:", err);
                btnSaveScreenshotShortcut.textContent = originalText;
            }
        }
    });
}

const btnSaveScreenshotSettings = document.getElementById('btnSaveScreenshotSettings');
if (btnSaveScreenshotSettings) {
    btnSaveScreenshotSettings.addEventListener('click', async () => {
        const screenshotShortcut = screenshotShortcutInput.value.trim();
        const ocrEngine = ocrEngineSelect.value;
        const ocrApiKey = document.getElementById('ocrKeyInput').value.trim();
        const youdaoOcrAppKey = document.getElementById('youdaoOcrAppKeyInput').value.trim();
        const youdaoOcrSecretKey = document.getElementById('youdaoOcrSecretKeyInput').value.trim();
        const ocrLang = document.getElementById('ocrLangSelect').value;
        
        const statusDiv = document.getElementById('screenshotTestStatus');

        if (!validateShortcut(screenshotShortcut)) {
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.color = '#ff3366';
                statusDiv.textContent = currentLang === 'zh' ? '❌ 保存失败：快捷键格式无效，必须包含修饰键（如 Ctrl/Alt/Shift）和字母/数字。' : '❌ Save failed: Invalid shortcut format. Must include modifier(s) (e.g. Ctrl/Alt/Shift) and a key.';
            }
            return;
        }
        
        if (window.api.setScreenshotConfig) {
            try {
                const res = await window.api.setScreenshotConfig({
                    screenshotShortcut,
                    ocrEngine,
                    ocrApiKey,
                    youdaoOcrAppKey,
                    youdaoOcrSecretKey,
                    ocrLang
                });
                
                if (statusDiv) {
                    statusDiv.style.display = 'block';
                    if (res && res.success) {
                        statusDiv.style.color = '#00ffaa';
                        statusDiv.textContent = currentLang === 'zh' ? '✅ 截图 OCR 配置保存成功！' : '✅ Screenshot OCR Settings saved successfully!';
                        await loadSyncConfig(); // Refresh status badges
                    } else {
                        statusDiv.style.color = '#ff3366';
                        const errMsg = res && res.error ? `: ${res.error}` : "";
                        statusDiv.textContent = currentLang === 'zh' ? `❌ 保存失败：快捷键已被占用或无效${errMsg}` : `❌ Save failed: Shortcut already in use or invalid${errMsg}`;
                    }
                    setTimeout(() => { statusDiv.style.display = 'none'; }, 4000);
                }
            } catch (err) {
                console.error("IPC call failed:", err);
            }
        }
    });
}



