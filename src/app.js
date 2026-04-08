const searchInput = document.getElementById('searchInput');
const resultArea = document.getElementById('resultArea');
const wordPhonetic = document.getElementById('wordPhonetic');
const wordDefinition = document.getElementById('wordDefinition');
const toastBox = document.getElementById('toast');
const closeBtn = document.getElementById('closeBtn');
const saveWordBtn = document.getElementById('saveWordBtn');

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
    if (searchInput.value.trim() === '') {
        resultArea.classList.remove('visible');
        adjustHeight();
    }
});

// Hide instantly on Escape anywhere in the window
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.api.hideWindow();
    }
});

// Removed global click listener to use specific phonetic audio hooks

async function performSearch(word) {
    try {
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
    const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbc531" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-bottom: 2px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;

    // Format speaker icon
    if (typeof data !== 'string' && (data.ukphone || data.usphone)) {
        let html = '';
        if (data.ukphone) {
            html += `<span class="phonetic-btn" onclick="playAudio(event, '${wordText.replace(/'/g, "\\'")}', 1)" title="UK Pronunciation">${speakerSVG}UK /${data.ukphone}/</span>`;
        }
        if (data.usphone) {
            if (html !== '') html += '&nbsp;&nbsp;';
            html += `<span class="phonetic-btn" onclick="playAudio(event, '${wordText.replace(/'/g, "\\'")}', 2)" title="US Pronunciation">${speakerSVG}US /${data.usphone}/</span>`;
        }
        wordPhonetic.innerHTML = html;
    } else if (typeof data !== 'string' && data.phonetic) {
        wordPhonetic.innerHTML = `<span class="phonetic-btn" onclick="playAudio(event, '${wordText.replace(/'/g, "\\'")}')">${speakerSVG}/${data.phonetic}/</span>`;
    } else {
        wordPhonetic.innerHTML = `<span class="phonetic-btn" onclick="playTTS('${wordText.replace(/'/g, "\\'")}')" style="font-size: 12px; opacity: 0.6">${speakerSVG}Click to speak</span>`;
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
if (window.api.onClipboardData) {
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
