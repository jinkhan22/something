import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Mock Electron modules
Object.defineProperty(global, '__electronMock', {
  value: {
    app: {
      getVersion: () => '1.0.0',
      getAppPath: () => process.cwd(), // Return current working directory for tests
      on: () => {},
      quit: () => {},
    },
    BrowserWindow: function() {
      return {
        loadURL: () => {},
        loadFile: () => {},
        webContents: {
          openDevTools: () => {},
          send: () => {},
        },
        fromWebContents: () => {},
      };
    },
    ipcMain: {
      handle: () => {},
      on: () => {},
    },
    ipcRenderer: {
      invoke: () => Promise.resolve(),
      on: () => {},
      removeListener: () => {},
      removeAllListeners: () => {},
      send: () => {},
    },
    contextBridge: {
      exposeInMainWorld: () => {},
    },
    dialog: {
      showMessageBox: () => Promise.resolve(),
      showSaveDialog: () => Promise.resolve(),
      showOpenDialog: () => Promise.resolve(),
    },
  }
});

// Mock module resolution for Electron
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
  if (id === 'electron') {
    return (global as any).__electronMock;
  }
  if (id === 'fs') {
    return {
      readFileSync: () => '',
      writeFileSync: () => {},
      existsSync: () => true,
    };
  }
  if (id === 'path') {
    return {
      join: (...args: string[]) => args.join('/'),
      resolve: (...args: string[]) => args.join('/'),
      dirname: (path: string) => path.split('/').slice(0, -1).join('/'),
    };
  }
  if (id === 'os') {
    return {
      platform: () => 'darwin',
      arch: () => 'x64',
      homedir: () => '/home/user',
    };
  }
  return originalRequire.apply(this, arguments);
};

// Global test utilities
declare global {
  var mockElectron: {
    resetMocks: () => void;
  };
}

(global as any).mockElectron = {
  resetMocks: () => {
    // Mock reset implementation
    console.log('Mocks reset');
  }
};