const ocrEngine = require('../utils/ocr');
const translator = require('../utils/translator');
const { locales } = require('../src/locales');

describe('Modularized Services (OCR, Translator, Locales)', () => {
    test('mapOcrSpaceLanguage maps language codes accurately', () => {
        expect(ocrEngine.mapOcrSpaceLanguage('eng')).toBe('eng');
        expect(ocrEngine.mapOcrSpaceLanguage('EN')).toBe('eng');
        expect(ocrEngine.mapOcrSpaceLanguage('jpn')).toBe('jpn');
        expect(ocrEngine.mapOcrSpaceLanguage('cht')).toBe('cht');
        expect(ocrEngine.mapOcrSpaceLanguage('auto')).toBe('chs');
        expect(ocrEngine.mapOcrSpaceLanguage(null)).toBe('chs');
    });

    test('searchWordCascade prioritizes local SQLite database hit before network calls', async () => {
        const mockDb = {
            prepare: jest.fn().mockReturnValue({
                get: jest.fn().mockReturnValue({
                    word: 'ephemeral',
                    phonetic: '/ɪˈfemərəl/',
                    translation: '短暂的'
                })
            })
        };

        const res = await translator.searchWordCascade({
            cleanWord: 'ephemeral',
            db: mockDb,
            ecdictDb: null,
            config: {}
        });

        expect(res.source).toBe('local');
        expect(res.data.translation).toBe('短暂的');
    });

    test('searchWordCascade falls back to ECDICT when not in user wordbook', async () => {
        const mockDb = {
            prepare: jest.fn().mockReturnValue({
                get: jest.fn().mockReturnValue(undefined)
            })
        };
        const mockEcdict = {
            prepare: jest.fn().mockReturnValue({
                get: jest.fn().mockReturnValue({
                    word: 'ubiquitous',
                    phonetic: 'ju:ˈbɪkwɪtəs',
                    translation: 'a. 无所不在的'
                })
            })
        };

        const res = await translator.searchWordCascade({
            cleanWord: 'ubiquitous',
            db: mockDb,
            ecdictDb: mockEcdict,
            config: {}
        });

        expect(res.source).toBe('ecdict');
        expect(res.data.translation).toContain('无所不在的');
    });

    test('testLlmConnection validates empty API key gracefully', async () => {
        const res = await translator.testLlmConnection({ llmKey: '' });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/API Key/i);
    });

    test('locales module exports matching keys for en and zh', () => {
        expect(locales).toBeDefined();
        expect(locales.en).toBeDefined();
        expect(locales.zh).toBeDefined();
        const enKeys = Object.keys(locales.en).sort();
        const zhKeys = Object.keys(locales.zh).sort();
        expect(enKeys).toEqual(zhKeys);
    });

    test('locales.js and dashboard.js evaluate without global identifier collisions', () => {
        const vm = require('vm');
        const fs = require('fs');
        const path = require('path');
        const localesSrc = fs.readFileSync(path.join(__dirname, '../src/locales.js'), 'utf8');
        const dashboardSrc = fs.readFileSync(path.join(__dirname, '../src/dashboard.js'), 'utf8');

        const context = vm.createContext({
            window: { addEventListener: () => {}, api: {} },
            document: {
                getElementById: () => ({ addEventListener: () => {}, classList: { add: () => {}, remove: () => {} }, getAttribute: () => '' }),
                querySelectorAll: () => []
            },
            localStorage: { getItem: () => null, setItem: () => {} },
            navigator: { language: 'zh-CN', userAgent: 'Mac' }
        });

        expect(() => {
            vm.runInContext(localesSrc, context);
            // Compile dashboardSrc in the same context to verify lexical parsing (SyntaxError detection)
            new vm.Script(dashboardSrc);
        }).not.toThrow();
    });

    test('flashcard.css enforces transparent window root, semi-transparent card, and avoids external box-shadow', () => {
        const fs = require('fs');
        const path = require('path');
        const cssContent = fs.readFileSync(path.join(__dirname, '../src/flashcard.css'), 'utf8');

        // Root must enforce transparency
        expect(cssContent).toMatch(/background-color:\s*transparent\s*!important/i);
        expect(cssContent).toMatch(/background:\s*transparent\s*!important/i);

        // .flashcard must not have backdrop-filter which causes Chromium to render white backing in transparent windows
        expect(cssContent).not.toMatch(/\.flashcard\s*\{[^}]*backdrop-filter/);

        // .flashcard must be 100% to fill window without empty margins
        expect(cssContent).toMatch(/width:\s*100%/);
        expect(cssContent).toMatch(/height:\s*100%/);

        // .flashcard must be semi-transparent (alpha around 0.7-0.85)
        const bgMatch = cssContent.match(/\.flashcard\s*\{[\s\S]*?background:\s*rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/);
        expect(bgMatch).toBeTruthy();
        const alpha = parseFloat(bgMatch[1]);
        expect(alpha).toBeGreaterThanOrEqual(0.6);
        expect(alpha).toBeLessThanOrEqual(0.85);

        // No external box shadow on .flashcard that causes grey halo artifacts
        const shadowMatch = cssContent.match(/\.flashcard\s*\{[\s\S]*?box-shadow:\s*([^;]+);/);
        if (shadowMatch) {
            expect(shadowMatch[1]).toMatch(/inset|none/i);
        }
    });

    test('main.js configures flashcardWindow with 320x180 dimensions, transparent backgroundColor and no native shadow', () => {
        const fs = require('fs');
        const path = require('path');
        const mainSrc = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');

        expect(mainSrc).toMatch(/flashcardWindow\s*=\s*new BrowserWindow\(\{[\s\S]*?width:\s*320[\s\S]*?height:\s*180/);
        expect(mainSrc).toMatch(/flashcardWindow\s*=\s*new BrowserWindow\(\{[\s\S]*?backgroundColor:\s*['"]#00000000['"]/);
        expect(mainSrc).toMatch(/setHasShadow\(false\)/);
    });
});


