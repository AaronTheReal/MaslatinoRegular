// Crea carpeta scripts/ y este archivo
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const browser = join(root, 'dist/nombre-proyecto/browser');
const csr = join(browser, 'index.csr.html');
const html = join(browser, 'index.html');

if (existsSync(csr)) {
  copyFileSync(csr, html);
  console.log('✔ index.csr.html → index.html');
} else {
  console.log('⚠ No se encontró index.csr.html');
}
