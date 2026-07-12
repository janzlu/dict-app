const searchInput = document.getElementById('searchInput');
const resultArea = document.getElementById('resultArea');
const wordPhonetic = document.getElementById('wordPhonetic');
const wordDefinition = document.getElementById('wordDefinition');
const toastBox = document.getElementById('toast');
const closeBtn = document.getElementById('closeBtn');
const saveWordBtn = document.getElementById('saveWordBtn');

// Screenshot Thumbnail & Lightbox Elements
const screenshotThumbnailContainer = document.getElementById('screenshotThumbnailContainer');
const screenshotThumbnail = document.getElementById('screenshotThumbnail');
const imageLightbox = document.getElementById('imageLightbox');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxImage = document.getElementById('lightboxImage');

function showScreenshotThumbnail(imageSrc) {
    if (screenshotThumbnail && screenshotThumbnailContainer) {
        screenshotThumbnail.src = imageSrc;
        screenshotThumbnailContainer.style.display = 'block';
        adjustHeight();
    }
}

function hideScreenshotThumbnail() {
    if (screenshotThumbnailContainer) {
        screenshotThumbnailContainer.style.display = 'none';
        adjustHeight();
    }
}

// Open lightbox modal
if (screenshotThumbnail) {
    screenshotThumbnail.addEventListener('click', () => {
        if (imageLightbox && lightboxImage && screenshotThumbnail.src) {
            lightboxImage.src = screenshotThumbnail.src;
            if (window.api.resizeWindow) {
                window.api.resizeWindow(400);
            }
            imageLightbox.style.display = 'flex';
        }
    });
}

// Close lightbox modal
const closeLightbox = () => {
    if (imageLightbox) {
        imageLightbox.style.display = 'none';
        adjustHeight();
    }
};

if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
}
if (imageLightbox) {
    imageLightbox.addEventListener('click', (e) => {
        if (e.target === imageLightbox) {
            closeLightbox();
        }
    });
}

let currentWord = null;
let currentPhonetic = null;
let currentTranslation = null;

if (closeBtn) closeBtn.addEventListener('click', () => window.api.hideWindow());
if (saveWordBtn) saveWordBtn.addEventListener('click', () => {
    if(!currentWord) return;
    const ogText = saveWordBtn.textContent;
    saveWordBtn.textContent = 'Saving...';
    
    window.api.saveWord({
        word: currentWord,
        phonetic: currentPhonetic || '',
        translation: currentTranslation || ''
    }).then(res => {
        if (res.inserted) {
            showToast("Added / 已入库");
            saveWordBtn.textContent = 'Saved! 已保存';
        } else {
            showToast("Already in Wordbook");
            saveWordBtn.textContent = 'Already Saved 已存在';
        }
        setTimeout(() => saveWordBtn.textContent = ogText, 2000);
    });
});

function adjustHeight() {
    const container = document.querySelector('.spotlight-container');
    if (container && window.api.resizeWindow) {
        setTimeout(() => {
            window.api.resizeWindow(container.offsetHeight + 2); 
        }, 10);
    }
}

// Handle enter key to search
searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const word = searchInput.value.trim();
        if (!word) return;

        await performSearch(word); // Only lookup, do not auto-save.
    }
});

searchInput.addEventListener('input', () => {
    resultArea.classList.remove('visible');
    hideScreenshotThumbnail();
    adjustHeight();
});

// Hide instantly on Escape anywhere in the window
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.api.hideWindow();
    }
});

// Removed global click listener to use specific phonetic audio hooks

async function performSearch(word, keepThumbnail = false) {
    try {
        // Clear previous results and show a subtle loading state
        wordPhonetic.style.display = 'none';
        wordPhonetic.innerHTML = '';
        if (!keepThumbnail) {
            hideScreenshotThumbnail();
        }
        wordDefinition.innerHTML = `
            <div style="text-align: center; padding: 16px 0; color: var(--text-secondary);">
                <svg class="spinner" viewBox="0 0 50 50" style="width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle;">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent-color, #fbc531)" stroke-width="5" stroke-linecap="round" stroke-dasharray="80, 200" stroke-dashoffset="0"></circle>
                </svg>
                <span style="margin-left: 8px; font-size: 13px; vertical-align: middle;">Searching...</span>
            </div>
        `;
        resultArea.classList.add('visible');
        adjustHeight();

        const response = await window.api.searchWord(word);
        
        if (response.error) {
            showResult(word, '', 'Not found in dictionary.');
            return;
        }

        const data = response.data;
        currentWord = data.word; // store for TTS

        const definition = data.translation || data.definition || 'No definition available.';
        
        let combined = data.phonetic || '';
        if (data.ukphone && data.usphone && data.ukphone !== data.usphone) {
            combined = `UK /${data.ukphone}/ US /${data.usphone}/`;
        } else if (data.ukphone) {
            combined = `UK /${data.ukphone}/`;
        } else if (data.usphone) {
            combined = `US /${data.usphone}/`;
        } else if (combined && !combined.includes('/')) {
            combined = `/${combined}/`;
        }

        currentPhonetic = combined;
        currentTranslation = definition;
        
        showResult(data, definition, response.source);
        // auto-TTS removed to prevent disturbance
        // playTTS(data.word); 

        // Auto-save logic removed per user preference. 
        // We now rely exclusively on the explicit "加入生词本" button.

    } catch (err) {
        console.error("Search failed:", err);
    }
}

window.playAudio = function(event, word, type) {
    if (event) event.stopPropagation();
    const url = type ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}` : `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}`;
    const audio = new Audio(url);
    audio.play().catch(err => {
        console.error("Audio playback error:", err);
        playTTS(word);
    });
};

function showResult(data, definition, source = 'unknown') {
    const wordText = typeof data === 'string' ? data : data.word;
    const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbc531" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 6px; margin-bottom: 2px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;

    // Format speaker icon
    if (typeof data !== 'string' && (data.ukphone || data.usphone)) {
        let html = '';
        if (data.ukphone) {
            html += `<span class="phonetic-btn" onclick="playAudio(event, '${wordText.replace(/'/g, "\\'")}', 1)" title="UK Pronunciation">UK /${data.ukphone}/ ${speakerSVG}</span>`;
        }
        if (data.usphone) {
            if (html !== '') html += '&nbsp;&nbsp;';
            html += `<span class="phonetic-btn" onclick="playAudio(event, '${wordText.replace(/'/g, "\\'")}', 2)" title="US Pronunciation">US /${data.usphone}/ ${speakerSVG}</span>`;
        }
        wordPhonetic.innerHTML = html;
    } else if (typeof data !== 'string' && data.phonetic) {
        wordPhonetic.innerHTML = `<span class="phonetic-btn" onclick="playAudio(event, '${wordText.replace(/'/g, "\\'")}')">/${data.phonetic}/ ${speakerSVG}</span>`;
    } else {
        wordPhonetic.innerHTML = `<span class="phonetic-btn" onclick="playTTS('${wordText.replace(/'/g, "\\'")}')" style="font-size: 12px; opacity: 0.6">Click to speak ${speakerSVG}</span>`;
    }
    wordPhonetic.style.display = 'inline-block';
    
    // Convert newlines and semicolons to breaks and bullets for definitions
    let formattedText = definition
        .split(/;|；|\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => `<div style="margin-bottom: 8px;">• ${s}</div>`)
        .join('');
        
    // Add telemetry badge
    formattedText += `<div style="font-size: 10px; opacity: 0.25; margin-top: 8px; font-family: monospace; text-align: right; user-select: none;">[src: ${source}]</div>`;

    wordDefinition.innerHTML = formattedText || definition;
    
    // Since we resize the transparent bounds in main.js, this will gracefully expand
    resultArea.classList.add('visible');
    if(saveWordBtn) saveWordBtn.style.display = 'block';
    
    // Automatically clamp the OS electron window height to perfectly match the DOM
    adjustHeight();
}

function showToast(msg) {
    toastBox.textContent = msg;
    toastBox.classList.add('show');
    setTimeout(() => toastBox.classList.remove('show'), 2000);
}

function playTTS(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for clarity
        window.speechSynthesis.speak(utterance);
    }
}

// Auto-focus input when window is activated
window.addEventListener('focus', () => {
    searchInput.focus();
    searchInput.select();
});

// Auto-clipboard Search Feature
let lastClipboardRaw = '';
if (window.api.onClipboardData && !window.api.isTest) {
    window.api.onClipboardData((text) => {
        text = (text || '').trim();
        // Focus purely on words or paragraphs <= 3000 chars (aligned with main.js).
        if (text && text.length > 0 && text.length <= 3000) {
            // Check if it's the exact same query we auto-searched last time
            // to prevent annoying loops if they just open Spotlight normally
            if (text !== lastClipboardRaw) {
                lastClipboardRaw = text;
                searchInput.value = text;
                // Auto Search theoretically but DO NOT save yet
                // saving only happens if user presses enter inside the box
                performSearch(text, false); 
            }
        }
        
        // Highlight everything, so if user wants to search something 
        // else they can just wildly start typing instead of backspacing.
        searchInput.focus();
        searchInput.select();
    });
}

// Global visual reset on boot
adjustHeight();

if (window.api.onUpdatePhonetics) {
    window.api.onUpdatePhonetics((data) => {
        if (currentWord && currentWord.toLowerCase() === data.word.toLowerCase()) {
            const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbc531" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 6px; margin-bottom: 2px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
            let html = '';
            if (data.ukphone) {
                html += `<span class="phonetic-btn" onclick="playAudio(event, '${data.word.replace(/'/g, "\\'")}', 1)" title="UK Pronunciation">UK /${data.ukphone}/ ${speakerSVG}</span>`;
            }
            if (data.usphone) {
                if (html !== '') html += '&nbsp;&nbsp;';
                html += `<span class="phonetic-btn" onclick="playAudio(event, '${data.word.replace(/'/g, "\\'")}', 2)" title="US Pronunciation">US /${data.usphone}/ ${speakerSVG}</span>`;
            }
            if (!html && data.phonetic) {
                html = `<span class="phonetic-btn" onclick="playAudio(event, '${data.word.replace(/'/g, "\\'")}')">/${data.phonetic}/ ${speakerSVG}</span>`;
            }
            if (html) {
                wordPhonetic.innerHTML = html;
                
                let combined = data.phonetic || '';
                if (data.ukphone && data.usphone && data.ukphone !== data.usphone) {
                    combined = `UK /${data.ukphone}/ US /${data.usphone}/`;
                } else if (data.ukphone) {
                    combined = `UK /${data.ukphone}/`;
                } else if (data.usphone) {
                    combined = `US /${data.usphone}/`;
                } else if (combined && !combined.includes('/')) {
                    combined = `/${combined}/`;
                }
                currentPhonetic = combined;
            }
        }
    });
}

// Screenshot Button Trigger
const screenshotBtn = document.getElementById('screenshotBtn');
if (screenshotBtn) {
    screenshotBtn.addEventListener('click', () => {
        if (window.api.triggerScreenshot) {
            window.api.triggerScreenshot();
        }
    });
}

// Screenshot OCR Event Observers
if (window.api.onScreenshotOcrStart) {
    window.api.onScreenshotOcrStart(() => {
        searchInput.value = '正在识别截图中...';
        searchInput.disabled = true;
        hideScreenshotThumbnail();
        
        // Show progress overlay inside definition card
        wordPhonetic.innerHTML = '';
        wordDefinition.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-secondary);">
                <svg class="spinner" viewBox="0 0 50 50" style="width: 28px; height: 28px; animation: spin 1s linear infinite; display: inline-block;">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent-color)" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="80, 200" stroke-dashoffset="0"></circle>
                </svg>
                <div style="margin-top: 12px; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">正在提取选区文字...</div>
            </div>
        `;
        resultArea.classList.add('visible');
        if (saveWordBtn) saveWordBtn.style.display = 'none';
        adjustHeight();
    });
}

if (window.api.onScreenshotOcrSuccess) {
    window.api.onScreenshotOcrSuccess((payload) => {
        searchInput.disabled = false;
        
        const text = typeof payload === 'string' ? payload : (payload.text || '');
        const image = typeof payload === 'object' ? payload.image : null;
        
        searchInput.value = text;
        
        if (image) {
            showScreenshotThumbnail(image);
        } else {
            hideScreenshotThumbnail();
        }
        
        performSearch(text, true);
        searchInput.focus();
        searchInput.select();
    });
}

if (window.api.onScreenshotOcrError) {
    window.api.onScreenshotOcrError((err) => {
        searchInput.disabled = false;
        searchInput.value = '';
        hideScreenshotThumbnail();
        
        wordPhonetic.innerHTML = '';
        wordDefinition.innerHTML = `
            <div style="color: #ff5555; padding: 12px; border-radius: 6px; background: rgba(255, 85, 85, 0.1); border: 1px solid rgba(255, 85, 85, 0.2); font-size: 14px;">
                <strong>OCR 识别失败:</strong> ${err || '未检测到文字或网络超时'}
            </div>
        `;
        resultArea.classList.add('visible');
        if (saveWordBtn) saveWordBtn.style.display = 'none';
        adjustHeight();
        searchInput.focus();
    });
}
