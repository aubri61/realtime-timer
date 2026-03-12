const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let overlayEnabled = false;

function setOverlayEnabled(enabled) {
  overlayEnabled = enabled;

  if (!mainWindow) {
    return overlayEnabled;
  }

  // PIP 느낌의 오버레이 모드: 항상 위 + 모든 스페이스에 표시
  mainWindow.setAlwaysOnTop(enabled, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(enabled, { visibleOnFullScreen: true });
  mainWindow.setFullScreenable(!enabled);

  return overlayEnabled;
}

function createTrayImage() {
  // macOS tray는 'template' 이미지면 다크/라이트 모드에 맞춰 자동 반전됨.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <g fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="9.5" r="6.2"/>
        <path d="M9 3.3v1.0"/>
        <path d="M9 6.4v3.4l2.3 1.4"/>
      </g>
    </svg>
  `;
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const img = nativeImage.createFromDataURL(dataUrl);
  img.setTemplateImage(true);
  return img;
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow && mainWindow.isVisible() ? '숨기기' : '열기',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: overlayEnabled ? '오버레이 끄기' : '오버레이 켜기',
      click: () => {
        setOverlayEnabled(!overlayEnabled);
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    { role: 'quit', label: '종료' },
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 600,
    resizable: false,
    title: 'Realtime Pomodoro Timer',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const indexPath = path.join(
    __dirname,
    'dist',
    'realtime-timer',
    'browser',
    'index.html',
  );

  mainWindow.loadFile(indexPath);

  mainWindow.on('show', updateTrayMenu);
  mainWindow.on('hide', updateTrayMenu);
  mainWindow.on('closed', () => {
    mainWindow = null;
    updateTrayMenu();
  });

  // 현재 상태 반영
  setOverlayEnabled(overlayEnabled);
}

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(createTrayImage());
  tray.setToolTip('Realtime Timer');
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    updateTrayMenu();
  });
  updateTrayMenu();

  ipcMain.handle('overlay:toggle', () => {
    const next = setOverlayEnabled(!overlayEnabled);
    updateTrayMenu();
    return next;
  });
  ipcMain.handle('overlay:get', () => overlayEnabled);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

