const { app, BrowserWindow, dialog, shell } = require('electron');

const defaultUrl = 'http://localhost:5000/admin';

const getAdminUrl = () => {
  const cliUrl = process.argv
    .find((arg) => arg.startsWith('--url='))
    ?.slice('--url='.length)
    ?.trim();

  if (cliUrl) return cliUrl;
  if (process.env.ADMIN_URL) return process.env.ADMIN_URL.trim();
  return defaultUrl;
};

const adminUrl = getAdminUrl();

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 680,
    autoHideMenuBar: true,
    title: 'Instrevi Admin',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  try {
    await mainWindow.loadURL(adminUrl);
  } catch (error) {
    dialog.showErrorBox(
      'Unable to open admin page',
      `Could not load ${adminUrl}.\n\n${error.message}`
    );
  }
};

app.whenReady().then(() => {
  createWindow();

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
