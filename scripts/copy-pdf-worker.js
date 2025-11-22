const fs = require('fs');
const path = require('path');

const workerSrc = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const workerDest = path.join(__dirname, '../public/pdf.worker.min.mjs');

try {
  // Ensure public directory exists
  const publicDir = path.dirname(workerDest);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.copyFileSync(workerSrc, workerDest);
  console.log('PDF worker file copied successfully to public/pdf.worker.min.mjs');
} catch (error) {
  console.error('Error copying PDF worker file:', error);
  // The build will continue without the PDF worker file. This may cause PDF functionality to break at runtime.
}
