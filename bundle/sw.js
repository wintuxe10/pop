importScripts('./uv.bundle.js', './uv.config.js', './uv.sw.js');
const uv = new UVServiceWorker();
self.addEventListener('fetch', e => uv.route(e) && e.respondWith(uv.fetch(e)));
