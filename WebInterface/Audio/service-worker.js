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
	});
}());

self.addEventListener('sync', event => {
	if (event.tag.startsWith('updatemostlistened'))
		event.waitUntil(fetch('/updateMostListenedPlaylist', {
			body: event.tag.replace('updatemostlistened-', ''),
			credentials: 'include',
			method: 'POST',
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
	// TODO
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