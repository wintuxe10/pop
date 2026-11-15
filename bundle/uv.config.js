self.__uv$config = {
  prefix: new URL('./service/', location).pathname,
  encodeUrl: Ultraviolet.codec.plain.encode,
  decodeUrl: Ultraviolet.codec.plain.decode,
  handler: new URL('./uv.handler.js', location).href,
  client: new URL('./uv.client.js', location).href,
  bundle: new URL('./uv.bundle.js', location).href,
  config: new URL('./uv.config.js', location).href,
  sw: new URL('./uv.sw.js', location).href,
};
