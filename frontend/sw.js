// 强制注销所有旧版 SW 并清理全部旧缓存
self.registration.unregister().then(() => self.clients.matchAll().then(clients => clients.forEach(c => c.navigate(c.url))));

// 食术·中医体质养生 - Service Worker v5 (强制刷新)
const CACHE_NAME = 'wellness-v5-' + self.location.href.match(/sw\.js\?v=(\d+)/)?.[1] || '';
const ASSETS = [
  '/',
  '/app',
  '/styles.css',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;600;700&display=swap'
];

// 安装时缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 缓存核心资源');
      return cache.addAll(ASSETS).catch(err => {
        console.log('[SW] 缓存部分失败（正常，网络资源可能不可达）:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：优先从网络获取，失败时回退到缓存
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // API 请求不缓存（只缓存静态资源）
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 静态资源优先从缓存
  event.respondWith(cacheFirst(event.request));
});

// 缓存优先策略（静态资源）
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch(e) {
    return new Response('离线模式', { status: 503 });
  }
}

// 网络优先策略（API请求）
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch(e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: '离线' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
