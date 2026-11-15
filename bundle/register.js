import { BareMuxConnection } from './baremux/index.mjs';
const frame = document.querySelector('iframe');
const input = document.querySelector('input');
const at = path => new URL(path, import.meta.url);
const wipe = async () => {
  for (const key of Object.keys(localStorage)) ['wisp', 'bare-mux-path'].includes(key) || localStorage.removeItem(key);
  sessionStorage.clear();
  for (const key of await caches.keys()) await caches.delete(key);
  for (const cookie of await self.cookieStore?.getAll() ?? []) await cookieStore.delete(cookie);
  for (const name of await navigator.storageBuckets?.keys() ?? []) await navigator.storageBuckets.delete(name);
  const root = await navigator.storage.getDirectory();
  for await (const name of root.keys()) await root.removeEntry(name, { recursive: true });
  for (const { name } of await indexedDB.databases()) await new Promise(done => {
    const req = name === '__op' ? indexedDB.open(name) : indexedDB.deleteDatabase(name);
    req.onerror = req.onblocked = done;
    req.onsuccess = () => {
      const db = req.result;
      if (!db?.objectStoreNames.length) return db?.close(), done();
      const tx = db.transaction(db.objectStoreNames, 'readwrite');
      for (const store of db.objectStoreNames) tx.objectStore(store).clear();
      tx.oncomplete = tx.onabort = () => (db.close(), done());
    };
  });
};
const boot = (async () => {
  if (!localStorage.wisp) throw Error('no wisp server set: open bundle/key.html');
  if (!navigator.serviceWorker) throw Error('service worker unavailable (needs https or localhost)');
  await wipe();
  await navigator.serviceWorker.register(at('./sw.js'), { scope: at('./').pathname, updateViaCache: 'none' });
  await navigator.serviceWorker.ready;
  await new BareMuxConnection(at('./baremux/worker.js').href).setTransport(at('./epoxy/index.mjs').href, [{ wisp: localStorage.wisp }]);
})();
const go = url => boot.then(() => {
  const ok = /^https?:\/\//i.test(url);
  frame.hidden = !ok;
  frame.contentWindow.location.replace(ok ? at('./service/').pathname + encodeURIComponent(url.replace(/^http:/i, 'https:')) : 'about:blank');
}, () => {});
document.head.append(Object.assign(document.createElement('meta'), { httpEquiv: 'Content-Security-Policy', content: 'frame-src ' + at('./service/') }));
boot.catch(e => document.querySelector('p').textContent = e.message);
onmessage = e => e.source === parent && e.origin === location.origin && go(e.data);
input.onkeydown = e => {
  const text = input.value.trim();
  if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229 || !text) return;
  go(/^https?:\/\/\S*$/i.test(text) ? text
    : /^(\[[\da-f:]+\]|[a-z\d-]+(\.[a-z\d-]+)+)(:\d+)?(\/\S*)?$/i.test(text) ? 'https://' + text
    : 'https://www.google.com/search?igu=1&pws=0&q=' + encodeURIComponent(text));
};
input.onblur = () => setTimeout(() => input.focus());
if (parent !== self) input.remove();