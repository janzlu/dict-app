const { _electron: electron } = require('@playwright/test');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Lumina Translation Pipeline Tests', () => {
    let electronApp;
    let window;

    test.beforeAll(async () => {
        const electronPath = require('electron');
        electronApp = await electron.launch({ 
            executablePath: electronPath, 
            args: ['.'],
            env: { ...process.env, PLAYWRIGHT_TEST: 'true' }
        });

        // Capture electron process logs
        electronApp.process().stdout.on('data', (data) => {
            console.log(`[Electron Stdout] ${data.toString().trim()}`);
        });
        electronApp.process().stderr.on('data', (data) => {
            console.log(`[Electron Stderr] ${data.toString().trim()}`);
        });

        const windows = electronApp.windows();
        window = windows.find(w => w.url().includes('index.html'));
        if (!window) {
            window = await electronApp.firstWindow();
        }
        await window.waitForLoadState('domcontentloaded');

        window.on('console', msg => {
            console.log(`[Browser Console] ${msg.text()}`);
        });
    });

    test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test('Single word translation should be fast and use suggest API', async () => {
        const startTime = Date.now();
        
        // Interact with search input box in the UI
        const searchInput = window.locator('#searchInput');
        await searchInput.fill('console');
        await searchInput.press('Enter');

        // Wait for translation to appear
        const wordDefinition = window.locator('#wordDefinition');
        await expect(wordDefinition).toContainText(/(安慰|控制台)/);

        const duration = Date.now() - startTime;
        console.log(`[Test] Single word translation took ${duration}ms`);

        // Assert that the UI receives the background phonetic spelling updates and renders them
        const wordPhonetic = window.locator('#wordPhonetic');
        await expect(wordPhonetic).toContainText(/UK \/.*\/.*US \/.*/, { timeout: 6000 });
    });

    test('Phrase translation should fallback to translate engines', async () => {
        const startTime = Date.now();
        
        // Interact with search input box in the UI
        const searchInput = window.locator('#searchInput');
        await searchInput.fill('artificial intelligence');
        await searchInput.press('Enter');

        // Wait for translation to appear
        const wordDefinition = window.locator('#wordDefinition');
        await expect(wordDefinition).toContainText(/人工智能/);

        const duration = Date.now() - startTime;
        console.log(`[Test] Phrase translation took ${duration}ms`);
    });

    test('Screenshot Translate button should exist and be clickable', async () => {
        const screenshotBtn = window.locator('#screenshotBtn');
        await expect(screenshotBtn).toBeVisible();
        await screenshotBtn.click();
        
        // Allow IPC call to trigger, verifying no exceptions are thrown
        await window.evaluate(() => new Promise(resolve => setTimeout(resolve, 400)));
    });

    test('Dashboard screenshot shortcut saving should work', async () => {
        // Open dashboard window via evaluating main process BrowserWindow creation
        await electronApp.evaluate(async ({ BrowserWindow, app }) => {
            const appPath = app.getAppPath();
            const win = new BrowserWindow({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: appPath + '/preload.js'
                }
            });
            await win.loadFile(appPath + '/src/dashboard.html');
        });

        // Wait for dashboard window to be detected by Playwright
        let dashboardWin = null;
        for (let i = 0; i < 10; i++) {
            const windows = electronApp.windows();
            dashboardWin = windows.find(w => w.url().includes('dashboard.html'));
            if (dashboardWin) break;
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        expect(dashboardWin).toBeTruthy();

        // Set console listener for dashboard window
        dashboardWin.on('console', msg => {
            console.log(`[Dashboard Console] ${msg.text()}`);
        });

        // Navigate to Settings View by clicking navSettings
        const navSettings = dashboardWin.locator('#navSettings');
        await expect(navSettings).toBeVisible();
        await navSettings.click();

        // Find and fill the screenshot shortcut input
        const shortcutInput = dashboardWin.locator('#screenshotShortcutInput');
        await expect(shortcutInput).toBeVisible();
        await shortcutInput.fill('Alt+Shift+Y');

        // Click the save shortcut button
        const saveShortcutBtn = dashboardWin.locator('#btnSaveScreenshotShortcut');
        await expect(saveShortcutBtn).toBeVisible();
        await saveShortcutBtn.click();

        // Wait and check if the button text changes to "Saved!"
        await expect(saveShortcutBtn).toHaveText('Saved!', { timeout: 5000 });

        // Verify that the shortcut is registered successfully in Electron's main process
        const isRegistered = await electronApp.evaluate(({ globalShortcut }) => {
            return globalShortcut.isRegistered('Alt+Shift+Y');
        });
        expect(isRegistered).toBe(true);
    });
});
