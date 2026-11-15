# bundle — Ultraviolet service-worker proxy

A self-hosted [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) web proxy. Request rewriting happens in a **service worker** running in the page's own origin, with the user's permission (they are using the page). No Chrome extension `webRequest`/`declarativeNetRequest` permission is needed and no other extension has to intercept requests — the proxy strips `X-Frame-Options` / `CSP: frame-ancestors` server-side, so any site loads in an iframe. Verified end-to-end: `github.com` (which sends `X-Frame-Options: deny`) renders inside `pop.html`'s iframe, same-origin.

## Contents

Vendored runtime (pinned, versions must stay compatible — see note):

| file | package | version |
|---|---|---|
| `uv.bundle.js` `uv.client.js` `uv.handler.js` `uv.sw.js` | `@titaniumnetwork-dev/ultraviolet` | 3.2.10 |
| `baremux/index.mjs` `baremux/worker.js` | `@mercuryworkshop/bare-mux` | 2.1.6 |
| `epoxy/index.mjs` | `@mercuryworkshop/epoxy-transport` | 2.1.21 |

> **Version compatibility:** UV 3.2.10 bundles its own `BareClient` from bare-mux **2.1.6**, which sends request headers as a plain object. bare-mux here is pinned to **2.1.6** to match, and epoxy to the **2.1.x** line (2.1.21) because epoxy 3.x iterates headers with `for…of` and throws `headers is not iterable` against 2.1.6. Do **not** bump bare-mux to 2.1.9+ or epoxy to 3.x unless UV ships a matching `BareClient`.

Glue (editable):

- `uv.config.js` — UV config. Paths are computed from the service worker's own location (`new URL('./…', location)`), so the bundle works under any base path. `plain` codec (`encodeUrl === encodeURIComponent`).
- `sw.js` — the service worker: imports UV and answers `fetch` for the prefix.
- `register.js` — registers `sw.js` and wires the epoxy transport to the wisp backend, all relative to `import.meta.url`. Reads the backend URL `WISP` from `localStorage.wisp` (set per device with `key.html`, never committed) and exports `encode(url)`.
- `key.html` — enter the wisp URL (`wss://host/<secret>/`) once per device; empty input clears it.
- `boot.html` — headless page that just runs `register.js`'s `boot()`. `pop.html` embeds it in a hidden iframe so every device auto-registers the SW on first open.
- `index.html` — standalone proxy page (search box + iframe).

## Portability (works from any host / base path)

All paths are relative or derived from `location` / `import.meta.url`, so you can host the folder at a domain root **or** a sub-path (`https://host/app/…`) and it still works — verified by serving the demo under `/app/`. The only origin-absolute value is the wisp endpoint, stored per device in `localStorage.wisp`.

## Requirements

1. **Secure context** — the page must be **https** (or `localhost`). A service worker will not register otherwise.
2. **A wisp backend** — epoxy connects over WebSocket to a wisp server that relays TCP. Run one and enter its URL in `key.html`:

   ```sh
   npx @mercuryworkshop/wisp-js   # maintained; wisp-server-node is deprecated
   ```

   For a private server, `../wisp/server.mjs` (outside this repo) only accepts the path `/<secret>/` and only ports 80/443.

## Chromebook with no Linux (Crostini) enabled

This is the important case: a Chromebook with the Linux container **off** runs only Chrome, so it cannot host anything. It does not need to — **the entire proxy runs inside Chrome**: the service worker, the epoxy WebAssembly transport, the `SharedWorker`, and WebSockets are all native browser features and need no Linux. Linux is only ever needed to *run a server*.

So for a no-Linux Chromebook:

1. **Host the files remotely over https** — any static host works (GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket, a VPS). The Chromebook just opens `https://your-host/.../pop.html`.
2. **Run the wisp backend on a remote always-on machine** (a VPS, a home server, a free wisp host — **not** the Chromebook). Over https the page auto-selects `wss://`.
   - Enter its `wss://…/<secret>/` URL in `key.html` on each device.
3. Open `pop.html` (or `bundle/index.html`) in the Chromebook's Chrome. The hidden `boot.html` iframe registers the SW and connects the transport automatically — no per-device setup, no extension, no Linux.

`pop.html` itself is a static file and works the same way on any device; with `PROXY = 'bundle/service/'` it routes arbitrary sites through this bundle automatically, and Hugging Face browsing / Google search keep working directly.

## Use

- **Standalone:** open `/bundle/` (index.html), type a URL or search.
- **From pop.html:** it embeds `boot.html` hidden, so opening `pop.html` registers the SW for the origin and sets the transport. `pop.html` has `const PROXY = 'bundle/service/'`; it builds `PROXY + encodeURIComponent(url)`, which is exactly a `plain`-codec UV URL. Set `PROXY = ''` to load sites directly (frameable sites only), or point it at any other header-stripping proxy.

## Updating

Re-download pinned files from `https://cdn.jsdelivr.net/npm/<package>@<version>/dist/<file>`. Keep the bare-mux/epoxy versions in sync with the `BareClient` that UV bundles (see the compatibility note above) or the transport will break.
