import fs from 'fs';
import path from 'path';

// Asegurar directorios
if (!fs.existsSync('build')) {
  fs.mkdirSync('build', { recursive: true });
}
if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

console.log('Procesando icono con Bun.image()...');

const sourceFile = Bun.file('icono.png');
if (!(await sourceFile.exists())) {
  console.error('No se encontró icono.png en la raíz');
  process.exit(1);
}

// 1. Icono principal 512x512 para electron-builder y Linux
await (await sourceFile.image())
  .resize(512, 512, { fit: 'inside' })
  .png()
  .write('build/icon.png');

// 2. Icono 256x256 para Windows taskbar y paquetes
await (await sourceFile.image())
  .resize(256, 256, { fit: 'inside' })
  .png()
  .write('build/icon-256.png');

// 3. Iconos pequeños para favicon y ventana
await (await sourceFile.image())
  .resize(64, 64, { fit: 'inside' })
  .png()
  .write('public/icon.png');

await (await sourceFile.image())
  .resize(32, 32, { fit: 'inside' })
  .png()
  .write('public/favicon.png');

console.log('✓ Iconos generados con éxito con Bun.image():');
console.log('  - build/icon.png (512x512)');
console.log('  - build/icon-256.png (256x256)');
console.log('  - public/icon.png (64x64)');
console.log('  - public/favicon.png (32x32)');
