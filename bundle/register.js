import { BareMuxConnection } from './baremux/index.mjs';
export const WISP = localStorage.wisp;
export const encode = url => new URL('./service/', import.meta.url).pathname + encodeURIComponent(url);
export async function boot(wisp = WISP) {
  if (!wisp) throw Error('no wisp server set: open bundle/key.html');
  if (!navigator.serviceWorker) throw Error('service worker unavailable (needs https or localhost)');
  await navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: new URL('./', import.meta.url).pathname });
  await new BareMuxConnection(new URL('./baremux/worker.js', import.meta.url).href).setTransport(new URL('./epoxy/index.mjs', import.meta.url).href, [{ wisp }]);
}
