const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Post-build script to ZIP the NSIS installer
 * This makes the installer safer to download (browsers less likely to block ZIP files)
 * Also filters artifacts to only publish ZIP to GitHub (not the raw .exe)
 */
exports.default = async function(context) {
  const { outDir, artifactPaths } = context;
  
  console.log('📦 Post-build: Creating ZIP archive of NSIS installer...');

  // Find the NSIS installer artifact
  const nsisArtifact = artifactPaths.find(p => p.endsWith('.exe') && !p.includes('blockmap'));
  
  if (!nsisArtifact) {
    console.log('⚠️  No NSIS installer found, skipping ZIP creation');
    return;
  }

  const nsisPath = nsisArtifact;
  const nsisFile = path.basename(nsisPath);
  const zipFileName = nsisFile.replace('.exe', '.zip');
  const zipPath = path.join(path.dirname(nsisPath), zipFileName);

  // Create ZIP archive
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      const size = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Created ${zipFileName} (${size} MB)`);
      console.log(`📁 Location: ${zipPath}`);
      resolve();
    });

    archive.on('error', (err) => {
      console.error('❌ Error creating ZIP:', err);
      reject(err);
    });

    archive.pipe(output);
    archive.file(nsisPath, { name: nsisFile });
    archive.finalize();
  });

  // Return only the ZIP for publishing to GitHub
  // The .exe will be filtered out, but we still need it locally for auto-updates
  console.log('🚀 ZIP file will be published to GitHub (excluding raw .exe)');
  console.log('ℹ️  Auto-update files (.blockmap, latest.yml) will still be published');
  
  return [zipPath];
};

