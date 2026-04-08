const card = document.getElementById('card');
const wordBox = document.getElementById('wordBox');
const phoneticBox = document.getElementById('phoneticBox');
const transBox = document.getElementById('transBox');
const btnGroup = document.getElementById('btnGroup');
const closeBtn = document.getElementById('closeBtn');

let currentWordData = null;

let slideshowFlipTimer = null;
let slideshowNextTimer = null;

// The main process will send a word to review
window.api.onReviewWord((wordData) => {
    currentWordData = wordData;
    wordBox.textContent = wordData.word;
    let displayPhonetic = wordData.phonetic || '';
    const speakerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbc531" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; margin-bottom: 2px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    const safeWord = wordData.word.replace(/'/g, "\\'");

    const dualMatch = displayPhonetic.match(/(UK|英)\s*\/([^/]+)\/\s*(US|美)\s*\/([^/]+)\//);
    if (dualMatch) {
        phoneticBox.innerHTML = 
            `<span style="cursor: pointer;" onclick="window.playAudio(event, '${safeWord}', 1)">${speakerSVG}${dualMatch[1]} /${dualMatch[2]}/</span> &nbsp;&nbsp; ` +
            `<span style="cursor: pointer;" onclick="window.playAudio(event, '${safeWord}', 2)">${speakerSVG}${dualMatch[3]} /${dualMatch[4]}/</span>`;
    } else if (displayPhonetic) {
        if (!displayPhonetic.includes('/')) displayPhonetic = `/${displayPhonetic}/`;
        phoneticBox.innerHTML = `<span style="cursor: pointer;" onclick="window.playAudio(event, '${safeWord}')">${speakerSVG}${displayPhonetic}</span>`;
    } else {
        phoneticBox.innerHTML = `<span style="cursor: pointer;" onclick="window.playAudio(event, '${safeWord}')">${speakerSVG}点击发音</span>`;
    }
    
    phoneticBox.style.cursor = 'default';
    transBox.textContent = wordData.translation;
    card.classList.remove('flipped');
    
    // Reset any existing timers
    clearTimeout(slideshowFlipTimer);
    clearTimeout(slideshowNextTimer);

    if (wordData.isSlideshow) {
        btnGroup.style.display = 'none'; // strictly hide buttons
        
        // Auto flip after 2 seconds
        slideshowFlipTimer = setTimeout(() => {
            card.classList.add('flipped');
            
            // Auto fetch next word after 3 seconds of showing meaning
            slideshowNextTimer = setTimeout(() => {
                if (window.api.slideshowNext) {
                    window.api.slideshowNext();
                }
            }, 3000);
        }, 2000);
        
    } else {
        btnGroup.style.display = ''; // let CSS handle the visibility upon flipping
    }
});

let isDragging = false;
let startScreenX = 0, startScreenY = 0;
let hasMoved = false;

card.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    
    isDragging = true;
    hasMoved = false;
    startScreenX = e.screenX;
    startScreenY = e.screenY;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const dx = e.screenX - startScreenX;
    const dy = e.screenY - startScreenY;
    
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasMoved = true;
        window.api.moveFlashcardBy(dx, dy);
        startScreenX = e.screenX;
        startScreenY = e.screenY;
    }
});

window.addEventListener('mouseup', (e) => {
    if (isDragging) {
        isDragging = false;
        if (!hasMoved) {
            // It was a click, not a drag. Flip it!
            card.classList.add('flipped');
        }
    }
});

window.playAudio = function(event, word, type) {
    if (event) event.stopPropagation();
    const url = type ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}` : `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}`;
    const audio = new Audio(url);
    audio.play().catch(err => console.error("Audio error:", err));
};

// Submit score via mouse
btnGroup.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && currentWordData) {
        submitScore(parseInt(e.target.dataset.score));
    }
});

function submitScore(score) {
    if (!currentWordData) return;
    window.api.submitReview(currentWordData.id, currentWordData.mastery_level, score);
    wordBox.textContent = "Great job!";
    phoneticBox.textContent = "";
    transBox.textContent = "Loading next...";
    card.classList.remove('flipped');
}

// Submit score via keyboard shortcuts
window.addEventListener('keydown', (e) => {
    // If card is not flipped, Space or Enter flips it
    if (!card.classList.contains('flipped')) {
        if (e.key === ' ' || e.key === 'Enter') {
            card.classList.add('flipped');
        }
        return;
    }
    
    // If card is flipped, 4-1 keys submit score (reversed mapping)
    switch(e.key) {
        case '4': submitScore(1); break;
        case '3': submitScore(2); break;
        case '2': submitScore(3); break;
        case '1': submitScore(4); break;
    }
});

closeBtn.addEventListener('click', () => {
    window.api.hideFlashcard();
});

// --- Dynamic Mouse Passthrough Engine ---
// Make the card clickable but let transparent areas pass clicks through to native OS
window.addEventListener('mousemove', (event) => {
    // If hovered over the app root instead of the card container components
    if (event.target === document.documentElement || event.target === document.body) {
        window.api.setIgnoreMouse(true, { forward: true });
    } else {
        // Mouse is over actual elements (buttons, content), we must capture clicks!
        window.api.setIgnoreMouse(false);
    }
});

// When mouse completely leaves the window frame
document.body.addEventListener('mouseleave', () => {
    window.api.setIgnoreMouse(true, { forward: true });
});

// Ensure default state is ghost-like
window.api.setIgnoreMouse(true, { forward: true });
