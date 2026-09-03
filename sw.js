/* 서비스 워커 — 오프라인에서도 화면이 뜨게 하고, 시트 데이터는 항상 새로 가져온다.
   버전을 올리면 이전 캐시가 정리된다. */
const VER   = 'feelm-dash-v2';
const SHELL = ['./', './index.html', './widget.html',
               './manifest.webmanifest', './widget.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // 구글 시트 데이터는 캐시하지 않는다 — 늘 최신이어야 한다
  if (url.hostname.indexOf('docs.google.com') >= 0) return;

  // 화면 자체는 네트워크 우선, 실패하면 캐시 (오프라인 대비)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const c = r.clone(); caches.open(VER).then(x => x.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 폰트 등 정적 자원은 캐시 우선
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res && res.status === 200 && (url.origin === location.origin || url.hostname.indexOf('jsdelivr') >= 0)) {
        const c = res.clone(); caches.open(VER).then(x => x.put(e.request, c));
      }
      return res;
    }).catch(() => r))
  );
});
