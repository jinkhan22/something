import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { setupIPCHandlers } from './main/ipc-handlers';
import { verifyTesseractAssets } from './main/services/tesseractAssets';
import { SystemChecker } from './main/services/systemChecker';

// Declare Forge environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Global flag to track asset availability
let assetsAvailable = false;

/**
 * Get the current asset availability status
 * @returns boolean indicating if Tesseract assets are available
 */
export function getAssetsAvailable(): boolean {
  return assetsAvailable;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: 'hiddenInset', // macOS style
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/index.html`),
    );
  }

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development' || MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
  
  // Log any errors loading the page
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Failed to load:', errorCode, errorDescription);
  });
  
  mainWindow.webContents.on('crashed', (event) => {
    console.error('[Main] Renderer crashed:', event);
  });
  
  // Log when page loads successfully
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Page loaded successfully');
  });
};

/**
 * Verify system requirements on startup
 * Displays error dialog if critical requirements are not met
 */
async function verifySystemRequirements(): Promise<void> {
  try {
    console.log('[Startup] Checking system requirements...');
    
    const validation = await SystemChecker.validateStartup();
    
    // Log all warnings
    if (validation.warnings.length > 0) {
      console.warn('[Startup] System warnings:');
      validation.warnings.forEach(warning => console.warn(`  ${warning}`));
    }
    
    // If critical requirements are not met, show error and potentially exit
    if (!validation.canStart) {
      console.error('[Startup] ✗ Critical system requirements not met:');
      validation.errors.forEach(error => console.error(`  ${error}`));
      
      dialog.showErrorBox(
        'System Requirements Not Met',
        'The application cannot start because critical system requirements are not met:\n\n' +
        validation.errors.join('\n') +
        '\n\nPlease address these issues and try again.'
      );
      
      // Exit the application
      app.quit();
      return;
    }
    
    console.log('[Startup] ✓ All critical system requirements met');
    
    // Show warnings dialog if there are any (non-blocking)
    if (validation.warnings.length > 0) {
      const recommendations = await SystemChecker.getRecommendations();
      
      dialog.showMessageBox({
        type: 'warning',
        title: 'System Warnings',
        message: 'Some optional features may be limited',
        detail: validation.warnings.join('\n') + '\n\n' +
                'Recommendations:\n' + recommendations.join('\n'),
        buttons: ['Continue']
      });
    }
  } catch (error) {
    console.error('[Startup] Error checking system requirements:', error);
    // Don't block startup on system check errors
  }
}

/**
 * Verify Tesseract assets on startup
 * Displays error dialog if assets are missing
 */
async function verifyAssetsOnStartup(): Promise<void> {
  try {
    console.log('[Startup] Verifying Tesseract assets...');
    await verifyTesseractAssets();
    assetsAvailable = true;
    console.log('[Startup] ✓ All Tesseract assets verified successfully');
  } catch (error) {
    assetsAvailable = false;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[Startup] ✗ Tesseract asset verification failed:');
    console.error(errorMessage);
    
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    // Display error dialog to user
    dialog.showErrorBox(
      'OCR Assets Missing',
      'The application cannot process PDFs because required OCR assets are missing.\n\n' +
      'PDF upload functionality will be disabled.\n\n' +
      'Please reinstall the application to resolve this issue.\n\n' +
      `Technical details: ${errorMessage}`
    );
  }
}

// Setup IPC handlers
setupIPCHandlers();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  await verifySystemRequirements();
  await verifyAssetsOnStartup();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
