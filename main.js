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
  // macOS 메뉴바용 단색 아이콘 (trayTemplate.png / trayTemplate@2x.png)
  const imgPath = path.join(__dirname, 'public', 'trayTemplate@2x.png');
  const img = nativeImage.createFromPath(imgPath);
  if (!img.isEmpty()) {
    img.setTemplateImage(true); // 라이트/다크 모드에 맞게 자동 반전
  }
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
    icon: path.join(__dirname, 'public', 'clock.png'),
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

