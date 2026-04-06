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
    phoneticBox.textContent = wordData.phonetic ? `/${wordData.phonetic}/` : '';
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

// Submit score
btnGroup.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && currentWordData) {
        const score = parseInt(e.target.dataset.score);
        window.api.submitReview(currentWordData.id, currentWordData.mastery_level, score);
        
        // Hide card logic handled by main process, or local instant feedback
        wordBox.textContent = "Great job!";
        phoneticBox.textContent = "";
        transBox.textContent = "Loading next...";
        card.classList.remove('flipped');
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
