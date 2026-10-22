const fs = require('fs');
const os = require('os');
const path = require('path');
const syncEngine = require('../utils/sync');

describe('Sync & Config Cache Engine', () => {
    let tempDir;
    let mockApp;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumina-sync-test-'));
        mockApp = {
            getPath: () => tempDir
        };
        syncEngine.clearConfigCache();
    });

    afterEach(() => {
        syncEngine.clearConfigCache();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('getConfig returns null when config file does not exist', () => {
        expect(syncEngine.getConfig(mockApp)).toBeNull();
    });

    test('setConfig and getConfig use in-memory cache without redundant disk reads', () => {
        const readSpy = jest.spyOn(fs, 'readFileSync');

        syncEngine.setConfig(mockApp, { shortcut: 'Alt+Space', autoPopupEnabled: true });
        expect(readSpy).not.toHaveBeenCalled();

        // Repeated calls should hit memory cache
        const cfg1 = syncEngine.getConfig(mockApp);
        const cfg2 = syncEngine.getConfig(mockApp);
        expect(cfg1.shortcut).toBe('Alt+Space');
        expect(cfg2.autoPopupEnabled).toBe(true);
        expect(readSpy).not.toHaveBeenCalled();

        // Mutating returned object should not corrupt internal cache
        cfg1.shortcut = 'Mutated';
        expect(syncEngine.getConfig(mockApp).shortcut).toBe('Alt+Space');

        readSpy.mockRestore();
    });

    test('setConfigDebounced updates memory immediately and coalesces disk writes', () => {
        jest.useFakeTimers();
        const writeSpy = jest.spyOn(fs, 'writeFileSync');

        syncEngine.setConfigDebounced(mockApp, { flashcardX: 10, flashcardY: 20 }, 300);
        syncEngine.setConfigDebounced(mockApp, { flashcardX: 50, flashcardY: 80 }, 300);
        syncEngine.setConfigDebounced(mockApp, { flashcardX: 120, flashcardY: 200 }, 300);

        // In-memory state is immediately up to date
        expect(syncEngine.getConfig(mockApp)).toEqual({ flashcardX: 120, flashcardY: 200 });
        expect(writeSpy).not.toHaveBeenCalled();

        jest.advanceTimersByTime(300);
        expect(writeSpy).toHaveBeenCalledTimes(1);

        writeSpy.mockRestore();
        jest.useRealTimers();
    });
});
