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

// Click phonetic to hear again
wordPhonetic.addEventListener('click', () => {
    if (currentWord) playTTS(currentWord);
});

async function performSearch(word) {
    try {
        const response = await window.api.searchWord(word);
        
        if (response.error) {
            showResult(word, '', 'Not found in dictionary.');
            return;
        }

        const data = response.data;
        currentWord = data.word; // store for TTS

        // ECDICT fallback structure might differ slightly, handle gracefully
        const phonetic = data.phonetic ? `/${data.phonetic}/` : '';
        const definition = data.translation || data.definition || 'No definition available.';
        
        currentPhonetic = data.phonetic || '';
        currentTranslation = definition;
        
        showResult(data.word, phonetic, definition);
        // auto-TTS removed to prevent disturbance
        // playTTS(data.word); 

        // Auto-save logic removed per user preference. 
        // We now rely exclusively on the explicit "加入生词本" button.

    } catch (err) {
        console.error("Search failed:", err);
    }
}

function showResult(title, phonetic, definition) {
    // Format speaker icon
    if (phonetic) {
        wordPhonetic.innerHTML = `🔊 <span>${phonetic}</span>`;
    } else {
        wordPhonetic.innerHTML = `🔊 <span style="font-size: 12px; opacity: 0.6">Click to speak</span>`;
    }
    wordPhonetic.style.display = 'inline-block';
    
    // Convert newlines and semicolons to breaks and bullets for definitions
    let formattedText = definition
        .split(/;|；|\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => `<div style="margin-bottom: 8px;">• ${s}</div>`)
        .join('');
        
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
