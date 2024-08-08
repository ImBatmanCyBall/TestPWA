importScripts("js/libs/localforage.min.js");

const currentVersion = "1.0.0.2";
const preCache = "PRECACHE-" + currentVersion;
const manifestUrl = 'cache-manifest.json';

self.addEventListener("install", (event) => {
    console.log("Installing the service worker!");
    self.skipWaiting();
    // Uncomment the following line if you want to cache assets during installation
    // event.waitUntil(updateCacheFromManifest());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clearOldCaches());
});

self.addEventListener("fetch", (event) => {
    event.respondWith(cachedFetch(event.request));
});

async function updateCacheFromManifest() {
    try {
        const manifestVersion = await localforage.getItem('manifestVersion') || 0;
        const response = await fetch(manifestUrl);

        if (!response.ok) {
            console.error('Failed to fetch manifest:', response.status, response.statusText);
            return;
        }

        const manifest = await response.json();

        if (manifest.version !== manifestVersion) {
            await localforage.setItem('manifestVersion', manifest.version);
            console.log("New version found. Updating cache...");
            await updateCacheFiles(manifest.files);
        }
    } catch (err) {
        console.error('Error fetching manifest:', err);
    }
}

async function updateCacheFiles(files) {
    const cache = await caches.open(preCache);

    for (const file of files) {
        const response = await cache.match(file.path);
        const lastModifiedHeader = response ? response.headers.get('last-modified') : null;

        const roundedOriginalDate = Math.floor(new Date(lastModifiedHeader).getTime() / 1000) * 1000;
        const roundedManifestDate = Math.floor(new Date(file.lastModified).getTime() / 1000) * 1000;

        const shouldUpdate = roundedOriginalDate < roundedManifestDate;

        if (response) {
            console.log(`Found in cache: ${file.path} - ${lastModifiedHeader}`);
        }

        if (shouldUpdate) {
            console.log('Updating cache:', file.path);
            await cache.add(file.path);
        }
    }
}

async function clearOldCaches() {
    const cacheNames = await caches.keys();

    await Promise.all(
        cacheNames.map(cacheName => {
            if (cacheName !== preCache) {
                return caches.delete(cacheName);
            }
        })
    );

    await updateCacheFromManifest();
}

async function cachedFetch(request) {
    if (request.method === "GET") {
        const cachedResponse = await caches.match(request, {
            ignoreSearch: true,
            ignoreVary: true
        });

        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);

        if (networkResponse.ok && shouldCache(networkResponse)) {
            const cacheCopy = networkResponse.clone();
            caches.open(preCache).then(cache => cache.put(request, cacheCopy));
        }

        return networkResponse;
    }

    return fetch(request);
}

function shouldCache(response) {
    const contentType = response.headers.get('Content-Type');

    const cacheableContentTypes = [
        'text/html',
        'text/css',
        'application/javascript',
        'application/wasm',
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'font/woff',
        'font/woff2',
        'font/ttf'
    ];

    return cacheableContentTypes.some(type => contentType.includes(type));
}

self.addEventListener('message', async (event) => {
    if (event.data.action) {
        switch (event.data.action) {
            case 'updateCache':
                await updateCacheFromManifest();
                break;

            case 'flush-updateCache':
                await clearOldCaches();
                await updateCacheFromManifest();
                break;

            default:
                break;
        }
    }
});

// Optional: Periodic cache update
async function periodicAssetUpdate() {
    const lastCheck = await localforage.getItem(LAST_ASSET_CHECK);

    if (!lastCheck) {
        updatePreCache();
    } else {
        const delta = daysDifferent(new Date(lastCheck), new Date());
        if (delta > 4) {
            updatePreCache();
        }
    }
}

function daysDifferent(d1, d2) {
    const t2 = d2.getTime();
    const t1 = d1.getTime();
    return parseInt((t2 - t1) / (24 * 3600 * 1000));
}

async function updatePreCache() {
    await clearOldCaches();
    await updateCacheFromManifest();
}

// Trigger the initial cache update
updatePreCache();
