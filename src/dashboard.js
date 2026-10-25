const navWords = document.getElementById('navWords');
const navOcr = document.getElementById('navOcr');
const navSettings = document.getElementById('navSettings');
const viewWords = document.getElementById('viewWords');
const viewOcr = document.getElementById('viewOcr');
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

// i18n dictionary loaded from src/locales.js (window.locales)
const locales = window.locales || { en: {}, zh: {} };

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
    if (navOcr) navOcr.classList.remove('active');
    navSettings.classList.remove('active');
    viewWords.classList.add('active');
    if (viewOcr) viewOcr.classList.remove('active');
    viewSettings.classList.remove('active');
    loadWords();
});

if (navOcr) {
    navOcr.addEventListener('click', () => {
        navOcr.classList.add('active');
        navWords.classList.remove('active');
        navSettings.classList.remove('active');
        if (viewOcr) viewOcr.classList.add('active');
        viewWords.classList.remove('active');
        viewSettings.classList.remove('active');
    });
}

navSettings.addEventListener('click', () => {
    navSettings.classList.add('active');
    navWords.classList.remove('active');
    if (navOcr) navOcr.classList.remove('active');
    viewSettings.classList.add('active');
    viewWords.classList.remove('active');
    if (viewOcr) viewOcr.classList.remove('active');
    loadSyncConfig();
});

// ==========================================
// Image Text Extraction (OCR) Workbench Logic
// ==========================================
const ocrWorkbenchDropzone = document.getElementById('ocrWorkbenchDropzone');
const ocrWorkbenchFileInput = document.getElementById('ocrWorkbenchFileInput');
const btnBrowseImage = document.getElementById('btnBrowseImage');
const ocrWorkbenchPanels = document.getElementById('ocrWorkbenchPanels');
const ocrImagePreview = document.getElementById('ocrImagePreview');
const ocrImageMeta = document.getElementById('ocrImageMeta');
const btnChangeImage = document.getElementById('btnChangeImage');
const ocrWorkbenchLangSelect = document.getElementById('ocrWorkbenchLangSelect');
const ocrResultTextarea = document.getElementById('ocrResultTextarea');
const ocrCharCountBadge = document.getElementById('ocrCharCountBadge');
const ocrLoadingSpinner = document.getElementById('ocrLoadingSpinner');
const btnReOcr = document.getElementById('btnReOcr');
const btnClearOcr = document.getElementById('btnClearOcr');
const btnCopyOcrText = document.getElementById('btnCopyOcrText');
const btnTranslateOcrText = document.getElementById('btnTranslateOcrText');
const btnExportOcrTxt = document.getElementById('btnExportOcrTxt');
const ocrActionFeedback = document.getElementById('ocrActionFeedback');
const ocrTranslationContainer = document.getElementById('ocrTranslationContainer');
const ocrTranslationText = document.getElementById('ocrTranslationText');
const btnCloseOcrTrans = document.getElementById('btnCloseOcrTrans');

let currentWorkbenchImageBase64 = null;

function updateOcrCharCount() {
    if (!ocrResultTextarea || !ocrCharCountBadge) return;
    const text = ocrResultTextarea.value || '';
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    ocrCharCountBadge.textContent = `${chars} 字符 / ${words} 词`;
}

if (ocrResultTextarea) {
    ocrResultTextarea.addEventListener('input', updateOcrCharCount);
}

function showOcrFeedback(msg) {
    if (!ocrActionFeedback) return;
    ocrActionFeedback.textContent = msg;
    setTimeout(() => {
        if (ocrActionFeedback.textContent === msg) {
            ocrActionFeedback.textContent = '';
        }
    }, 2500);
}

async function runWorkbenchOcr() {
    if (!currentWorkbenchImageBase64) return;
    if (ocrLoadingSpinner) ocrLoadingSpinner.style.display = 'flex';
    if (btnReOcr) btnReOcr.disabled = true;

    const lang = ocrWorkbenchLangSelect ? ocrWorkbenchLangSelect.value : 'auto';
    try {
        const res = await window.api.extractTextFromImage({
            image: currentWorkbenchImageBase64,
            lang: lang,
            copyToClipboard: false
        });

        if (res && res.success && res.text) {
            ocrResultTextarea.value = res.text;
            updateOcrCharCount();
            showOcrFeedback("✓ 识别完成");
        } else {
            ocrResultTextarea.value = '';
            updateOcrCharCount();
            showOcrFeedback("⚠️ " + (res?.error || '未识别到清晰文字'));
        }
    } catch (err) {
        ocrResultTextarea.value = `[OCR 异常] ${err.message || err}`;
        updateOcrCharCount();
    } finally {
        if (ocrLoadingSpinner) ocrLoadingSpinner.style.display = 'none';
        if (btnReOcr) btnReOcr.disabled = false;
    }
}

function loadWorkbenchImage(base64Data, filename = 'Image') {
    currentWorkbenchImageBase64 = base64Data;
    if (ocrImagePreview) ocrImagePreview.src = base64Data;
    if (ocrImageMeta) {
        const img = new Image();
        img.onload = () => {
            ocrImageMeta.textContent = `${filename} · ${img.naturalWidth} × ${img.naturalHeight} px`;
        };
        img.src = base64Data;
    }
    if (ocrWorkbenchDropzone) ocrWorkbenchDropzone.style.display = 'none';
    if (ocrWorkbenchPanels) ocrWorkbenchPanels.style.display = 'grid';
    if (ocrTranslationContainer) ocrTranslationContainer.style.display = 'none';
    runWorkbenchOcr();
}

function handleWorkbenchFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        loadWorkbenchImage(e.target.result, file.name || 'image.png');
    };
    reader.readAsDataURL(file);
}

if (btnBrowseImage && ocrWorkbenchFileInput) {
    btnBrowseImage.addEventListener('click', (e) => {
        e.stopPropagation();
        ocrWorkbenchFileInput.click();
    });
}

if (ocrWorkbenchDropzone) {
    ocrWorkbenchDropzone.addEventListener('click', () => {
        if (ocrWorkbenchFileInput) ocrWorkbenchFileInput.click();
    });

    ocrWorkbenchDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ocrWorkbenchDropzone.classList.add('dragover');
    });

    ocrWorkbenchDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ocrWorkbenchDropzone.classList.remove('dragover');
    });

    ocrWorkbenchDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ocrWorkbenchDropzone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleWorkbenchFile(e.dataTransfer.files[0]);
        }
    });
}

if (ocrWorkbenchFileInput) {
    ocrWorkbenchFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleWorkbenchFile(e.target.files[0]);
        }
    });
}

if (btnChangeImage) {
    btnChangeImage.addEventListener('click', () => {
        if (ocrWorkbenchFileInput) ocrWorkbenchFileInput.click();
    });
}

if (btnReOcr) {
    btnReOcr.addEventListener('click', () => {
        runWorkbenchOcr();
    });
}

if (ocrWorkbenchLangSelect) {
    ocrWorkbenchLangSelect.addEventListener('change', () => {
        if (currentWorkbenchImageBase64) {
            runWorkbenchOcr();
        }
    });
}

if (btnClearOcr) {
    btnClearOcr.addEventListener('click', () => {
        currentWorkbenchImageBase64 = null;
        if (ocrResultTextarea) ocrResultTextarea.value = '';
        if (ocrWorkbenchPanels) ocrWorkbenchPanels.style.display = 'none';
        if (ocrWorkbenchDropzone) ocrWorkbenchDropzone.style.display = 'block';
        if (ocrWorkbenchFileInput) ocrWorkbenchFileInput.value = '';
        if (ocrTranslationContainer) ocrTranslationContainer.style.display = 'none';
        updateOcrCharCount();
    });
}

if (btnCopyOcrText) {
    btnCopyOcrText.addEventListener('click', async () => {
        const text = ocrResultTextarea ? ocrResultTextarea.value : '';
        if (!text.trim()) {
            showOcrFeedback("文本为空");
            return;
        }
        if (window.api.copyTextToClipboard) {
            await window.api.copyTextToClipboard(text);
            showOcrFeedback("✓ 文字已成功复制到剪贴板！");
        }
    });
}

if (btnTranslateOcrText) {
    btnTranslateOcrText.addEventListener('click', async () => {
        const text = ocrResultTextarea ? ocrResultTextarea.value.trim() : '';
        if (!text) {
            showOcrFeedback("请先提取文字");
            return;
        }
        btnTranslateOcrText.disabled = true;
        btnTranslateOcrText.textContent = "⏳ 正在翻译...";
        try {
            const res = await window.api.searchWord(text);
            if (res && res.data && (res.data.translation || res.data.definition)) {
                if (ocrTranslationContainer && ocrTranslationText) {
                    ocrTranslationText.textContent = res.data.translation || res.data.definition;
                    ocrTranslationContainer.style.display = 'block';
                }
                showOcrFeedback("✓ 翻译成功");
            } else {
                showOcrFeedback("未获取到译文: " + (res?.error || '无返回'));
            }
        } catch (e) {
            showOcrFeedback("翻译异常: " + e.message);
        } finally {
            btnTranslateOcrText.disabled = false;
            btnTranslateOcrText.textContent = "🔍 智能翻译";
        }
    });
}

if (btnCloseOcrTrans) {
    btnCloseOcrTrans.addEventListener('click', () => {
        if (ocrTranslationContainer) ocrTranslationContainer.style.display = 'none';
    });
}

if (btnExportOcrTxt) {
    btnExportOcrTxt.addEventListener('click', async () => {
        const text = ocrResultTextarea ? ocrResultTextarea.value : '';
        if (!text.trim()) {
            showOcrFeedback("内容为空");
            return;
        }
        if (window.api.saveTextFile) {
            const defaultName = `OCR_Text_${Date.now()}.txt`;
            const res = await window.api.saveTextFile(text, defaultName);
            if (res && res.success) {
                showOcrFeedback("✓ 已导出保存至文件");
            }
        }
    });
}

// Global Paste Event inside Dashboard for quick OCR
window.addEventListener('paste', (e) => {
    if (viewOcr && viewOcr.classList.contains('active')) {
        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type && item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    if (blob) {
                        e.preventDefault();
                        handleWorkbenchFile(blob);
                        return;
                    }
                }
            }
        }
    }
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

        const hasImage = !!w.image_path;
        const imgBadgeHtml = hasImage
            ? `<button class="word-img-badge" data-image-path="${encodeURIComponent(w.image_path)}" data-word="${encodeURIComponent(w.word)}" title="${(locales[currentLang] && locales[currentLang].tooltip_view_image) || 'View screenshot snapshot'}">📷</button>`
            : '';

        tr.innerHTML = `
            <td class="td-word">
                <div style="display: inline-flex; align-items: center;">
                    <span>${escapeHtml(w.word)}</span>
                    ${imgBadgeHtml}
                </div>
            </td>
            <td>${escapeHtml(w.translation || '')}</td>
            <td>Lv. ${escapeHtml(String(w.mastery_level ?? 0))}</td>
            <td>${escapeHtml(reviewText)}</td>
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

    document.querySelectorAll('.word-img-badge').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const imgPath = decodeURIComponent(btn.getAttribute('data-image-path'));
            const word = decodeURIComponent(btn.getAttribute('data-word'));
            openScreenshotLightbox(word, imgPath);
        });
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
            const isMac = navigator.userAgent.includes('Mac') || navigator.platform.includes('Mac');
            ocrEngineSelect.value = config.ocrEngine || (isMac ? 'mac_vision' : 'ocr_space');
            toggleOcrInputs(ocrEngineSelect.value);
        }
        if (ocrKeyInput) ocrKeyInput.value = config.ocrApiKey || '';
        if (youdaoOcrAppKeyInput) youdaoOcrAppKeyInput.value = config.youdaoOcrAppKey || '';
        if (youdaoOcrSecretKeyInput) youdaoOcrSecretKeyInput.value = config.youdaoOcrSecretKey || '';
        if (ocrLangSelect) ocrLangSelect.value = config.ocrLang || 'auto';

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
                btnGlobalDownload.style.display = 'none'; // Don't offer download button on error
                btnGlobalInstall.style.display = 'none';
                if (globalUpdateProgressContainer) globalUpdateProgressContainer.style.display = 'none';
                if (globalUpdateText) {
                    globalUpdateText.textContent = (currentLang === 'en' ? 'Update check failed: ' : '更新检测失败: ') + msg.error;
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

// Screenshot Lightbox Modal Logic
let currentLightboxDataUrl = null;
const screenshotLightboxModal = document.getElementById('screenshotLightboxModal');
const closeScreenshotLightbox = document.getElementById('closeScreenshotLightbox');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxLoading = document.getElementById('lightboxLoading');
const btnCopyLightbox = document.getElementById('btnCopyLightbox');
const btnSaveLightbox = document.getElementById('btnSaveLightbox');

async function openScreenshotLightbox(word, imgPath) {
    if (!screenshotLightboxModal) return;
    currentLightboxDataUrl = null;

    const prefix = locales[currentLang].lightbox_title || 'Screenshot Snapshot';
    if (lightboxTitle) {
        lightboxTitle.innerHTML = `📷 <span>${escapeHtml(word)}</span> - <span data-i18n="lightbox_title">${prefix}</span>`;
    }

    if (lightboxLoading) {
        lightboxLoading.style.display = 'block';
        lightboxLoading.textContent = currentLang === 'zh' ? '加载中...' : 'Loading...';
    }
    if (lightboxImg) {
        lightboxImg.style.display = 'none';
        lightboxImg.src = '';
    }

    screenshotLightboxModal.classList.add('show');

    try {
        const dataUrl = await window.api.getWordImage(imgPath);
        if (dataUrl) {
            currentLightboxDataUrl = dataUrl;
            if (lightboxImg) {
                lightboxImg.src = dataUrl;
                lightboxImg.onload = () => {
                    if (lightboxLoading) lightboxLoading.style.display = 'none';
                    lightboxImg.style.display = 'block';
                };
            }
        } else {
            if (lightboxLoading) {
                lightboxLoading.textContent = locales[currentLang].img_load_fail || 'Screenshot snapshot not found or removed.';
            }
        }
    } catch (err) {
        console.error('Failed to load image:', err);
        if (lightboxLoading) {
            lightboxLoading.textContent = (currentLang === 'zh' ? '加载失败: ' : 'Failed to load: ') + err.message;
        }
    }
}

function closeLightbox() {
    if (screenshotLightboxModal) {
        screenshotLightboxModal.classList.remove('show');
        currentLightboxDataUrl = null;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

if (closeScreenshotLightbox) {
    closeScreenshotLightbox.addEventListener('click', closeLightbox);
}

if (screenshotLightboxModal) {
    screenshotLightboxModal.addEventListener('click', (e) => {
        if (e.target === screenshotLightboxModal) {
            closeLightbox();
        }
    });
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && screenshotLightboxModal && screenshotLightboxModal.classList.contains('show')) {
        closeLightbox();
    }
});

if (btnCopyLightbox) {
    btnCopyLightbox.addEventListener('click', async () => {
        if (!currentLightboxDataUrl) return;
        const res = await window.api.copyScreenshotImage(currentLightboxDataUrl);
        if (res && res.success) {
            const btnSpan = btnCopyLightbox.querySelector('[data-i18n="btn_copy_image"]') || btnCopyLightbox;
            const originalText = btnSpan.textContent;
            btnSpan.textContent = locales[currentLang].img_copied || 'Copied!';
            setTimeout(() => { btnSpan.textContent = originalText; }, 1800);
        }
    });
}

if (btnSaveLightbox) {
    btnSaveLightbox.addEventListener('click', async () => {
        if (!currentLightboxDataUrl) return;
        const res = await window.api.saveScreenshotImage(currentLightboxDataUrl);
        if (res && res.success) {
            const btnSpan = btnSaveLightbox.querySelector('[data-i18n="btn_save_image"]') || btnSaveLightbox;
            const originalText = btnSpan.textContent;
            btnSpan.textContent = locales[currentLang].img_saved || 'Saved!';
            setTimeout(() => { btnSpan.textContent = originalText; }, 1800);
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
    } else if (engine === 'mac_vision') {
        if (ocrSpaceKeyGroup) ocrSpaceKeyGroup.style.display = 'none';
        if (youdaoOcrAppKeyGroup) youdaoOcrAppKeyGroup.style.display = 'none';
        if (youdaoOcrSecretKeyGroup) youdaoOcrSecretKeyGroup.style.display = 'none';
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



