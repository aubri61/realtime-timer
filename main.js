const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  Notification,
} = require('electron');
const path = require('path');
const { exec } = require('child_process');

let tray = null;
let mainWindow = null;
let overlayEnabled = false;
let overlayOpacity = 0.8;

function setOverlayEnabled(enabled) {
  overlayEnabled = enabled;

  if (!mainWindow) {
    return overlayEnabled;
  }

  // PIP 느낌의 오버레이 모드: 항상 위 + 모든 스페이스에 표시
  mainWindow.setAlwaysOnTop(enabled, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(enabled, { visibleOnFullScreen: true });
  mainWindow.setFullScreenable(!enabled);

  if (enabled) {
    mainWindow.setSize(260, 220);
    mainWindow.setOpacity(overlayOpacity);
  } else {
    mainWindow.setSize(420, 600);
    mainWindow.setOpacity(1);
  }

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
  ipcMain.handle('overlay:set-opacity', (_event, percent) => {
    if (!mainWindow) {
      return Math.round(overlayOpacity * 100);
    }

    const numeric = Number(percent);
    if (!Number.isFinite(numeric)) {
      return Math.round(overlayOpacity * 100);
    }

    // 0.2~1.0 사이로 클램프 (20%~100%)
    overlayOpacity = Math.max(0.2, Math.min(1, numeric / 100));

    if (overlayEnabled) {
      mainWindow.setOpacity(overlayOpacity);
    }

    return Math.round(overlayOpacity * 100);
  });

  ipcMain.handle('timer:finished', (_event, mode) => {
    if (!Notification.isSupported()) {
      return;
    }

    const isWork = mode === 'work';
    const title = isWork ? '집중 시간 종료' : '휴식 시간 종료';
    const body = isWork
      ? '집중 시간이 끝났어요. 잠시 휴식하세요.'
      : '휴식이 끝났어요. 다시 집중을 시작해볼까요?';

    const notification = new Notification({
      title,
      body,
      silent: true, // 소리는 직접 afplay로 재생하므로 무음 알림
    });

    notification.show();
  });

  ipcMain.handle('play-system-sound', async (_event, soundName) => {
    if (process.platform !== 'darwin') {
      return;
    }

    const safe = String(soundName).replace(/[^A-Za-z]/g, '');
    if (!safe) return;

    exec(`afplay "/System/Library/Sounds/${safe}.aiff"`);
  });

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

