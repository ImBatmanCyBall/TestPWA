(async function () {

    const express = require('express'),
        cors = require('cors'),
        helmet = require('helmet'),
        chokidar = require('chokidar'),
        bodyParser = require('body-parser'),
        errorHandler = require('./routes/error'),
        expressStaticGzip = require('express-static-gzip'),
        path = require('path');

    function setCacheControl(res, path, stat) {

        const oneDay = 86400;
        const oneYear = 31536000;

        if (path.endsWith('.wasm')) {
            res.set('Cache-Control', `public, max-age=${oneDay}`);
        } else if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html')) {
            res.set('Cache-Control', `public, max-age=${oneDay}`);
        } else {
            res.set('Cache-Control', 'public, max-age=0, must-revalidate');
        }

    }

    function setHeaders(res, filePath) {

        setCacheControl(res, filePath);

        res.setHeader('Last-Modified', app.locals[filePath] || new Date().toUTCString());
        
        if (filePath.endsWith('.gz')) {
        
            res.setHeader('Content-Encoding', 'gzip');
        
            if (filePath.endsWith('.wasm.gz')) {
                res.setHeader('Content-Type', 'application/wasm');
            } else if (filePath.endsWith('.js.gz')) {
                res.setHeader('Content-Type', 'application/javascript');
            } else if (filePath.endsWith('.css.gz')) {
                res.setHeader('Content-Type', 'text/css');
            } else if (filePath.endsWith('.html.gz')) {
                res.setHeader('Content-Type', 'text/html');
            }
        
        } else if (filePath.endsWith('.br')) {
        
            res.setHeader('Content-Encoding', 'br');
        
            if (filePath.endsWith('.wasm.br')) {
                res.setHeader('Content-Type', 'application/wasm');
            } else if (filePath.endsWith('.js.br')) {
                res.setHeader('Content-Type', 'application/javascript');
            } else if (filePath.endsWith('.css.br')) {
                res.setHeader('Content-Type', 'text/css');
            } else if (filePath.endsWith('.html.br')) {
                res.setHeader('Content-Type', 'text/html');
            }
        
        }

    }

    const app = express();
    const port = process.env.XEXPublicPort || 20511;

    // Middleware to serve static files with gzip and Brotli compression
    app.use('/', expressStaticGzip(__dirname, {
        enableBrotli: true,
        orderPreference: ['br', 'gz'],
        setHeaders: setHeaders
    }));

    // Watch for file changes
    const watcher = chokidar.watch(path.join(__dirname, 'public'), {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
    });

    watcher.on('change', (filePath) => {

        console.log(`${filePath} has been changed. Invalidating cache...`);

        // Invalidate cache by removing the file from require.cache
        Object.keys(require.cache).forEach((id) => {
            if (id.startsWith(__dirname)) {
                delete require.cache[id];
            }
        });

        // Alternatively, just update Last-Modified header
        const stat = fs.statSync(filePath);
        app.locals[filePath] = stat.mtime.toUTCString();
        
    });

    app.use(bodyParser.json());
    app.use(cors({ origin: "*" }));
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", "'https:'", "data:"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'https:'"],
                styleSrc: ["'self'", "'unsafe-inline'", "'https:'"],
                imgSrc: ["'self'", "data:", "'https:'"],
                fontSrc: ["'self'", "'https:'"],
                connectSrc: ["'self'", "'https:'"]
            }
        },
        referrerPolicy: { policy: 'no-referrer' },
        frameguard: { action: 'deny' }
    }));

    // Error logging middleware
    app.use(errorHandler);

    // Start the server
    app.listen(port, () => {
        console.log(`XEX App API Server listening on port ${port}`);
    });

})();
