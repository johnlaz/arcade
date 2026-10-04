/* Mega Arcade Kids service worker
   - Pre-caches the arcade, every game and the icons so it works offline.
   - HTML/JS use "stale-while-revalidate": you see the cached copy instantly and the
     newest version is fetched in the background, so updates arrive on the next open.
   - To force everyone onto a fresh cache after a big change, bump VERSION. */
const VERSION = 'arcade-v2';
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/clawmaster-180.png'
];
const GAMES = [
  "bakeyboss.html",
  "balloon.html",
  "barrelbash.html",
  "beattap.html",
  "candymatch.html",
  "castlebuilder.html",
  "chickfling.html",
  "clawmaster.html",
  "colorsort.html",
  "connectstars.html",
  "dinojump.html",
  "echoecho.html",
  "fishtank.html",
  "flappy.html",
  "frogger.html",
  "fruitcatch.html",
  "icecream.html",
  "kart-race.html",
  "maze.html",
  "memory.html",
  "pacman.html",
  "paintbynumber.html",
  "pianostars.html",
  "pong.html",
  "popitfrenzy.html",
  "sharkdodge.html",
  "slingbirds.html",
  "snake.html",
  "spaceexplorer.html",
  "spaceshooter.html",
  "starsmasher.html",
  "tetris.html",
  "unicornrun.html",
  "whackamole.html",
  "wordbuilder.html"
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);                                   // must succeed
    // games are cached one by one so a single missing file can't break the install
    await Promise.allSettled(GAMES.map(g => cache.add(new Request(g, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // page navigations: cached page first, fall back to the arcade home when offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || (await cache.match('index.html')) || Response.error();
    })());
    return;
  }

  // same-origin files and Google Fonts
  if (url.origin === self.location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
