importScripts('./uv.bundle.js', './uv.config.js', './uv.sw.js');
const uv = new UVServiceWorker();
const base = new URL('./', location).href;
const prefix = location.origin + __uv$config.prefix;
const drop = ['link', 'refresh', 'report-to', 'reporting-endpoints', 'nel', 'clear-site-data', 'speculation-rules'];
const deny = 'camera microphone geolocation display-capture usb serial hid midi payment publickey-credentials-get publickey-credentials-create otp-credentials identity-credentials-get idle-detection local-fonts window-management screen-wake-lock xr-spatial-tracking accelerometer gyroscope magnetometer compute-pressure browsing-topics attribution-reporting join-ad-interest-group run-ad-auction shared-storage storage-access clipboard-read keyboard-map';
const policy = {
  'content-security-policy': `default-src ${base} data: blob: 'unsafe-inline' 'unsafe-eval'; frame-src ${prefix} blob:; form-action ${prefix}; frame-ancestors 'self'`,
  'permissions-policy': deny.split(' ').map(name => name + '=()').join(', '),
  'x-dns-prefetch-control': 'off',
};
uv.on('request', e => {
  const { data } = e, ref = data.headers.referer && new URL(data.headers.referer);
  if (data.url.protocol !== 'https:') e.respondWith(Response.error());
  else if (ref && ref.origin !== data.url.origin) data.headers.referer = ref.origin + '/';
});
uv.on('response', ({ data: { headers } }) => {
  for (const name of drop) delete headers[name];
  Object.assign(headers, policy);
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('fetch', e => {
  const { request } = e, proxied = uv.route(e);
  e.respondWith(!request.url.startsWith(base) || proxied && request.destination === 'document' ? Response.error() : proxied ? uv.fetch(e) : fetch(request, { referrer: '' }));
});