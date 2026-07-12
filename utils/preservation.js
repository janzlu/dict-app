/**
 * Utility to protect code snippets, camelCase/snake_case words, Chinese characters,
 * and special characters/tags from being translated.
 * 
 * Replaces them with placeholders before translation and restores them afterwards.
 * Also dynamically maps glossary terms to their correct translations using placeholders.
 */

const fs = require('fs');
const path = require('path');

let cachedGlossary = null;

function loadGlossary() {
    if (cachedGlossary) return cachedGlossary;

    let userDataPath = null;
    let isPackaged = false;
    try {
        const { app } = require('electron');
        if (app) {
            userDataPath = app.getPath('userData');
            isPackaged = app.isPackaged;
        }
    } catch (e) {
        // Bypassed when running in pure Node.js/Jest environment
    }

    let glossaryPath = null;
    if (userDataPath) {
        const customGlossaryPath = path.join(userDataPath, 'glossary.json');
        if (fs.existsSync(customGlossaryPath)) {
            glossaryPath = customGlossaryPath;
        }
    }

    if (!glossaryPath) {
        glossaryPath = isPackaged
            ? path.join(process.resourcesPath, 'resources', 'glossary.json')
            : path.join(__dirname, '..', 'resources', 'glossary.json');
    }

    if (!fs.existsSync(glossaryPath)) {
        cachedGlossary = {};
        return cachedGlossary;
    }

    try {
        const raw = fs.readFileSync(glossaryPath, 'utf8');
        cachedGlossary = JSON.parse(raw);
    } catch (err) {
        console.error("Failed to load glossary config:", err);
        cachedGlossary = {};
    }

    return cachedGlossary;
}

async function translateWithPreservation(text, translateFn) {
    const glossary = loadGlossary();
    const isPhraseOrCode = text.includes(' ') || /[`<>{}\[\];=()]/.test(text);
    if (!isPhraseOrCode) {
        const lowerText = text.toLowerCase();
        if (glossary[lowerText]) {
            return {
                source: 'glossary',
                data: { translation: glossary[lowerText] }
            };
        }
        return await translateFn(text);
    }

    const patterns = [
        /`[^`\n]+`/g,                                                      // Backticks inline code
        /<[^>]+>/g,                                                        // HTML/XML tags
        /\/\/[^\n]*/g,                                                     // Line comments
        /\/\*[\s\S]*?\*\//g,                                               // Block comments
        /\b(const|let|var|function|class|def|import|return|void|public|private|if|for|while|switch)\b[^.\n]+/g, // Code lines with keywords
        /\b[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)/g,                         // Function calls like foo(bar)
        /\{[^}]*\}/g,                                                      // Braces blocks
        /\[[^\]]*\]/g,                                                     // Bracket blocks
        /\b[a-z]+[A-Z][a-zA-Z0-9]*\b/g,                                    // camelCase
        /\b[a-zA-Z]+_[a-zA-Z0-9_]*\b/g,                                    // snake_case
    ];

    // Generate dynamic pattern matching rules from glossary keys
    const glossaryRegexes = [];
    const glossaryKeys = Object.keys(glossary).sort((a, b) => b.length - a.length);
    for (const key of glossaryKeys) {
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        glossaryRegexes.push(new RegExp(`\\b${escapedKey}\\b`, 'gi'));
    }

    // Find all matches across all patterns
    const allMatches = [];
    const allPatterns = [
        ...patterns,
        ...glossaryRegexes,
        /[\u4e00-\u9fa5]+/g                                                // Chinese characters
    ];

    for (const pattern of allPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            allMatches.push({
                start: match.index,
                end: match.index + match[0].length,
                value: match[0]
            });
        }
    }

    // Sort matches by start position, then by length descending
    allMatches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // Filter out overlapping matches (keep the first/longest one)
    const filteredMatches = [];
    let lastEnd = -1;
    for (const m of allMatches) {
        if (m.start >= lastEnd) {
            filteredMatches.push(m);
            lastEnd = m.end;
        }
    }

    // Reconstruct the text with placeholders from left to right
    let processedText = '';
    let currentIdx = 0;
    const placeholders = [];
    
    for (let i = 0; i < filteredMatches.length; i++) {
        const m = filteredMatches[i];
        processedText += text.substring(currentIdx, m.start);
        const placeholder = `[__CODE_${i}__]`;
        processedText += placeholder;
        
        // Find if this is a glossary match
        const lowerVal = m.value.toLowerCase();
        const mappedTranslation = glossary[lowerVal];
        
        placeholders.push({ 
            placeholder, 
            original: m.value,
            translation: mappedTranslation || m.value
        });
        currentIdx = m.end;
    }
    processedText += text.substring(currentIdx);

    // Call the translate function with the processed text
    const translated = await translateFn(processedText);
    if (!translated) return null;

    let resultText = typeof translated === 'string' ? translated : (translated.data?.translation || '');
    if (!resultText) return translated;

    // Restore placeholders with their mapped translations
    for (const item of placeholders) {
        const looseRegex = new RegExp(`\\[\\s*__CODE_${item.placeholder.match(/\d+/)[0]}\\s*__\\]`, 'gi');
        resultText = resultText.replace(looseRegex, item.translation);
    }

    if (typeof translated === 'string') {
        return resultText;
    } else {
        translated.data.translation = resultText;
        return translated;
    }
}

module.exports = {
    translateWithPreservation
};
