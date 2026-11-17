# bundle — Ultraviolet service-worker proxy

A self-hosted [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) web proxy. Request rewriting happens in a **service worker** running in the page's own origin, with the user's permission (they are using the page). No Chrome extension `webRequest`/`declarativeNetRequest` permission is needed and no other extension has to intercept requests — the proxy strips `X-Frame-Options` / `CSP: frame-ancestors` server-side, so any site loads in an iframe. Verified end-to-end: `github.com` (which sends `X-Frame-Options: deny`) renders inside `pop.html`.

## Contents

Vendored runtime (pinned, byte-identical to the npm releases, versions must stay compatible — see note):

| file | package | version |
|---|---|---|
| `uv.bundle.js` `uv.client.js` `uv.handler.js` `uv.sw.js` | `@titaniumnetwork-dev/ultraviolet` | 3.2.10 |
| `baremux/index.mjs` `baremux/worker.js` | `@mercuryworkshop/bare-mux` | 2.1.6 |
| `epoxy/index.mjs` | `@mercuryworkshop/epoxy-transport` | 2.1.21 |

> **Version compatibility:** UV 3.2.10 bundles its own `BareClient` from bare-mux **2.1.6**, which sends request headers as a plain object. bare-mux here is pinned to **2.1.6** to match, and epoxy to the **2.1.x** line (2.1.21) because epoxy 3.x iterates headers with `for…of` and throws `headers is not iterable` against 2.1.6. Do **not** bump bare-mux to 2.1.9+ or epoxy to 3.x unless UV ships a matching `BareClient`.

Glue (editable):

- `index.html` + `register.js` — the **shell**: a page that owns the proxied iframe. On load it wipes proxied state, registers `sw.js`, waits until it is active, and wires the epoxy transport to the wisp backend. It then loads URLs it receives by `postMessage` from a same-origin parent (`pop.html`), or from its own input when opened directly.
- `sw.js` — the service worker: runs UV for the prefix and enforces the network policy below.
- `uv.config.js` — UV config (`plain` codec, paths derived from `location`, so the bundle works under any base path) plus page-side hardening that runs in every proxied document and worker before UV's own code.
- `../key.html` — enter the wisp URL (`wss://host/<secret>/`) once per device. It posts the secret to the server, which answers with an `HttpOnly`, `Partitioned` cookie; only `wss://host/` is kept in `localStorage`. Empty input clears it. Reload `pop.html` afterwards. It sits outside this directory so the service worker does not block that request.

## Requirements

1. **Secure context** — the page must be **https** (or `localhost`). A service worker will not register otherwise.
2. **A wisp backend** — epoxy connects over WebSocket to a wisp server that relays TCP. `../wisp/server.mjs` (outside this repo) sets its key cookie only for `POST /<secret>/`, accepts WebSockets only on `/` with that cookie and the `Origin` of this site (`ORIGIN` env, default `https://wintuxe10.github.io`), connects only to port 443 of hostnames that resolve to globally routable unicast addresses (no IP literals, private, loopback, NAT64 or other special ranges), and logs nothing.

## Chromebook with no Linux (Crostini) enabled

A Chromebook with the Linux container **off** runs only Chrome, so it cannot host anything. It does not need to — **the entire proxy runs inside Chrome**: the service worker, the epoxy WebAssembly transport, the `SharedWorker`, and WebSockets are all native browser features.

1. **Host the files remotely over https** — any static host works. The Chromebook just opens `https://your-host/.../pop.html`.
2. **Run the wisp backend on a remote always-on machine** and enter its `wss://…/<secret>/` URL in `key.html` on each device.
3. Open `pop.html`. It loads the shell in an iframe, which registers the SW and connects the transport — no extension, no Linux.

## Use

- **From pop.html:** `const PROXY = 'bundle/'` points at the shell. Sites are sent to it with `postMessage`; Hugging Face browsing and Google search load directly in a separate `credentialless` iframe. Set `PROXY = ''` to load everything directly (frameable sites only).
- **Standalone:** open `/bundle/`, type a URL or search.

## Security model

Enforced:

- **Nothing about browsing reaches the static host.** Proxied URLs only exist once the SW is active; the SW refuses every request outside this directory and re-issues its own static requests without a `Referer`.
- **The wisp key is out of reach of page JavaScript.** It lives only in the server's `HttpOnly` cookie, partitioned to this site; `localStorage.wisp` holds just the host.
- **No direct connections from proxied pages.** Cross-origin and plain `http://` requests fail in the SW; a CSP on every proxied response confines scripts, frames, forms and connections to the proxy prefix; `Link`, `Refresh`, reporting and speculation headers are dropped; the shell's CSP stops the proxied frame from navigating anywhere else.
- **No top-level proxied pages.** The SW refuses them, so other websites cannot load content into this origin and proxied URLs never enter browser history. Links that ask for a new tab open in the same frame.
- **Sites see what a normal browser shows them.** Cross-origin `Referer` and `document.referrer` are cut to the origin; `storage` events (which would carry the wisp key), `indexedDB.databases()`, `cookieStore`, `caches`, `Notification` and WebRTC are removed; camera, microphone, geolocation and other powerful features are denied.
- **Nothing persists.** Every shell load deletes proxied cookies, storage, databases, caches and files. Only `wisp` survives.

Not enforced:

- All proxied sites share this origin. A page that deliberately breaks out of UV's JavaScript rewriting (trivially, through `frames[i]` of a fresh iframe) can use the wisp server while the tab is open, read the current session's proxied cookies, and script `pop.html`, but cannot read the wisp key. Only serving the proxy from its own origin fixes that; keep nothing else that uses `localStorage` on this origin.
- WebRTC is removed per realm; `frames[i]` of a fresh iframe still has it. Chrome's `WebRtcIPHandling` policy is the complete fix.
- The tunnel provider sees destination hostnames (not content: epoxy does TLS in the browser). The static host sees that the files were fetched, and from which IP.
- No popups (OAuth popups fail), no `http://` sites and no IP-literal sites.

## Updating

Re-download pinned files from `https://cdn.jsdelivr.net/npm/<package>@<version>/dist/<file>`. Keep the bare-mux/epoxy versions in sync with the `BareClient` that UV bundles (see the compatibility note above) or the transport will break. GitHub Pages caches files for 10 minutes; hard-reload after a deploy.
