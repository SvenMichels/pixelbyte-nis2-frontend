/**
 * Proxy-Konfiguration für ng serve (Development).
 *
 * TARGET = URL deines deployed Backends.
 * Setze die echte URL in einer .env Datei oder passe sie hier direkt an.
 *
 * Wenn du das Backend lokal laufen hast:
 *   target → http://localhost:3000
 *   pathRewrite → { "^/api": "" }
 */

const BACKEND_URL = process.env['BACKEND_URL'] || 'https://pixelbyte.dev';

module.exports = {
    '/api': {
        target: BACKEND_URL,
        secure: true,
        changeOrigin: true,
        logLevel: 'warn',
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
        pathRewrite: {
            '^/api': '/nis2/api',
        },
    },
};

