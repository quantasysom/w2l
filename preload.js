const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('w2l', {
  getInitData: () => ipcRenderer.invoke('get-init-data'),
  runCommand: (options) => ipcRenderer.invoke('run-command', options),
  killActiveCommand: () => ipcRenderer.invoke('kill-active-command'),
  readWorkspaceDir: (dirPath) => ipcRenderer.invoke('read-workspace-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (options) => ipcRenderer.invoke('write-file', options),
  
  onCommandStdout: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('command-stdout', listener);
    return () => ipcRenderer.removeListener('command-stdout', listener);
  },
  onCommandStderr: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('command-stderr', listener);
    return () => ipcRenderer.removeListener('command-stderr', listener);
  }
});
