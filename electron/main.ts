import { app, BrowserWindow, dialog, ipcMain, shell, Menu, screen } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // En Hyprland (tiling/Wayland) una ventana de tamaño fijo se abre flotante,
  // descentrada o con parpadeo de redimensionado. Para que se vea bien y se
  // acomode sola: tamaño limitado al área útil, arranque oculto y mostrar
  // ya colocada cuando el contenido está listo.
  const { width: areaWidth, height: areaHeight } = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.max(1024, Math.min(1320, Math.floor(areaWidth * 0.94)));
  const height = Math.max(680, Math.min(860, Math.floor(areaHeight * 0.92)));

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    center: true,
    title: 'Pliegue — Preprensa Digital',
    backgroundColor: '#fafafa',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Mostrar la ventana ya colocada (sin parpadeo). En Linux/Hyprland se abre
  // maximizada para que quede bien acomodada; en el resto, centrada.
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    // Normalizar zoom: si quedó un zoom persistido (p. ej. Ctrl++) el
    // contenido se ve gigante y cortado. Se fuerza 100% al arrancar.
    if (mainWindow.webContents.getZoomFactor() !== 1) {
      mainWindow.webContents.setZoomFactor(1);
    }
    if (process.platform === 'linux') {
      mainWindow.show();
      mainWindow.maximize();
    } else {
      mainWindow.center();
      mainWindow.show();
    }
    const display = screen.getPrimaryDisplay();
    console.log(
      '[Pliegue] ventana:',
      mainWindow.getBounds(),
      'zoom:',
      mainWindow.webContents.getZoomFactor(),
      'pantalla util:',
      display.workAreaSize,
      'escala:',
      display.scaleFactor
    );
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
  // Control de zoom: Ctrl+0 restablece al 100%, Ctrl++ / Ctrl+- ajustan
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key.toLowerCase() === 'i')
    ) {
      mainWindow?.webContents.toggleDevTools();
    }
    if (input.control && !input.shift && !input.alt && !input.meta) {
      const wc = mainWindow?.webContents;
      if (!wc) return;
      if (input.key === '0') {
        wc.setZoomFactor(1);
      } else if (input.key === '+' || input.key === '=') {
        wc.setZoomFactor(Math.min(3, wc.getZoomFactor() + 0.1));
      } else if (input.key === '-') {
        wc.setZoomFactor(Math.max(0.5, wc.getZoomFactor() - 0.1));
      }
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

// Idioma y configuración regional del sistema operativo
ipcMain.handle('app:get-locale', () => {
  return app.getLocale();
});

ipcMain.handle('app:get-preferred-languages', () => {
  return app.getPreferredSystemLanguages?.() || [app.getLocale()];
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
