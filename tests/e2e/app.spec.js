const { _electron: electron } = require('@playwright/test');
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Lumina Electron UI Tests', () => {
    let electronApp;

    test.beforeAll(async () => {
        // Launch Electron app
        const electronPath = require('electron');
        electronApp = await electron.launch({ 
            executablePath: electronPath, 
            args: ['.'],
            env: { ...process.env, PLAYWRIGHT_TEST: 'true' }
        });
    });

    test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test('Application should launch and be ready', async () => {
        // Wait for Electron app to be ready
        const isReady = await electronApp.evaluate(async ({ app }) => {
            return app.isReady();
        });
        expect(isReady).toBeTruthy();
    });

    test('Spotlight window is initialized with correct UI elements', async () => {
        // Get the first window that Lumina creates (which is the hidden inputWindow / Spotlight)
        const window = await electronApp.firstWindow();
        
        // Wait for DOM content to finish loading
        await window.waitForLoadState('domcontentloaded');

        // Verify the title of the HTML page using auto-retrying assertion
        await expect(window).toHaveTitle(/Lumina/);

        // Check if the search input box exists and is focused natively
        const searchInput = window.locator('#searchInput');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('placeholder', 'Type a word...');
    });
});
