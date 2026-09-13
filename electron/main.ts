import { app, BrowserWindow, dialog, ipcMain, shell, Menu } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'Pliegue — Preprensa Digital',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // En Windows y Linux eliminamos por completo la barra de menús anticuada
  if (process.platform === 'darwin') {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: app.name,
        submenu: [
          { role: 'about' as const, label: 'Acerca de Pliegue' },
          { type: 'separator' as const },
          { role: 'services' as const, label: 'Servicios' },
          { type: 'separator' as const },
          { role: 'hide' as const, label: 'Ocultar Pliegue' },
          { role: 'hideOthers' as const, label: 'Ocultar Otros' },
          { role: 'unhide' as const, label: 'Mostrar Todos' },
          { type: 'separator' as const },
          { role: 'quit' as const, label: 'Salir de Pliegue' },
        ],
      },
      {
        label: 'Edición',
        submenu: [
          { role: 'undo', label: 'Deshacer' },
          { role: 'redo', label: 'Rehacer' },
          { type: 'separator' },
          { role: 'cut', label: 'Cortar' },
          { role: 'copy', label: 'Copiar' },
          { role: 'paste', label: 'Pegar' },
          { role: 'selectAll', label: 'Seleccionar todo' },
        ],
      },
      {
        label: 'Ventana',
        submenu: [
          { role: 'minimize', label: 'Minimizar' },
          { role: 'zoom', label: 'Maximizar' },
          { type: 'separator' },
          { role: 'front', label: 'Traer todo al frente' },
        ],
      },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    // Deshabilitar y remover la barra de menús en Windows y Linux
    Menu.setApplicationMenu(null);
    mainWindow.removeMenu();
  }

  // Abrir consola de desarrollo (DevTools) con F12 o Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key.toLowerCase() === 'i')
    ) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  // En modo desarrollo, abrir la consola automáticamente
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('Error al conectar con Vite dev server:', err);
      // Fallback a dist si existe
      const distIndex = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(distIndex)) {
        mainWindow?.loadFile(distIndex);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Diálogo nativo para abrir PDF
async function handleOpenPDFDialog() {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo PDF para imposición',
    buttonLabel: 'Abrir PDF',
    filters: [
      { name: 'Documentos PDF (*.pdf)', extensions: ['pdf'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const fileBuffer = await fs.promises.readFile(filePath);
  const fileName = path.basename(filePath);

  return {
    canceled: false,
    name: fileName,
    path: filePath,
    data: new Uint8Array(fileBuffer),
  };
}

// Registrar manejadores IPC
ipcMain.handle('dialog:open-pdf', async () => {
  return await handleOpenPDFDialog();
});

ipcMain.handle(
  'dialog:save-pdf',
  async (_event, { defaultName, bytes }: { defaultName: string; bytes: Uint8Array }) => {
    if (!mainWindow) return { canceled: true, error: 'No hay ventana activa' };

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar PDF Imposicionado',
      defaultPath: defaultName,
      filters: [{ name: 'Documento PDF (*.pdf)', extensions: ['pdf'] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    try {
      await fs.promises.writeFile(result.filePath, Buffer.from(bytes));
      return {
        canceled: false,
        filePath: result.filePath,
      };
    } catch (err: any) {
      console.error('Error al escribir archivo PDF:', err);
      return {
        canceled: false,
        error: err.message || 'Error al guardar el archivo',
      };
    }
  }
);

ipcMain.handle('shell:open-path', async (_event, filePath: string) => {
  return await shell.openPath(filePath);
});

ipcMain.handle('shell:show-item-in-folder', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// Ciclo de vida de la aplicación Electron
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
