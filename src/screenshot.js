const canvas = document.getElementById('screenshotCanvas');
const ctx = canvas.getContext('2d');

let img = new Image();
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let isDragging = false;
let hasSelection = false;

// Get Device Pixel Ratio
const dpr = window.devicePixelRatio || 1;

// Load screenshot from main process
window.api.getScreenshotImage().then(dataUrl => {
    img.src = dataUrl;
    img.onload = () => {
        setupCanvas();
        drawAll();
    };
});

function setupCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
}

// Handle window resizing
window.addEventListener('resize', () => {
    setupCanvas();
    drawAll();
});

function drawAll() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    // 1. Draw base image
    ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
    
    // 2. Draw dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    // 3. Highlight selected region if dragging or has selection
    if (isDragging || hasSelection) {
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);
        
        if (w > 0 && h > 0) {
            // Draw clear/highlighted cutout from the original image
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
            ctx.restore();
            
            // Draw neon border around selection
            ctx.strokeStyle = '#00d2ff'; // var(--accent-color)
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            
            // Draw crop dimension indicator & instructions tooltip
            drawTooltip(x + w / 2, y + h + 10, `${Math.round(w * dpr)} x ${Math.round(h * dpr)} | 双击或回车翻译 | Esc 退出`);
        }
    } else {
        // Initial hint tooltip
        drawTooltip(window.innerWidth / 2, window.innerHeight / 2 - 20, "拖拽鼠标框选翻译区域 | Esc 退出");
    }
}

function drawTooltip(x, y, text) {
    ctx.save();
    ctx.fillStyle = 'rgba(18, 18, 20, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    
    const paddingX = 14;
    const paddingY = 8;
    ctx.font = '500 13px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    const textWidth = ctx.measureText(text).width;
    
    const width = textWidth + paddingX * 2;
    const height = 30;
    
    // Keep tooltip within screen bounds
    let tx = x - width / 2;
    let ty = y;
    if (tx < 10) tx = 10;
    if (tx + width > window.innerWidth - 10) tx = window.innerWidth - width - 10;
    if (ty + height > window.innerHeight - 10) ty = y - height - 20; // draw above if it hits bottom
    
    // Draw rounded rect
    ctx.beginPath();
    ctx.roundRect(tx, ty, width, height, 6);
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + width / 2, ty + height / 2);
    ctx.restore();
}

// Mouse event listeners
window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click
        isDragging = true;
        hasSelection = false;
        startX = e.clientX;
        startY = e.clientY;
        currentX = e.clientX;
        currentY = e.clientY;
        drawAll();
    } else if (e.button === 2) { // Right click to cancel
        window.api.closeScreenshot();
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        currentX = e.clientX;
        currentY = e.clientY;
        drawAll();
    }
});

window.addEventListener('mouseup', (e) => {
    if (isDragging) {
        isDragging = false;
        currentX = e.clientX;
        currentY = e.clientY;
        
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);
        
        // If selection is too small, treat as no selection
        if (w > 5 && h > 5) {
            hasSelection = true;
        } else {
            hasSelection = false;
        }
        drawAll();
    }
});

// Double click to confirm
window.addEventListener('dblclick', (e) => {
    if (hasSelection) {
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);
        
        // Check if double click was inside selection
        if (e.clientX >= x && e.clientX <= x + w && e.clientY >= y && e.clientY <= y + h) {
            confirmCrop();
        }
    }
});

// Keyboard listener
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.api.closeScreenshot();
    } else if (e.key === 'Enter') {
        if (hasSelection) {
            confirmCrop();
        }
    }
});

function confirmCrop() {
    const x = Math.min(startX, currentX) * dpr;
    const y = Math.min(startY, currentY) * dpr;
    const w = Math.abs(currentX - startX) * dpr;
    const h = Math.abs(currentY - startY) * dpr;
    
    if (w <= 0 || h <= 0) return;
    
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const cropCtx = cropCanvas.getContext('2d');
    
    // Draw cropped portion from original image
    cropCtx.drawImage(img, x, y, w, h, 0, 0, w, h);
    
    const base64 = cropCanvas.toDataURL('image/png');
    window.api.completeScreenshot(base64);
}
