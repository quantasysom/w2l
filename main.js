const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;
let activeProcess = null;

const binDir = path.join(__dirname, 'bin');
const bridgesDir = path.join(binDir, 'powershell-bridges');
const busyboxPath = path.join(binDir, 'busybox.exe');

// Helper to translate path from Linux style to Windows
function nixToWin(p, currentCwdWin) {
  if (!p) return currentCwdWin;
  
  // Normalize slash direction
  let normalized = p.replace(/\//g, '\\');
  
  // Check absolute paths like /mnt/c/...
  let m = p.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (m) {
    return `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, '\\')}`;
  }
  
  // Check alternative absolute paths like /c/...
  m = p.match(/^\/([a-zA-Z])\/(.*)$/);
  if (m) {
    // Exclude ~ and relative paths
    if (m[1].toLowerCase() !== 'mnt') {
      return `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, '\\')}`;
    }
  }
  
  // Homedir ~
  if (p === '~') {
    return os.homedir();
  }
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.substring(2).replace(/\//g, '\\'));
  }
  
  // Relative path
  return path.resolve(currentCwdWin, normalized);
}

// Helper to translate path from Windows style to Linux
function winToNix(p) {
  if (!p) return p;
  let m = p.match(/^([A-Za-z]):\\(.*)$/);
  if (m) {
    return '/mnt/' + m[1].toLowerCase() + '/' + m[2].replace(/\\/g, '/');
  }
  m = p.match(/^([A-Za-z]):\/(.*)$/);
  if (m) {
    return '/mnt/' + m[1].toLowerCase() + '/' + m[2];
  }
  return p.replace(/\\/g, '/');
}

// Download busybox.exe
function ensureBusyBox() {
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
  if (!fs.existsSync(bridgesDir)) {
    fs.mkdirSync(bridgesDir, { recursive: true });
  }

  if (fs.existsSync(busyboxPath)) {
    return Promise.resolve(busyboxPath);
  }

  return new Promise((resolve, reject) => {
    console.log('Downloading busybox.exe (64-bit)...');
    const file = fs.createWriteStream(busyboxPath);
    https.get('https://frippery.org/files/busybox/busybox64.exe', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('busybox.exe downloaded successfully.');
        resolve(busyboxPath);
      });
    }).on('error', (err) => {
      fs.unlink(busyboxPath, () => {});
      reject(err);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hidden', // Premium borderless look, custom titlebar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    await ensureBusyBox();
    // Set up bridges
    createPowerShellBridges();
  } catch (err) {
    console.error('Failed to set up BusyBox or PowerShell bridges:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Setup custom PowerShell bridges
function createPowerShellBridges() {
  // 1. apt bridge (winget under the hood)
  const aptCmd = `@echo off\npowershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0apt.ps1'" %*`;
  const aptPs1 = `
param(
    [string]$action,
    [string]$package
)
if ($action -eq "install") {
    if (-not $package) {
        Write-Host "apt: missing package name" -ForegroundColor Red
        exit 1
    }
    Write-Host "Running winget install $package..." -ForegroundColor Green
    winget install --id $package
} else {
    Write-Host "apt: Action '$action' is not emulated. Use 'install'." -ForegroundColor Yellow
}
`;

  // 2. systemctl bridge
  const systemctlCmd = `@echo off\npowershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0systemctl.ps1'" %*`;
  const systemctlPs1 = `
param(
    [string]$action,
    [string]$service
)
if (-not $action -or -not $service) {
    Write-Host "Usage: systemctl [start|stop|status] [service_name]" -ForegroundColor Yellow
    exit 1
}
if ($action -eq "start") {
    Start-Service -Name $service -ErrorAction SilentlyContinue
    if ($?) { Write-Host "Service '$service' started." -ForegroundColor Green }
    else { Write-Host "Failed to start service '$service' (requires administrator privileges)." -ForegroundColor Red }
} elseif ($action -eq "stop") {
    Stop-Service -Name $service -ErrorAction SilentlyContinue
    if ($?) { Write-Host "Service '$service' stopped." -ForegroundColor Green }
    else { Write-Host "Failed to stop service '$service' (requires administrator privileges)." -ForegroundColor Red }
} elseif ($action -eq "status") {
    Get-Service -Name $service
}
`;

  // 3. open / xdg-open bridge
  const openCmd = `@echo off\npowershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0open.ps1'" %*`;
  const openPs1 = `
param(
    [string]$target = "."
)
# Convert path if it is Linux-style
if ($target.StartsWith("/")) {
    # Simple conversion
    if ($target -match "^/mnt/([a-zA-Z])/(.*)$") {
        $target = "$($Matches[1]):\\$($Matches[2] -replace '/', '\\')"
    } elseif ($target -match "^/([a-zA-Z])/(.*)$") {
        $target = "$($Matches[1]):\\$($Matches[2] -replace '/', '\\')"
    }
}
Write-Host "Opening target: $target" -ForegroundColor Green
Start-Process $target
`;

  fs.writeFileSync(path.join(bridgesDir, 'apt.cmd'), aptCmd);
  fs.writeFileSync(path.join(bridgesDir, 'apt.ps1'), aptPs1);
  fs.writeFileSync(path.join(bridgesDir, 'systemctl.cmd'), systemctlCmd);
  fs.writeFileSync(path.join(bridgesDir, 'systemctl.ps1'), systemctlPs1);
  fs.writeFileSync(path.join(bridgesDir, 'open.cmd'), openCmd);
  fs.writeFileSync(path.join(bridgesDir, 'open.ps1'), openPs1);
  fs.writeFileSync(path.join(bridgesDir, 'xdg-open.cmd'), openCmd); // Link xdg-open to open
  fs.writeFileSync(path.join(bridgesDir, 'xdg-open.ps1'), openPs1);
}

// --- IPC IPC HANDLERS ---

ipcMain.handle('get-init-data', () => {
  const winRoot = path.resolve(app.getAppPath());
  return {
    winRoot,
    nixRoot: winToNix(winRoot),
    username: os.userInfo().username,
    hostname: os.hostname(),
  };
});

ipcMain.handle('run-command', async (event, { command, cwdNix, cwdWin }) => {
  const line = command.trim();
  if (!line) return { out: [] };

  const parts = line.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  // 1. CD Command Handling
  if (cmd === 'cd') {
    const target = args[0] || '~';
    let targetWin = nixToWin(target, cwdWin);
    
    if (fs.existsSync(targetWin) && fs.statSync(targetWin).isDirectory()) {
      const newWin = path.resolve(targetWin);
      const newNix = winToNix(newWin);
      return {
        cd: { win: newWin, nix: newNix },
        out: [{ text: `Directory changed.`, cls: 'dim' }]
      };
    } else {
      return {
        out: [{ text: `cd: ${target}: No such directory`, cls: 'red' }]
      };
    }
  }

  // 2. Other Commands
  return new Promise((resolve) => {
    // Build path environment to include our bridges and busybox
    const pathDelimiter = process.platform === 'win32' ? ';' : ':';
    const customEnv = {
      ...process.env,
      PATH: `${bridgesDir}${pathDelimiter}${binDir}${pathDelimiter}${process.env.PATH}`,
    };

    // Determine if it needs to run inside BusyBox sh
    const hasShellOperators = /[|><&;$]/.test(line);
    let spawnCmd, spawnArgs;

    // Direct busybox commands
    const busyboxCmds = [
      'ls', 'cat', 'grep', 'rm', 'mkdir', 'touch', 'cp', 'mv', 'pwd', 
      'whoami', 'uname', 'echo', 'chmod', 'sed', 'awk', 'find', 'wc', 
      'diff', 'tar', 'gzip', 'unzip', 'sleep'
    ];

    if (hasShellOperators) {
      spawnCmd = busyboxPath;
      spawnArgs = ['sh', '-c', line];
    } else if (busyboxCmds.includes(cmd)) {
      spawnCmd = busyboxPath;
      spawnArgs = [cmd, ...args];
    } else {
      // Pass-through to standard executable
      spawnCmd = cmd;
      spawnArgs = args;
    }

    try {
      activeProcess = spawn(spawnCmd, spawnArgs, {
        cwd: cwdWin,
        env: customEnv,
        shell: !hasShellOperators && !busyboxCmds.includes(cmd), // Use system shell for external raw programs
      });

      activeProcess.stdout.on('data', (data) => {
        mainWindow.webContents.send('command-stdout', data.toString());
      });

      activeProcess.stderr.on('data', (data) => {
        mainWindow.webContents.send('command-stderr', data.toString());
      });

      activeProcess.on('close', (code) => {
        activeProcess = null;
        resolve({ exitCode: code });
      });

      activeProcess.on('error', (err) => {
        activeProcess = null;
        resolve({
          out: [{ text: `Error: Command failed to run: ${err.message}`, cls: 'red' }]
        });
      });

    } catch (e) {
      activeProcess = null;
      resolve({
        out: [{ text: `Execution Exception: ${e.message}`, cls: 'red' }]
      });
    }
  });
});

ipcMain.handle('kill-active-command', () => {
  if (activeProcess) {
    activeProcess.kill('SIGINT');
    activeProcess = null;
    return true;
  }
  return false;
});

// Directory Tree for Visual Explorer
ipcMain.handle('read-workspace-dir', async (event, dirPath) => {
  try {
    function buildTree(currentPath, baseDir) {
      const items = fs.readdirSync(currentPath);
      const result = [];

      for (const item of items) {
        if (item === '.git' || item === 'node_modules' || item === 'dist') {
          // Add them as collapsed folders without children for efficiency
          const isDir = fs.statSync(path.join(currentPath, item)).isDirectory();
          if (isDir) {
            result.push({
              type: 'dir',
              name: item,
              open: false,
              children: []
            });
          }
          continue;
        }

        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        if (stat.isDirectory()) {
          result.push({
            type: 'dir',
            name: item,
            open: false,
            children: buildTree(fullPath, baseDir)
          });
        } else {
          result.push({
            type: 'file',
            name: item,
            path: relPath
          });
        }
      }
      // Sort: directories first, then files
      return result.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      });
    }

    if (fs.existsSync(dirPath)) {
      return buildTree(dirPath, dirPath);
    }
    return [];
  } catch (err) {
    console.error('Failed to read workspace dir:', err);
    return [];
  }
});

// File operations for coding agent
ipcMain.handle('read-file', (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return `Error: Could not read file: ${err.message}`;
  }
});

ipcMain.handle('write-file', (event, { filePath, content }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
