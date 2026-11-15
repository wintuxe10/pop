{
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
}