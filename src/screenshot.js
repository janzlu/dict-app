const canvas = document.getElementById('screenshotCanvas');
const ctx = canvas.getContext('2d');
const actionToolbar = document.getElementById('actionToolbar');
const btnTranslate = document.getElementById('btnTranslate');
const btnExtract = document.getElementById('btnExtract');
const btnCopy = document.getElementById('btnCopy');
const btnSave = document.getElementById('btnSave');
const btnClose = document.getElementById('btnClose');
const toastBox = document.getElementById('toast');

// OCR Recognition Comparison Modal Elements
const ocrComparisonModal = document.getElementById('ocrComparisonModal');
const compImagePreview = document.getElementById('compImagePreview');
const compTextarea = document.getElementById('compTextarea');
const compCharBadge = document.getElementById('compCharBadge');
const compEngineBadge = document.getElementById('compEngineBadge');
const compImageDimensions = document.getElementById('compImageDimensions');
const compStatusMessage = document.getElementById('compStatusMessage');
const btnCompCopyText = document.getElementById('btnCompCopyText');
const btnCompTranslate = document.getElementById('btnCompTranslate');
const btnCompSaveImage = document.getElementById('btnCompSaveImage');
const btnCompDone = document.getElementById('btnCompDone');
const btnCompClose = document.getElementById('btnCompClose');

let currentCroppedImageBase64 = null;
let img = new Image();

// Selection State & Resize Handles
let cropBox = { x: 0, y: 0, w: 0, h: 0 };
let hasSelection = false;
let dragMode = null; // null | 'create' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
let dragStartMouse = { x: 0, y: 0 };
let origCropBox = { x: 0, y: 0, w: 0, h: 0 };

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
    updateToolbar();
});

// Hit-test for 8 resize handles and interior
function getHandleUnderPoint(mx, my) {
    if (!hasSelection || cropBox.w < 10 || cropBox.h < 10) return null;
    const threshold = 10; // CSS pixels hit radius

    const { x, y, w, h } = cropBox;

    const handles = [
        { name: 'nw', x: x, y: y, cursor: 'nwse-resize' },
        { name: 'n',  x: x + w / 2, y: y, cursor: 'ns-resize' },
        { name: 'ne', x: x + w, y: y, cursor: 'nesw-resize' },
        { name: 'e',  x: x + w, y: y + h / 2, cursor: 'ew-resize' },
        { name: 'se', x: x + w, y: y + h, cursor: 'nwse-resize' },
        { name: 's',  x: x + w / 2, y: y + h, cursor: 'ns-resize' },
        { name: 'sw', x: x, y: y + h, cursor: 'nesw-resize' },
        { name: 'w',  x: x, y: y + h / 2, cursor: 'ew-resize' }
    ];

    for (const handle of handles) {
        if (Math.abs(mx - handle.x) <= threshold && Math.abs(my - handle.y) <= threshold) {
            return handle;
        }
    }

    // Inside box -> move
    if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
        return { name: 'move', cursor: 'move' };
    }

    return null;
}

function drawAll() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    // 1. Draw base image
    ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
    
    // 2. Draw dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    // 3. Highlight selected region if dragging or has selection
    if (hasSelection || dragMode) {
        const { x, y, w, h } = cropBox;
        
        if (w > 0 && h > 0) {
            // Cutout
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
            ctx.restore();
            
            // Neon border around selection
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            
            // Draw 8 Control Handles if we have an established selection
            if (hasSelection) {
                drawResizeHandles(x, y, w, h);
            }
            
            // Draw crop dimension indicator tooltip
            drawTooltip(x + w / 2, y - 10, `${Math.round(w * dpr)} × ${Math.round(h * dpr)}`);
        }
    } else {
        // Initial hint tooltip
        drawTooltip(window.innerWidth / 2, window.innerHeight / 2 - 20, "拖拽鼠标框选目标区域 | 框选后可拖拽边角微调大小 | Esc 退出");
    }
}

function drawResizeHandles(x, y, w, h) {
    const handlePositions = [
        [x, y],                 // nw
        [x + w / 2, y],         // n
        [x + w, y],             // ne
        [x + w, y + h / 2],     // e
        [x + w, y + h],         // se
        [x + w / 2, y + h],     // s
        [x, y + h],             // sw
        [x, y + h / 2]          // w
    ];

    const size = 7;
    for (const [hx, hy] of handlePositions) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.rect(hx - size / 2, hy - size / 2, size, size);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function drawTooltip(x, y, text) {
    ctx.save();
    ctx.fillStyle = 'rgba(18, 18, 20, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    
    const paddingX = 12;
    const paddingY = 6;
    ctx.font = '500 12px "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    const textWidth = ctx.measureText(text).width;
    
    const width = textWidth + paddingX * 2;
    const height = 26;
    
    // Keep tooltip within screen bounds
    let tx = x - width / 2;
    let ty = y - height;
    if (tx < 10) tx = 10;
    if (tx + width > window.innerWidth - 10) tx = window.innerWidth - width - 10;
    if (ty < 10) ty = y + 25; // if at top edge, draw below
    
    // Draw rounded rect
    ctx.beginPath();
    ctx.roundRect(tx, ty, width, height, 5);
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + width / 2, ty + height / 2);
    ctx.restore();
}

function updateToolbar() {
    if (!actionToolbar) return;

    if (!hasSelection || dragMode) {
        actionToolbar.style.display = 'none';
        return;
    }

    const { x, y, w, h } = cropBox;
    if (w < 10 || h < 10) {
        actionToolbar.style.display = 'none';
        return;
    }

    actionToolbar.style.display = 'flex';
    const toolbarWidth = actionToolbar.offsetWidth || 340;
    const toolbarHeight = actionToolbar.offsetHeight || 40;

    let posX = x + w - toolbarWidth;
    let posY = y + h + 10;

    // Boundary clamping
    if (posX < 10) posX = 10;
    if (posX + toolbarWidth > window.innerWidth - 10) {
        posX = window.innerWidth - toolbarWidth - 10;
    }

    // If bottom overflow, place above selection
    if (posY + toolbarHeight > window.innerHeight - 10) {
        posY = y - toolbarHeight - 10;
        if (posY < 10) posY = y + 10;
    }

    actionToolbar.style.left = `${Math.round(posX)}px`;
    actionToolbar.style.top = `${Math.round(posY)}px`;
}

function showToast(msg) {
    if (!toastBox) return;
    toastBox.textContent = msg;
    toastBox.classList.add('show');
    setTimeout(() => {
        toastBox.classList.remove('show');
    }, 1800);
}

// Mouse event listeners
window.addEventListener('mousedown', (e) => {
    // If click is on toolbar, modal or toast, ignore canvas drag
    if (e.target.closest('#actionToolbar') || e.target.closest('#toast') || e.target.closest('#ocrComparisonModal')) {
        return;
    }

    if (e.button === 0) { // Left click
        if (hasSelection) {
            const handle = getHandleUnderPoint(e.clientX, e.clientY);
            if (handle) {
                // Clicked an 8-way resize handle or inside the box to move
                dragMode = handle.name;
                dragStartMouse = { x: e.clientX, y: e.clientY };
                origCropBox = { ...cropBox };
                if (actionToolbar) actionToolbar.style.display = 'none';
                return;
            }
        }

        // Start creating a new selection
        dragMode = 'create';
        hasSelection = false;
        dragStartMouse = { x: e.clientX, y: e.clientY };
        cropBox = { x: e.clientX, y: e.clientY, w: 0, h: 0 };
        if (actionToolbar) actionToolbar.style.display = 'none';
        drawAll();
    } else if (e.button === 2) { // Right click to cancel
        window.api.closeScreenshot();
    }
});

window.addEventListener('mousemove', (e) => {
    if (!dragMode) {
        // Hover state: update cursor if hovering handles or crop box
        if (hasSelection && (!ocrComparisonModal || ocrComparisonModal.style.display !== 'flex')) {
            const handle = getHandleUnderPoint(e.clientX, e.clientY);
            if (handle) {
                document.body.style.cursor = handle.cursor;
            } else {
                document.body.style.cursor = 'crosshair';
            }
        } else {
            document.body.style.cursor = 'crosshair';
        }
        return;
    }

    if (dragMode === 'create') {
        const x = Math.min(dragStartMouse.x, e.clientX);
        const y = Math.min(dragStartMouse.y, e.clientY);
        const w = Math.abs(e.clientX - dragStartMouse.x);
        const h = Math.abs(e.clientY - dragStartMouse.y);
        cropBox = { x, y, w, h };
        drawAll();
    } else if (dragMode === 'move') {
        const dx = e.clientX - dragStartMouse.x;
        const dy = e.clientY - dragStartMouse.y;
        let newX = origCropBox.x + dx;
        let newY = origCropBox.y + dy;
        // Clamp to screen bounds
        newX = Math.max(0, Math.min(window.innerWidth - origCropBox.w, newX));
        newY = Math.max(0, Math.min(window.innerHeight - origCropBox.h, newY));
        cropBox.x = newX;
        cropBox.y = newY;
        drawAll();
    } else if (dragMode) {
        // 8-way resize handle
        const dx = e.clientX - dragStartMouse.x;
        const dy = e.clientY - dragStartMouse.y;
        let newBox = { ...origCropBox };

        if (dragMode.includes('e')) {
            newBox.w = Math.max(10, Math.min(window.innerWidth - origCropBox.x, origCropBox.w + dx));
        }
        if (dragMode.includes('s')) {
            newBox.h = Math.max(10, Math.min(window.innerHeight - origCropBox.y, origCropBox.h + dy));
        }
        if (dragMode.includes('w')) {
            const proposedW = origCropBox.w - dx;
            if (proposedW >= 10 && origCropBox.x + dx >= 0) {
                newBox.x = origCropBox.x + dx;
                newBox.w = proposedW;
            }
        }
        if (dragMode.includes('n')) {
            const proposedH = origCropBox.h - dy;
            if (proposedH >= 10 && origCropBox.y + dy >= 0) {
                newBox.y = origCropBox.y + dy;
                newBox.h = proposedH;
            }
        }

        cropBox = newBox;
        drawAll();
    }
});

window.addEventListener('mouseup', (e) => {
    if (dragMode) {
        dragMode = null;
        if (cropBox.w > 10 && cropBox.h > 10) {
            hasSelection = true;
        } else {
            hasSelection = false;
        }
        drawAll();
        updateToolbar();
    }
});

// Double click inside crop box to confirm translate
window.addEventListener('dblclick', (e) => {
    if (e.target.closest('#actionToolbar') || e.target.closest('#ocrComparisonModal')) return;

    if (hasSelection) {
        const { x, y, w, h } = cropBox;
        if (e.clientX >= x && e.clientX <= x + w && e.clientY >= y && e.clientY <= y + h) {
            confirmCrop();
        }
    }
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    // If comparison modal is open, let Esc close it, allow standard textarea editing
    if (ocrComparisonModal && ocrComparisonModal.style.display === 'flex') {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeComparisonAndScreenshot();
        }
        return;
    }

    if (e.key === 'Escape') {
        window.api.closeScreenshot();
        return;
    }

    if (hasSelection) {
        if (e.key === 'Enter') {
            confirmCrop();
        } else if (e.key === 't' || e.key === 'T') {
            e.preventDefault();
            extractCrop();
        } else if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C')) {
            e.preventDefault();
            copyCrop();
        } else if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            saveCrop({ keepWindow: false });
        }
    }
});

function getCroppedBase64() {
    if (!hasSelection || cropBox.w <= 0 || cropBox.h <= 0) return null;
    const x = cropBox.x * dpr;
    const y = cropBox.y * dpr;
    const w = cropBox.w * dpr;
    const h = cropBox.h * dpr;
    
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const cropCtx = cropCanvas.getContext('2d');
    
    cropCtx.drawImage(img, x, y, w, h, 0, 0, w, h);
    return cropCanvas.toDataURL('image/png');
}

function confirmCrop() {
    const base64 = getCroppedBase64();
    if (!base64) return;
    if (actionToolbar) actionToolbar.style.display = 'none';
    window.api.completeScreenshot(base64);
}

async function extractCrop() {
    const base64 = getCroppedBase64();
    if (!base64) return;
    
    if (btnExtract) {
        btnExtract.disabled = true;
        btnExtract.innerHTML = '<span>⏳ 提取中...</span>';
    }
    showToast("正在提取文字并进行识别对照...");

    try {
        const res = await window.api.extractTextFromImage({
            image: base64,
            copyToClipboard: true
        });

        if (btnExtract) {
            btnExtract.disabled = false;
            btnExtract.innerHTML = '<span>📝 提取文字</span>';
        }

        if (res && res.success && res.text) {
            if (toastBox) toastBox.classList.remove('show');
            showComparisonModal(base64, res.text, res.engine);
        } else {
            showToast("未检测到清晰文字: " + (res?.error || '无文本'));
        }
    } catch (e) {
        showToast("提取失败: " + e.message);
        if (btnExtract) {
            btnExtract.disabled = false;
            btnExtract.innerHTML = '<span>📝 提取文字</span>';
        }
    }
}

function showComparisonModal(imageBase64, text, engine) {
    if (!ocrComparisonModal) return;

    if (actionToolbar) actionToolbar.style.display = 'none';
    if (toastBox) toastBox.classList.remove('show');

    currentCroppedImageBase64 = imageBase64;
    if (compImagePreview) {
        compImagePreview.onload = () => {
            if (compImageDimensions && compImagePreview.naturalWidth && compImagePreview.naturalHeight) {
                compImageDimensions.textContent = `${compImagePreview.naturalWidth} × ${compImagePreview.naturalHeight} px`;
            }
        };
        compImagePreview.src = imageBase64;
    }
    if (compTextarea) compTextarea.value = text;
    
    // Update character & dimension counts
    const charCount = text.length;
    if (compCharBadge) compCharBadge.textContent = `${charCount} 字符`;

    const cropW = Math.round(cropBox.w * dpr);
    const cropH = Math.round(cropBox.h * dpr);
    if (compImageDimensions) compImageDimensions.textContent = `${cropW} × ${cropH} px`;

    if (compEngineBadge) {
        if (engine === 'mac_vision') {
            compEngineBadge.textContent = 'Apple Vision 原生离线';
        } else if (engine === 'youdao') {
            compEngineBadge.textContent = '有道云 OCR';
        } else {
            compEngineBadge.textContent = 'OCR.space 神经引擎';
        }
    }

    if (compStatusMessage) {
        compStatusMessage.style.color = '#10b981';
        compStatusMessage.innerHTML = '✓ 已自动复制到剪贴板';
    }

    resetCompCopyBtn();

    ocrComparisonModal.style.display = 'flex';
    setTimeout(() => {
        if (compTextarea) {
            compTextarea.focus();
            compTextarea.select();
        }
    }, 60);
}

async function copyComparisonText() {
    const textToCopy = compTextarea ? compTextarea.value : '';
    if (!textToCopy) return;

    try {
        if (window.api.copyTextToClipboard) {
            await window.api.copyTextToClipboard(textToCopy);
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(textToCopy);
        }

        if (btnCompCopyText) {
            btnCompCopyText.classList.add('success-btn');
            btnCompCopyText.innerHTML = '<span>✓ 已复制文字！</span>';
        }
        if (compStatusMessage) {
            compStatusMessage.style.color = '#10b981';
            compStatusMessage.textContent = '✓ 最新文字已成功复制到系统剪贴板';
        }
        showToast("✓ 最新文字已复制到剪贴板");

        setTimeout(() => {
            resetCompCopyBtn();
        }, 2000);
    } catch (err) {
        showToast("复制失败: " + err.message);
    }
}

function resetCompCopyBtn() {
    if (btnCompCopyText) {
        btnCompCopyText.classList.remove('success-btn');
        btnCompCopyText.innerHTML = '<span>📋 复制文字</span>';
    }
}

function closeComparisonAndScreenshot() {
    if (ocrComparisonModal) ocrComparisonModal.style.display = 'none';
    window.api.closeScreenshot();
}

async function copyCrop() {
    const base64 = getCroppedBase64();
    if (!base64) return;
    showToast("正在复制图片...");
    const res = await window.api.copyScreenshotImage(base64);
    if (res && res.success) {
        showToast("✓ 截图已复制到剪贴板");
        setTimeout(() => {
            window.api.closeScreenshot();
        }, 700);
    } else {
        showToast("复制失败");
    }
}

async function saveCrop(options = {}) {
    const base64 = currentCroppedImageBase64 || getCroppedBase64();
    if (!base64) return;
    const res = await window.api.saveScreenshotImage({
        image: base64,
        keepWindow: options.keepWindow || false
    });
    if (res && res.success) {
        const filename = res.filePath ? res.filePath.split('/').pop() : '';
        showToast("✓ 截图已保存: " + filename);
        if (compStatusMessage) {
            compStatusMessage.style.color = '#10b981';
            compStatusMessage.textContent = '✓ 截图已保存至本地 (' + filename + ')';
        }
    } else if (res && !res.canceled) {
        showToast("保存失败: " + (res.error || '未知错误'));
    }
}

// Action Button Listeners
if (btnTranslate) {
    btnTranslate.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmCrop();
    });
}

if (btnExtract) {
    btnExtract.addEventListener('click', (e) => {
        e.stopPropagation();
        extractCrop();
    });
}

if (btnCopy) {
    btnCopy.addEventListener('click', (e) => {
        e.stopPropagation();
        copyCrop();
    });
}

if (btnSave) {
    btnSave.addEventListener('click', (e) => {
        e.stopPropagation();
        saveCrop({ keepWindow: false });
    });
}

if (btnClose) {
    btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        window.api.closeScreenshot();
    });
}

// Comparison Modal Button Listeners
if (btnCompCopyText) {
    btnCompCopyText.addEventListener('click', (e) => {
        e.stopPropagation();
        copyComparisonText();
    });
}

if (btnCompTranslate) {
    btnCompTranslate.addEventListener('click', (e) => {
        e.stopPropagation();
        const base64 = currentCroppedImageBase64 || getCroppedBase64();
        if (!base64) return;
        if (ocrComparisonModal) ocrComparisonModal.style.display = 'none';
        window.api.completeScreenshot(base64);
    });
}

if (btnCompSaveImage) {
    btnCompSaveImage.addEventListener('click', (e) => {
        e.stopPropagation();
        saveCrop({ keepWindow: true });
    });
}

if (btnCompDone) {
    btnCompDone.addEventListener('click', (e) => {
        e.stopPropagation();
        closeComparisonAndScreenshot();
    });
}

if (btnCompClose) {
    btnCompClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeComparisonAndScreenshot();
    });
}

if (compTextarea) {
    compTextarea.addEventListener('input', () => {
        if (compCharBadge) {
            compCharBadge.textContent = `${compTextarea.value.length} 字符`;
        }
        if (compStatusMessage) {
            compStatusMessage.style.color = '#38bdf8';
            compStatusMessage.textContent = '● 文本已修改，点击「复制文字」应用最新内容';
        }
    });
}

if (ocrComparisonModal) {
    ocrComparisonModal.addEventListener('click', (e) => {
        if (e.target === ocrComparisonModal) {
            closeComparisonAndScreenshot();
        }
    });
}
