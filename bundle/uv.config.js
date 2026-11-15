{
  const strip = scope => {
    for (let target = scope; target; target = Object.getPrototypeOf(target)) for (const name of ['RTCPeerConnection', 'webkitRTCPeerConnection', 'Notification', 'cookieStore', 'caches']) delete target[name];
    delete scope.IDBFactory.prototype.databases;
  };
  strip(self);
  const base = location.origin + location.pathname.replace(/(service\/[^/]*|[^/]*)$/, '');
  self.__uv$config = {
    prefix: new URL('service/', base).pathname,
    encodeUrl: Ultraviolet.codec.plain.encode,
    decodeUrl: Ultraviolet.codec.plain.decode,
    handler: base + 'uv.handler.js',
    client: base + 'uv.client.js',
    bundle: base + 'uv.bundle.js',
    config: base + 'uv.config.js',
    sw: base + 'uv.sw.js',
  };
  if (self.window) {
    const frame = HTMLIFrameElement.prototype, child = Object.getOwnPropertyDescriptor(frame, 'contentWindow').get;
    for (const name of ['contentWindow', 'contentDocument']) {
      const { get } = Object.getOwnPropertyDescriptor(frame, name);
      Object.defineProperty(frame, name, { get() {
        try { strip(child.call(this)); } catch {}
        return get.call(this);
      } });
    }
    addEventListener('storage', e => e.stopImmediatePropagation(), true);
    addEventListener('click', e => {
      const link = e.target.closest?.('a, area');
      if (link) link.target = '_self';
    }, true);
    const root = base + 'service/', origin = url => new URL(decodeURIComponent(url.slice(root.length))).origin;
    const { get } = Object.getOwnPropertyDescriptor(Document.prototype, 'referrer');
    Object.defineProperty(Document.prototype, 'referrer', { get() {
      const url = get.call(this);
      try { return origin(url) === origin(location.href) ? url : root + encodeURIComponent(origin(url) + '/'); } catch { return ''; }
    } });
  }
}