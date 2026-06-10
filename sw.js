// Service Worker do Somos 1
// Estrategia: network-first para o app (sempre pega a versao nova quando online),
// limpa caches antigos, assume o controle imediatamente e mantem o PWA instalavel.
// Para forcar uma atualizacao no futuro, basta mudar o numero da versao abaixo.
const CACHE = 'somos1-v3';

self.addEventListener('install', function (event) {
  // Ativa a versao nova imediatamente, sem esperar a aba antiga fechar
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    // Apaga todos os caches que nao sejam o atual (destrava aparelhos na versao velha)
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    // Assume o controle das abas/aplicativos ja abertos
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isPage = req.mode === 'navigate' || accept.indexOf('text/html') !== -1;

  if (isPage) {
    // App (HTML): network-first -> online sempre traz a versao nova; offline usa o cache
    event.respondWith((async function () {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
        return net;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || caches.match('/') || caches.match('/index.html');
      }
    })());
    return;
  }

  // Demais arquivos GET: tenta a rede e guarda no cache como reserva offline
  event.respondWith((async function () {
    try {
      const net = await fetch(req);
      if (net && net.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      }
      return net;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});

// Permite que a pagina peca a ativacao imediata, se quiser
self.addEventListener('message', function (event) {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
