importScripts('ServiceWorker/workbox/workbox-sw.js');

const musicCache = 'ms-media';
workbox.setConfig({
	modulePathPrefix: '/ServiceWorker/workbox/',
	debug: false,
});
workbox.core.setCacheNameDetails({
	prefix: 'musicstream'
});

self.addEventListener('message', event => {
	if (event.data) {
		const { type } = event.data;

		if (type === 'SKIP_WAITING')
			skipWaiting();
	}
});

(function () {
	const doThing = async (event, ifOnlineAlwaysFetch = false) => {
		if (navigator.onLine && ifOnlineAlwaysFetch)
			return await fetch(event.request, { credentials: 'include' });

		const cache = await caches.open(musicCache);
		const match = await cache.match(event.request);

		if (match)
			return match;

		return await fetch(event.request, { credentials: 'include' });
	}

	self.addEventListener('fetch', event => {
		if (event.request.url.includes('/song/'))
			event.respondWith(doThing(event));
		else if (
			event.request.url.includes('/songInfo/') ||
			event.request.url.includes('/playlist/')
		)
			event.respondWith(doThing(event, true));
		else {
			const url = new URL(event.request.url);

			if (
				url.pathname === '/' &&
				!url.search.length > 0
			)
				event.respondWith(new Response(`
				<p>Redirecting...</p>
				<script>
					if (
						document.cookie.includes('used-mobile=true') &&
						!document.cookie.includes('use-desktop=true')
					)
						window.location = '/mobile/';
					else
						window.location = '/?no_redirect';
				</script>`, {
					headers: { 'Content-Type': 'text/html' }
				}));
		}
	});
}());

const updatesChannel = new BroadcastChannel('bgsync-update');
self.addEventListener('sync', event => {
	if (event.tag.startsWith('updatemostlistened'))
		event.waitUntil(new Promise((resolve, reject) => {
			const tags = event.tag.replace('updatemostlistened-', '').split('-');
			const songName = tags.slice(1).join('-');
			const id = tags[0];

			fetch('/updateMostListenedPlaylist', {
				credentials: 'include',
				body: songName,
				method: 'POST'
			}).then(resp => {
				return resp.json();
			}).then(json => {
				if (json.success !== true)
					reject();
				else {
					updatesChannel.postMessage({ success: true, id });
					resolve();
				}
			}).catch(err => {
				updatesChannel.postMessage({ success: false, id });
				reject(err);
			});
		}));
});

self.addEventListener('backgroundfetchsuccess', event => {
	const bgFetch = event.registration;

	event.waitUntil(async () => {
		const cache = await caches.open(musicCache);
		const records = await bgFetch.matchAll();

		const promises = records.map(async record => {
			await cache.put(record.request, await record.responseReady);
		});

		await Promise.all(promises);

		// TODO: urlCreator.revokeObjectURL()
		postMessage({ type: 'bgfetch', data: { id: bgFetch.id, stored: true } });
	})();
});

self.addEventListener('backgroundfetchfail', event => {
	// TODO: urlCreator.revokeObjectURL()
	console.log('Background fetch failed', event);
});

self.addEventListener('backgroundfetchclick', () => {
	clients.openWindow('/');
});

/* self.addEventListener('activate', (event) => {
	event.waitUntil(async () => {
		// Remove old caches
		for (const cacheName of await caches.keys()) {
			if (!cacheName.startsWith('podcast-') && cacheName !== staticCache && cacheName !== dynamicCache) {
				await caches.delete(cacheName);
			}
		}
	})();
}); */

/* self.addEventListener('install', (event) => {
	const urls = [];
	const cacheName = workbox.core.cacheNames.runtime;
	event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(urls)));
}); */

if (self.location.pathname === '/service-worker-mobile.js')
	workbox.precaching.precacheAndRoute([]);
else {
	workbox.precaching.precacheAndRoute([
		'/Assets/ic_play_arrow_white.svg',
		'/Assets/ic_pause_white.svg',
	]);
}

workbox.routing.registerRoute(
	new RegExp('/Assets/'),
	new workbox.strategies.StaleWhileRevalidate({
		cacheName: 'ms-image-cache',
		fetchOptions: {
			credentials: 'include'
		},
		plugins: [
			new workbox.expiration.Plugin({
				maxAgeSeconds: 7 * 24 * 60 * 60,
				purgeOnQuotaError: true,
				maxEntries: 20,
			})
		]
	})
);

workbox.routing.registerRoute(
	/\.(?:js|mjs)$/,
	new workbox.strategies.NetworkFirst({
		fetchOptions: {
			credentials: 'include',
		}
	})
);

workbox.routing.registerRoute(
	/\.css$/,
	new workbox.strategies.StaleWhileRevalidate({
		fetchOptions: {
			credentials: 'include',
		}
	})
);

workbox.routing.registerRoute(
	/\.(?:png|jpg|jpeg|svg|gif|ico)$/,
	new workbox.strategies.CacheFirst({
		cacheName: 'ms-image-cache',
		fetchOptions: {
			credentials: 'include',
		},
		plugins: [
			new workbox.expiration.Plugin({
				maxAgeSeconds: 7 * 24 * 60 * 60,
				purgeOnQuotaError: true,
				maxEntries: 20,
			})
		]
	})
);

workbox.routing.registerRoute(
	'/',
	new workbox.strategies.NetworkFirst({
		fetchOptions: {
			credentials: 'include',
		}
	})
);

workbox.routing.registerRoute(
	'/mobile/',
	new workbox.strategies.NetworkFirst({
		fetchOptions: {
			credentials: 'include',
		}
	})
);

workbox.routing.registerRoute(
	'/getSettings/',
	new workbox.strategies.NetworkFirst({
		fetchOptions: {
			credentials: 'include',
		}
	})
);

workbox.routing.registerRoute(
	/^https:\/\/fonts\.googleapis\.com/,
	new workbox.strategies.StaleWhileRevalidate()
);

// Cache the underlying font files with a cache-first strategy for 1 year.
workbox.routing.registerRoute(
	/^https:\/\/fonts\.gstatic\.com/,
	new workbox.strategies.CacheFirst({
		cacheName: 'google-fonts-webfonts',
		plugins: [
			new workbox.cacheableResponse.Plugin({
				statuses: [0, 200],
			}),
			new workbox.expiration.Plugin({
				maxAgeSeconds: 60 * 60 * 24 * 365,
				purgeOnQuotaError: true,
				maxEntries: 30,
			}),
		],
	})
);