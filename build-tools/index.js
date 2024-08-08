const fs = require('fs').promises;
const path = require('path');

// Load the configuration file
async function loadConfig(configPath) {
    try {
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading configuration file: ${error.message}`);
        process.exit(1);
    }
}

// Function to recursively read directories and update the manifest
async function updateManifest(config, dir, fileList = []) {
    const files = await fs.readdir(dir);
    await Promise.all(files.map(async (file) => {
        let filePath = path.join(dir, file).replace(/\\/g, '/'); // Normalize to forward slashes
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
            await updateManifest(config, filePath, fileList);
        } else {
            const relativePath = filePath.replace(config.rootDir, '').replace(/\\/g, '/');

            // Exclude files based on path or extension
            if (config.excludePaths.some(excludePath => relativePath.startsWith(excludePath)) ||
                config.excludeExtensions.some(ext => filePath.endsWith(ext))) {
                return;
            }

            // Include files based on extension
            if (config.includeExtensions.some(ext => filePath.endsWith(ext))) {
                fileList.push({
                    path: relativePath.replace('index.html', ''), // For extensionless URLs
                    lastModified: stat.mtime.getTime()
                });
            }
        }
    }));
    return fileList;
}

async function generateManifest() {
    // Load configuration
    const config = await loadConfig(path.resolve(__dirname, 'cache-config.json'));

    const version = new Date().getTime();
    const manifestPath = path.join(config.rootDir, 'cache-manifest.json');
    let manifest = { version: version, files: [] };

    if (await fs.access(manifestPath).then(() => true).catch(() => false)) {
        manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
        manifest.version = version;
    }

    // Update the manifest with new file data
    const newFiles = await updateManifest(config, config.rootDir);
    manifest.files = newFiles;

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('Cache manifest updated.');
}

generateManifest().catch(console.error);
