const { translateWithPreservation } = require('./preservation');

const DEFAULT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

async function queryLLM(cleanWord, llmConfig = {}) {
    const { llmProvider, llmUrl, llmKey, llmModel } = llmConfig;
    const baseUrl = (llmUrl || 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;

    const systemPrompt = `You are a professional dictionary assistant. Translate the English input (word, phrase, or sentence) to Chinese.
For any placeholder like [__CODE_N__], keep it exactly as-is without translating or modifying it.
Return a valid JSON object ONLY. Do not write markdown, code blocks, or explanations outside the JSON.
The JSON format must be:
{
  "word": "the input text",
  "phonetic": "IPA phonetic spelling (leave blank for phrases/sentences)",
  "translation": "concise and professional Chinese definition/translation"
}`;

    const payload = {
        model: llmModel || 'deepseek-chat',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleanWord }
        ],
        temperature: 0.1,
        max_tokens: 300
    };

    if (llmProvider === 'deepseek' || llmProvider === 'openai') {
        payload.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
            const json = await res.json();
            const content = json.choices?.[0]?.message?.content?.trim() || '';
            const jsonStr = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed.translation) {
                return {
                    source: 'llm',
                    data: {
                        word: parsed.word || cleanWord,
                        phonetic: parsed.phonetic || '',
                        translation: parsed.translation
                    }
                };
            }
        }
    } catch (err) {
        clearTimeout(id);
        console.error("[Translator] queryLLM error:", err);
    }
    return null;
}

async function testLlmConnection(llmConfig = {}) {
    const { llmUrl, llmKey, llmModel } = llmConfig;
    if (!llmKey) return { success: false, error: 'API Key cannot be empty.' };

    const baseUrl = (llmUrl || 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;

    const payload = {
        model: llmModel || 'deepseek-chat',
        messages: [
            { role: 'user', content: 'Say OK' }
        ],
        max_tokens: 10
    };

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${llmKey}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
            const json = await res.json();
            if (json.choices && json.choices[0]) {
                return { success: true };
            }
        }
        const text = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${text.substring(0, 150)}` };
    } catch (err) {
        clearTimeout(id);
        return { success: false, error: err.message };
    }
}

async function queryYoudaoWebTranslate(cleanWord) {
    console.log(`[Translator] Youdao Web Translating: ${cleanWord}`);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    try {
        const res = await fetch('https://aidemo.youdao.com/trans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': DEFAULT_UA
            },
            body: 'q=' + encodeURIComponent(cleanWord) + '&from=Auto&to=zh-CHS',
            signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
            const json = await res.json();
            if (json && json.translation && json.translation.length > 0) {
                const transText = json.translation.join('\n');
                if (transText) {
                    return {
                        source: 'youdao-web',
                        data: {
                            word: cleanWord,
                            phonetic: '',
                            translation: transText
                        }
                    };
                }
            }
        }
    } catch (e) {
        clearTimeout(id);
        console.error("[Translator] Youdao Web Translate failed:", e);
    }
    return null;
}

async function queryEdgeTranslate(cleanWord) {
    console.log(`[Translator] Edge Translating: ${cleanWord}`);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    try {
        const authRes = await fetch('https://edge.microsoft.com/translate/auth', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
            },
            signal: controller.signal
        });
        clearTimeout(id);
        if (!authRes.ok) throw new Error(`Auth failed status: ${authRes.status}`);
        const token = await authRes.text();

        const translateController = new AbortController();
        const translateId = setTimeout(() => translateController.abort(), 4000);
        try {
            const res = await fetch('https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{ Text: cleanWord }]),
                signal: translateController.signal
            });
            clearTimeout(translateId);

            if (res.ok) {
                const json = await res.json();
                if (json && json[0] && json[0].translations && json[0].translations[0]) {
                    return {
                        source: 'edge',
                        data: {
                            word: cleanWord,
                            phonetic: '',
                            translation: json[0].translations[0].text
                        }
                    };
                }
            }
            throw new Error(`Edge translate API status: ${res.status}`);
        } catch (innerErr) {
            clearTimeout(translateId);
            throw innerErr;
        }
    } catch (e) {
        clearTimeout(id);
        console.error("[Translator] Edge translate failed:", e);
        return null;
    }
}

async function queryDeepLX(cleanWord, deeplxUrl) {
    const url = deeplxUrl || 'https://deeplx.demo.tar.mil.pl/translate';
    console.log(`[Translator] DeepLX Translating: ${cleanWord} via ${url}`);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: cleanWord,
                source_lang: "EN",
                target_lang: "ZH"
            }),
            signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
            const json = await res.json();
            const translation = json.data || json.translation || (json.translations && json.translations[0]?.text);
            if (translation) {
                return {
                    source: 'deeplx',
                    data: {
                        word: cleanWord,
                        phonetic: '',
                        translation: translation
                    }
                };
            }
        }
        throw new Error(`DeepLX status: ${res.status}`);
    } catch (e) {
        clearTimeout(id);
        console.error("[Translator] DeepLX translation failed:", e);
        return null;
    }
}

async function queryGoogleTranslate(cleanWord, timeoutMs = 4000) {
    console.log(`[Translator] Google Translating: ${cleanWord}`);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(cleanWord)}`, {
            headers: { 'User-Agent': DEFAULT_UA },
            signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
            const json = await res.json();
            if (json && json[0] && json[0].length > 0) {
                let fullTranslation = '';
                for (const segment of json[0]) {
                    if (segment[0]) fullTranslation += segment[0];
                }
                if (fullTranslation) {
                    return {
                        source: 'translate-google',
                        data: {
                            word: cleanWord,
                            phonetic: '',
                            translation: fullTranslation
                        }
                    };
                }
            }
        }
        throw new Error(`Google Translate status: ${res.status}`);
    } catch (e) {
        clearTimeout(id);
        console.error("[Translator] Google translate failed:", e);
        return null;
    }
}

async function queryFreeEngine(cleanWord, config = {}) {
    const engine = config.freeEngine || 'edge';
    let result = null;

    if (engine === 'deeplx') {
        result = await queryDeepLX(cleanWord, config.deeplxUrl);
    } else if (engine === 'google') {
        result = await queryGoogleTranslate(cleanWord);
    } else {
        result = await queryYoudaoWebTranslate(cleanWord);
        if (!result) result = await queryEdgeTranslate(cleanWord);
    }

    if (result) return result;

    console.log(`[Translator] Preferred free engine (${engine}) failed, trying fallback Youdao Web translator...`);
    result = await queryYoudaoWebTranslate(cleanWord);
    if (result) return result;

    console.log(`[Translator] Fallback to Google Translate...`);
    result = await queryGoogleTranslate(cleanWord);
    if (result) return result;

    return null;
}

async function fetchPhoneticsInBackground(cleanWord, sender) {
    if (!sender) return;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    try {
        const res = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(cleanWord)}`, { signal: controller.signal });
        clearTimeout(id);
        if (res.ok) {
            const json = await res.json();
            let phonetic = '';
            let ukphone = '';
            let usphone = '';
            if (json.ec && json.ec.word && json.ec.word[0]) {
                const wordObj = json.ec.word[0];
                ukphone = wordObj.ukphone || '';
                usphone = wordObj.usphone || '';
                phonetic = usphone || ukphone || '';
            } else if (json.ce && json.ce.word && json.ce.word[0]) {
                const wordObj = json.ce.word[0];
                phonetic = wordObj.phone || '';
            }
            if (ukphone || usphone || phonetic) {
                sender.send('update-phonetics', {
                    word: cleanWord,
                    ukphone,
                    usphone,
                    phonetic
                });
            }
        }
    } catch (e) {
        clearTimeout(id);
        console.error("[Translator] Background phonetic fetch failed:", e);
    }
}

async function querySuggestRace(cleanWord) {
    return Promise.any([
        // 1. Youdao Suggest API
        (async () => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 1500);
            try {
                const res = await fetch(`https://dict.youdao.com/suggest?num=1&ver=3.0&doctype=json&cache=false&le=en&q=${encodeURIComponent(cleanWord)}`, {
                    headers: { 'User-Agent': DEFAULT_UA },
                    signal: controller.signal
                });
                clearTimeout(id);
                if (res.ok) {
                    const sugJson = await res.json();
                    if (sugJson && sugJson.data && sugJson.data.entries && sugJson.data.entries.length > 0) {
                        const explain = sugJson.data.entries[0].explain;
                        if (explain) {
                            return {
                                source: 'youdao-suggest',
                                data: {
                                    word: cleanWord,
                                    phonetic: '',
                                    translation: explain
                                }
                            };
                        }
                    }
                }
                throw new Error("Youdao Suggest failed");
            } catch (err) {
                clearTimeout(id);
                throw err;
            }
        })(),
        // 2. Baidu Suggestion API
        (async () => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 1500);
            try {
                const res = await fetch('https://fanyi.baidu.com/sug', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    body: 'kw=' + encodeURIComponent(cleanWord),
                    signal: controller.signal
                });
                clearTimeout(id);
                if (res.ok) {
                    const json = await res.json();
                    if (json && json.data && json.data.length > 0) {
                        const translation = json.data.map(item => item.v).join('\n');
                        if (translation) {
                            return {
                                source: 'baidu-suggest',
                                data: {
                                    word: cleanWord,
                                    phonetic: '',
                                    translation: translation
                                }
                            };
                        }
                    }
                }
                throw new Error("Baidu Suggest failed");
            } catch (err) {
                clearTimeout(id);
                throw err;
            }
        })()
    ]);
}

async function queryYoudaoJsonApi(cleanWord) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    try {
        const res = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(cleanWord)}`, {
            headers: { 'User-Agent': DEFAULT_UA },
            signal: controller.signal
        });
        clearTimeout(id);

        if (res.ok) {
            const json = await res.json();
            let translation = '';
            let phonetic = '';
            let ukphone = '';
            let usphone = '';

            if (json.ec && json.ec.word && json.ec.word[0]) {
                const wordObj = json.ec.word[0];
                ukphone = wordObj.ukphone || '';
                usphone = wordObj.usphone || '';
                phonetic = usphone || ukphone || '';
                if (wordObj.trs && wordObj.trs.length > 0) {
                    translation = wordObj.trs.map(t => {
                        const i = t.tr?.[0]?.l?.i;
                        return Array.isArray(i) ? i.join('\n') : (i || '');
                    }).filter(Boolean).join('\n');
                }
            } else if (json.ce && json.ce.word && json.ce.word[0]) {
                const wordObj = json.ce.word[0];
                phonetic = wordObj.phone || '';
                if (wordObj.trs && wordObj.trs.length > 0) {
                    translation = wordObj.trs.map(t => {
                        const i = t.tr?.[0]?.l?.i;
                        return Array.isArray(i) ? i.join('\n') : (i || '');
                    }).filter(Boolean).join('\n');
                }
            }

            if (!translation && json.web_trans && json.web_trans['web-translation']) {
                const webTrans = json.web_trans['web-translation'][0]?.trans;
                if (webTrans) translation = webTrans.map(t => t.value).join(', ');
            }

            if (translation) {
                return {
                    source: 'online-youdao',
                    data: {
                        word: cleanWord,
                        phonetic,
                        ukphone,
                        usphone,
                        translation
                    }
                };
            }
        }
    } catch (dictErr) {
        clearTimeout(id);
        console.error("[Translator] Youdao JSONAPI failed:", dictErr);
    }
    return null;
}

async function queryMyMemory(cleanWord) {
    const mmController = new AbortController();
    const mmId = setTimeout(() => mmController.abort(), 3000);
    try {
        const mmRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|zh-CN`, {
            signal: mmController.signal
        });
        clearTimeout(mmId);

        if (mmRes.ok) {
            const mmJson = await mmRes.json();
            if (mmJson && mmJson.responseData && mmJson.responseData.translatedText) {
                return {
                    source: 'translate-mymemory',
                    data: {
                        word: cleanWord,
                        phonetic: '',
                        translation: mmJson.responseData.translatedText
                    }
                };
            }
        }
    } catch (mmErr) {
        clearTimeout(mmId);
        console.error("[Translator] MyMemory fallback engine also failed:", mmErr);
    }
    return null;
}

async function searchWordCascade({ cleanWord, db, ecdictDb, config = {}, sender = null }) {
    // 1. Check Local DB first
    if (db) {
        const localResult = db.prepare('SELECT * FROM words WHERE word = ? COLLATE NOCASE').get(cleanWord);
        if (localResult) return { source: 'local', data: localResult };
    }

    // 2. Prioritize LLM translation if enabled and API key is set
    if (config.llmEnabled && config.llmKey) {
        console.log(`[Translator] Prioritizing LLM translation for: ${cleanWord}`);
        const llmResult = await translateWithPreservation(cleanWord, (text) => queryLLM(text, config));
        if (llmResult) return llmResult;
        console.log(`[Translator] LLM translation failed or timed out, falling back to local/online dictionaries`);
    }

    // 3. Fallback to ECDICT
    if (ecdictDb) {
        const ecdictResult = ecdictDb.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE').get(cleanWord);
        if (ecdictResult) return { source: 'ecdict', data: ecdictResult };
    }

    const wordCount = cleanWord.split(/\s+/).length;

    // 4. High-speed racing suggestions for short phrases (<= 4 words) or single words
    if (wordCount <= 4) {
        try {
            const racingResult = await querySuggestRace(cleanWord);
            if (racingResult) {
                fetchPhoneticsInBackground(cleanWord, sender);
                return racingResult;
            }
        } catch (wordErr) {
            console.log("[Translator] Racing Suggestion APIs failed or timed out, trying full/translation engines...");
        }
    }

    // 5. Query preferred free translation engine (Youdao Web / Edge / DeepLX / Google)
    const freeResult = await translateWithPreservation(cleanWord, (text) => queryFreeEngine(text, config));
    if (freeResult) return freeResult;

    // 6. Try Youdao full JSONAPI
    const youdaoJsonResult = await queryYoudaoJsonApi(cleanWord);
    if (youdaoJsonResult) return youdaoJsonResult;

    // 7. Final Fallback: Google Translate (2.5s) -> MyMemory (3s)
    const gtResult = await queryGoogleTranslate(cleanWord, 2500);
    if (gtResult) return gtResult;

    const mmResult = await queryMyMemory(cleanWord);
    if (mmResult) return mmResult;

    return { error: 'Not found in any database' };
}

module.exports = {
    queryLLM,
    testLlmConnection,
    queryYoudaoWebTranslate,
    queryEdgeTranslate,
    queryDeepLX,
    queryGoogleTranslate,
    queryFreeEngine,
    fetchPhoneticsInBackground,
    querySuggestRace,
    queryYoudaoJsonApi,
    queryMyMemory,
    searchWordCascade
};
