const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

function resolveMacOcrBinaryPath(app) {
    const isPackaged = app && typeof app.isPackaged === 'boolean' ? app.isPackaged : false;
    if (isPackaged && process.resourcesPath) {
        return path.join(process.resourcesPath, 'resources', 'mac_ocr');
    }
    return path.join(__dirname, '..', 'resources', 'mac_ocr');
}

function performNativeMacOCR(base64Image, lang = null, app = null) {
    return new Promise((resolve, reject) => {
        if (process.platform !== 'darwin') {
            return reject(new Error('Native Vision OCR is only supported on macOS'));
        }
        const macOcrPath = resolveMacOcrBinaryPath(app);

        if (!fs.existsSync(macOcrPath)) {
            return reject(new Error('mac_ocr binary not found at ' + macOcrPath));
        }

        const rawBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(rawBase64, 'base64');

        const args = ['-'];
        if (lang) args.push(lang);

        const child = execFile(macOcrPath, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                console.warn("[OCR] mac_ocr failed:", stderr || err.message);
                return reject(err);
            }
            const text = stdout ? stdout.trim() : '';
            if (text) {
                console.log("[OCR] Native Mac Vision OCR recognized text:", text.slice(0, 50));
                resolve(text);
            } else {
                reject(new Error("No text recognized by Vision OCR"));
            }
        });

        child.stdin.write(imageBuffer);
        child.stdin.end();
    });
}

function mapOcrSpaceLanguage(lang) {
    if (!lang) return 'chs';
    const lower = String(lang).toLowerCase();
    if (lower === 'eng' || lower === 'en') return 'eng';
    if (lower === 'cht' || lower === 'zh-hant') return 'cht';
    if (lower === 'jpn' || lower === 'ja') return 'jpn';
    if (lower === 'kor' || lower === 'ko') return 'kor';
    if (lower === 'fre' || lower === 'fr') return 'fre';
    if (lower === 'ger' || lower === 'de') return 'ger';
    if (lower === 'spa' || lower === 'es') return 'spa';
    if (lower === 'rus' || lower === 'ru') return 'rus';
    return 'chs';
}

async function performOcrSpace(base64Image, apiKey, lang) {
    console.log(`[OCR] OCR.space request with lang=${lang}...`);
    const params = new URLSearchParams();
    params.append('apikey', apiKey || 'helloworld');
    params.append('base64Image', base64Image);
    params.append('language', mapOcrSpaceLanguage(lang));
    params.append('isOverlayRequired', 'false');
    params.append('scale', 'true');
    params.append('OCREngine', '2');
    params.append('detectOrientation', 'true');

    const endpoints = [
        'https://api.ocr.space/parse/image',
        'https://api2.ocr.space/parse/image',
        'https://api3.ocr.space/parse/image'
    ];

    let lastError = null;
    for (const url of endpoints) {
        console.log(`[OCR] Trying OCR.space endpoint: ${url}`);
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
                signal: controller.signal
            });
            clearTimeout(id);

            if (!res.ok) throw new Error(`OCR responded with status ${res.status}`);
            const json = await res.json();

            if (json.IsErroredOnProcessing) {
                throw new Error(json.ErrorMessage?.[0] || 'OCR processing failed');
            }

            if (json.ParsedResults && json.ParsedResults[0]) {
                const text = json.ParsedResults[0].ParsedText;
                if (text && text.trim()) {
                    console.log(`[OCR] OCR success on endpoint: ${url}`);
                    return text.trim();
                }
            }
            throw new Error("No text detected in selection.");
        } catch (err) {
            clearTimeout(id);
            console.warn(`[OCR] OCR endpoint ${url} failed:`, err.message || err);
            lastError = err;
        }
    }
    throw lastError || new Error("All OCR endpoints failed.");
}

async function performYoudaoOCR(base64DataUri, appKey, secretKey, overrideLang = null) {
    console.log("[OCR] Youdao OCR request...");
    const base64Data = base64DataUri.replace(/^data:image\/\w+;base64,/, "");
    const salt = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const curtime = Math.round(Date.now() / 1000).toString();

    const signStr = appKey + base64Data + salt + curtime + secretKey;
    const sign = crypto.createHash('sha256').update(signStr).digest('hex');

    const params = new URLSearchParams({
        img: base64Data,
        langType: overrideLang || 'auto',
        detectType: '10012',
        imageType: '1',
        appKey: appKey,
        salt: salt,
        curtime: curtime,
        sign: sign
    });

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch('https://openapi.youdao.com/ocrapi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            signal: controller.signal
        });
        clearTimeout(id);

        if (!res.ok) throw new Error(`Youdao OCR responded with status ${res.status}`);
        const json = await res.json();

        if (json.errorCode !== '0') {
            throw new Error(`Youdao OCR Error Code ${json.errorCode}`);
        }

        if (json.Result && json.Result.regions) {
            const lines = [];
            for (const region of json.Result.regions) {
                if (region.lines) {
                    for (const line of region.lines) {
                        if (line.text) lines.push(line.text);
                    }
                }
            }
            if (lines.length > 0) return lines.join('\n');
        }
        throw new Error("No text detected by Youdao OCR");
    } catch (err) {
        clearTimeout(id);
        console.error("[OCR] Youdao OCR failed:", err);
        throw err;
    }
}

async function performOCR(base64Image, config = {}, overrideLang = null, app = null) {
    const engine = config.ocrEngine || (process.platform === 'darwin' ? 'mac_vision' : 'ocr_space');

    // 1. If macOS and engine is mac_vision (or auto-default on macOS):
    if (process.platform === 'darwin' && (engine === 'mac_vision' || !config.ocrEngine)) {
        try {
            return await performNativeMacOCR(base64Image, overrideLang || config.ocrLang, app);
        } catch (macErr) {
            console.warn("[OCR] Native Mac Vision OCR failed, falling back to cloud OCR:", macErr.message);
        }
    }

    // 2. If Youdao OCR is configured:
    if (engine === 'youdao' && config.youdaoOcrAppKey && config.youdaoOcrSecretKey) {
        try {
            return await performYoudaoOCR(base64Image, config.youdaoOcrAppKey, config.youdaoOcrSecretKey, overrideLang);
        } catch (ydErr) {
            console.warn("[OCR] Youdao OCR failed, falling back to OCR.space:", ydErr.message);
        }
    }

    // 3. Fallback: OCR.space
    const lang = overrideLang || config.ocrLang || 'chs';
    return await performOcrSpace(base64Image, config.ocrApiKey || 'helloworld', lang);
}

module.exports = {
    performOCR,
    performNativeMacOCR,
    performOcrSpace,
    performYoudaoOCR,
    mapOcrSpaceLanguage
};
