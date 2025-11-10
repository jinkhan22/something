/**
 * Preload Script Tests
 * Tests the preload script API surface and event handling
 */

describe('Preload Script API', () => {
  let mockIpcRenderer: any;
  let mockContextBridge: any;
  let exposedAPI: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ipcRenderer
    mockIpcRenderer = {
      invoke: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    // Mock contextBridge
    mockContextBridge = {
      exposeInMainWorld: jest.fn((name, api) => {
        exposedAPI = api;
      }),
    };

    // Mock electron modules
    jest.doMock('electron', () => ({
      ipcRenderer: mockIpcRenderer,
      contextBridge: mockContextBridge,
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('should expose complete API surface to renderer', () => {
    // Import preload script to trigger API exposure
    require('../src/preload');

    // Verify contextBridge.exposeInMainWorld was called
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith('electron', expect.any(Object));

    // Verify all required methods are exposed
    expect(exposedAPI).toHaveProperty('processPDF');
    expect(exposedAPI).toHaveProperty('getAppraisals');
    expect(exposedAPI).toHaveProperty('getAppraisal');
    expect(exposedAPI).toHaveProperty('updateAppraisalStatus');
    expect(exposedAPI).toHaveProperty('deleteAppraisal');
    expect(exposedAPI).toHaveProperty('onProcessingProgress');
    expect(exposedAPI).toHaveProperty('onProcessingComplete');
    expect(exposedAPI).toHaveProperty('onProcessingError');
    expect(exposedAPI).toHaveProperty('onStorageError');
    expect(exposedAPI).toHaveProperty('showErrorDialog');
    expect(exposedAPI).toHaveProperty('showSaveDialog');
    expect(exposedAPI).toHaveProperty('showOpenDialog');
    expect(exposedAPI).toHaveProperty('removeAllListeners');
    expect(exposedAPI).toHaveProperty('getAppVersion');
    expect(exposedAPI).toHaveProperty('getSystemInfo');
    expect(exposedAPI).toHaveProperty('openDevTools');

    // Verify all methods are functions
    Object.values(exposedAPI).forEach(method => {
      expect(typeof method).toBe('function');
    });
  });

  test('should handle PDF processing IPC calls', async () => {
    require('../src/preload');

    const testBuffer = Buffer.from('test pdf');
    const mockResult = { success: true, appraisalId: 'test-123' };
    
    mockIpcRenderer.invoke.mockResolvedValue(mockResult);

    const result = await exposedAPI.processPDF(testBuffer);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('process-pdf', testBuffer);
    expect(result).toEqual(mockResult);
  });

  test('should handle storage operation IPC calls', async () => {
    require('../src/preload');

    // Test getAppraisals
    const mockAppraisals = [{ id: 'test-1' }, { id: 'test-2' }];
    mockIpcRenderer.invoke.mockResolvedValue(mockAppraisals);

    const appraisals = await exposedAPI.getAppraisals();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-appraisals');
    expect(appraisals).toEqual(mockAppraisals);

    // Test getAppraisal
    mockIpcRenderer.invoke.mockResolvedValue(mockAppraisals[0]);
    const appraisal = await exposedAPI.getAppraisal('test-1');
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-appraisal', 'test-1');
    expect(appraisal).toEqual(mockAppraisals[0]);

    // Test updateAppraisalStatus
    mockIpcRenderer.invoke.mockResolvedValue(true);
    const updateResult = await exposedAPI.updateAppraisalStatus('test-1', 'complete');
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('update-appraisal-status', 'test-1', 'complete');
    expect(updateResult).toBe(true);

    // Test deleteAppraisal
    mockIpcRenderer.invoke.mockResolvedValue(true);
    const deleteResult = await exposedAPI.deleteAppraisal('test-1');
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('delete-appraisal', 'test-1');
    expect(deleteResult).toBe(true);
  });

  test('should handle progress event listeners', () => {
    require('../src/preload');

    const mockCallback = jest.fn();
    const cleanup = exposedAPI.onProcessingProgress(mockCallback);

    // Verify listener was registered
    expect(mockIpcRenderer.on).toHaveBeenCalledWith('processing-progress', expect.any(Function));

    // Get the registered callback
    const registeredCallback = mockIpcRenderer.on.mock.calls
      .find((call: any) => call[0] === 'processing-progress')?.[1];

    // Simulate event
    const testData = { progress: 50, message: 'Processing...' };
    registeredCallback(null, testData);

    // Verify callback was called with correct data
    expect(mockCallback).toHaveBeenCalledWith(testData);

    // Test cleanup function
    expect(typeof cleanup).toBe('function');
    cleanup();
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('processing-progress', registeredCallback);
  });

  test('should handle error event listeners', () => {
    require('../src/preload');

    const mockCallback = jest.fn();
    const cleanup = exposedAPI.onProcessingError(mockCallback);

    // Verify listener was registered
    expect(mockIpcRenderer.on).toHaveBeenCalledWith('processing-error', expect.any(Function));

    // Get the registered callback
    const registeredCallback = mockIpcRenderer.on.mock.calls
      .find((call: any) => call[0] === 'processing-error')?.[1];

    // Simulate error event
    const testError = { message: 'Processing failed', type: 'processing_failed' };
    registeredCallback(null, testError);

    // Verify callback was called with correct data
    expect(mockCallback).toHaveBeenCalledWith(testError);

    // Test cleanup function
    cleanup();
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('processing-error', registeredCallback);
  });

  test('should handle completion event listeners', () => {
    require('../src/preload');

    const mockCallback = jest.fn();
    const cleanup = exposedAPI.onProcessingComplete(mockCallback);

    // Verify listener was registered
    expect(mockIpcRenderer.on).toHaveBeenCalledWith('processing-complete', expect.any(Function));

    // Get the registered callback
    const registeredCallback = mockIpcRenderer.on.mock.calls
      .find((call: any) => call[0] === 'processing-complete')?.[1];

    // Simulate completion event
    const testData = { success: true, appraisalId: 'test-123' };
    registeredCallback(null, testData);

    // Verify callback was called with correct data
    expect(mockCallback).toHaveBeenCalledWith(testData);

    // Test cleanup function
    cleanup();
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('processing-complete', registeredCallback);
  });

  test('should handle storage error event listeners', () => {
    require('../src/preload');

    const mockCallback = jest.fn();
    const cleanup = exposedAPI.onStorageError(mockCallback);

    // Verify listener was registered
    expect(mockIpcRenderer.on).toHaveBeenCalledWith('storage-error', expect.any(Function));

    // Get the registered callback
    const registeredCallback = mockIpcRenderer.on.mock.calls
      .find((call: any) => call[0] === 'storage-error')?.[1];

    // Simulate storage error event
    const testError = { message: 'Storage failed', type: 'storage_error' };
    registeredCallback(null, testError);

    // Verify callback was called with correct data
    expect(mockCallback).toHaveBeenCalledWith(testError);

    // Test cleanup function
    cleanup();
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('storage-error', registeredCallback);
  });

  test('should handle system operation IPC calls', async () => {
    require('../src/preload');

    // Test showErrorDialog
    mockIpcRenderer.invoke.mockResolvedValue({ response: 0 });
    const dialogResult = await exposedAPI.showErrorDialog('Error', 'Something went wrong');
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-error-dialog', 'Error', 'Something went wrong');

    // Test getAppVersion
    mockIpcRenderer.invoke.mockResolvedValue('1.2.3');
    const version = await exposedAPI.getAppVersion();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-app-version');
    expect(version).toBe('1.2.3');

    // Test getSystemInfo
    const mockSystemInfo = { platform: 'darwin', arch: 'x64' };
    mockIpcRenderer.invoke.mockResolvedValue(mockSystemInfo);
    const systemInfo = await exposedAPI.getSystemInfo();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-system-info');
    expect(systemInfo).toEqual(mockSystemInfo);
  });

  test('should handle removeAllListeners utility', () => {
    require('../src/preload');

    exposedAPI.removeAllListeners();

    // Verify all event listeners are removed
    expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith('processing-progress');
    expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith('processing-complete');
    expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith('processing-error');
    expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith('storage-error');
  });

  test('should handle file dialog operations', async () => {
    require('../src/preload');

    // Test showSaveDialog
    const saveOptions = { defaultPath: 'test.pdf' };
    const saveResult = { canceled: false, filePath: '/path/to/file.pdf' };
    mockIpcRenderer.invoke.mockResolvedValue(saveResult);

    const saveDialogResult = await exposedAPI.showSaveDialog(saveOptions);
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-save-dialog', saveOptions);
    expect(saveDialogResult).toEqual(saveResult);

    // Test showOpenDialog
    const openOptions = { filters: [{ name: 'PDFs', extensions: ['pdf'] }] };
    const openResult = { canceled: false, filePaths: ['/path/to/file.pdf'] };
    mockIpcRenderer.invoke.mockResolvedValue(openResult);

    const openDialogResult = await exposedAPI.showOpenDialog(openOptions);
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-open-dialog', openOptions);
    expect(openDialogResult).toEqual(openResult);
  });

  test('should handle development tools', async () => {
    require('../src/preload');

    mockIpcRenderer.invoke.mockResolvedValue(undefined);
    await exposedAPI.openDevTools();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('open-dev-tools');
  });
});