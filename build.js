import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

// Ensure clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy all static site files
const extensionsToCopy = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.txt', '.xml', '.webmanifest', '.json'];
const filesToExclude = ['package.json', 'package-lock.json', 'metadata.json', 'bun.lock'];

const entries = fs.readdirSync(__dirname, { withFileTypes: true });

for (const entry of entries) {
  if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
    continue;
  }
  
  const srcPath = path.join(__dirname, entry.name);
  const destPath = path.join(distDir, entry.name);

  if (entry.isDirectory()) {
    if (entry.name === 'public') {
      // Copy contents of public directly to dist
      fs.cpSync(srcPath, distDir, { recursive: true });
    } else if (entry.name !== 'screenshots') {
      fs.cpSync(srcPath, destPath, { recursive: true });
    }
  } else if (entry.isFile()) {
    if (filesToExclude.includes(entry.name)) continue;
    if (entry.name === 'build.js' || entry.name === 'dev-server.js' || entry.name === 'submit-indexnow.js') continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (extensionsToCopy.includes(ext) || entry.name.startsWith('_')) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Build complete: pure static HTML/CSS/JS copied to dist/');
