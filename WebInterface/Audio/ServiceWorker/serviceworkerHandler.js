import { Workbox } from '/ServiceWorker/workbox-window.prod.mjs';
import ToastManager from '/ServiceWorker/ToastElement.mjs';

const musicCache = 'ms-media';
const wb = new Workbox('service-worker.js', { scope: './' });
const generateFileLocation = (fileName, path = '/song/') => {
	return location.origin + path + fileName;
}
const downloadFile = (file, progressUpdateHandler, songInfoFetched) => {
	// BackgroundFetch has a lot of bugs (or I'm using it wrong), so it's not used
	/* const doDownloadBgFetch = async () => {
		const reg = await navigator.serviceWorker.ready;
		const bgFetch = await reg.backgroundFetch.fetch("song-" + file, [location.origin + '/song/' + file], {
			title: tags.title,
			icons: [{ src: imageUrl, type: 'image/jpeg' }],
			downloadTotal: 3296488 // size //|| tags.size
		});

		function doUpdate() {
			const update = {};

			if (bgFetch.downloaded >= bgFetch.downloadTotal)
				bgFetch.removeEventListener('progress', doUpdate);

			if (bgFetch.result === '') {
				update.state = 'fetching';
				update.progress = bgFetch.downloaded / bgFetch.downloadTotal;
			} else if (bgFetch.result === 'success') {
				update.state = 'fetching';
				update.progress = 1;
			} else if (bgFetch.failureReason === 'aborted') { // Failure
				update.state = 'not-stored';
			} else { // other failure
				update.state = 'failed';
			}

			progressUpdateHandler(update);
		};

		doUpdate();
		bgFetch.addEventListener('progress', doUpdate);
	} */

	const doDownload = async () => {
		const fileLocation = generateFileLocation(file);
		const cache = await caches.open(musicCache);

		if (await cache.match(fileLocation)) {
			progressUpdateHandler(1);
			return;
		}

		const response = await fetch(fileLocation, { credentials: 'include' });
		const size = parseInt(response.headers.get('Content-Length'), 10);
		const reader = response.body.getReader();
		let lastUpdated = 0;
		let downloaded = 0;
		const chunks = [];

		while (true) {
			const { done, value } = await reader.read();

			if (done)
				break;

			downloaded += value.length;
			chunks.push(value);

			const progress = downloaded / size;
			const now = Date.now();

			if (now - lastUpdated > 500 || progress === 1) {
				progressUpdateHandler(progress);
				lastUpdated = now;
			}
		}

		const newHeaders = new Headers(response.headers);
		const promiseArr = [];

		newHeaders.set('x-filename', file);
		promiseArr.push(cache.put(fileLocation, new Response(new Blob(chunks), {
			status: response.status,
			headers: newHeaders,
			statusText: file
		})));
		promiseArr.push(new Promise((resolve, reject) => {
			const infoFileLoc = generateFileLocation(file, '/songInfo/');

			fetch(infoFileLoc)
				.then(resp => {
					const respClone = resp.clone();

					resp.json().then(data => {
						if (data.success) {
							cache.put(infoFileLoc, respClone)
								.then(() => {
									songInfoFetched()
									resolve();
								})
								.catch(reject);
						}
					}).catch(reject);
				})
				.catch(reject);
		}));

		await Promise.all(promiseArr);
		return file;
	}

	// Attempt persistent storage
	return new Promise((resolve, reject) => {
		if (navigator.storage && navigator.storage.persist)
			navigator.storage.persist()
				.then(success => {
					doDownload().then(resolve).catch(reject);
				})
				.catch(reject);

		doDownload().then(resolve).catch(reject);
	});
}
const getDownloaded = async () => {
	const cache = await caches.open(musicCache);
	const keys = (await cache.keys());
	const mapFunc = val => {
		// val.headers.get('x-filename'); Doesn't work for some reason
		return decodeURIComponent(new URL(val.url).pathname.replace(/^\/\w+\//, ''));
	};

	return {
		songs: keys.filter(val => {
			return val.url.includes('/song/');
		}).map(mapFunc),

		playlists: keys.filter(val => {
			return val.url.includes('/playlist/');
		}).map(mapFunc)
	};

	/* const reg = await navigator.serviceWorker.ready;
	const ids = await reg.backgroundFetch.getIds();

	return ids.filter(id => id.startsWith('song-')); */
}
const savePlaylist = async (name, songs) => {
	const cache = await caches.open(musicCache);

	return await cache.put('/playlist/' + name, new Response(JSON.stringify({
		success: true,
		songs
	})), { headers: { 'Content-Type': 'application/json' } });
}
const clearCache = () => {
	return caches.delete(musicCache);
}
const removeDownload = async file => {
	const cache = await caches.open(musicCache);

	return Promise.all([
		cache.delete(generateFileLocation(file, '/songInfo/')),
		cache.delete(generateFileLocation(file)),
	]);
}
const updateMostlistened = async file => {
	if (!('SyncManager' in window))
		throw Error('SyncManager is not in window');

	return await (await navigator.serviceWorker.ready).sync.register('updatemostlistened-' + file);
}
const checkConnectionSpeed = () => {
	if (!('connection' in navigator))
		return;
	else {
		switch (navigator.connection.effectiveType) {
			case 'slow-2g':
				return 'slow';
			case '2g':
				return 'slow';
			case '3g':
				return 'fast';
			case '4g':
				return 'fast';
		}
	}
};
const checkBgFetchAvailability = () => {
	return 'BackgroundFetchManager' in self;
}

wb.addEventListener('waiting', () => {
	const toast = ToastManager.makeText(
		'Service worker updated',
		'The service worker updated. Would you like to reload the page to let it take effect?'
	).getToast();

	toast.addButton('Reload')
		.addEventListener('click', () => {
			let eventFired = false;
			wb.addEventListener('controlling', () => {
				window.location.reload();
				eventFired = true;
			});

			setTimeout(() => {
				if (!eventFired)
					window.location.reload();
			}, 2000);

			wb.messageSW({ type: 'SKIP_WAITING' });
			toast.dismiss();
		}, { passive: true });
	toast.addButton('Cancel')
		.addEventListener('click', () => {
			toast.dismiss();
		}, { passive: true });
});

window.sw = new Promise((resolve, reject) => {
	wb.register().then(() => {
		resolve({
			displayToast: ToastManager.makeText.bind(ToastManager),
			checkBgFetchAvailability,
			checkConnectionSpeed,
			updateMostlistened,
			removeDownload,
			getDownloaded,
			downloadFile,
			savePlaylist,
			clearCache
		});
	}).catch(err => {
		const toast = ToastManager.makeText(
			'Service worker not registered',
			err.name
		).getToast();

		toast.addButton('Ok')
			.addEventListener('click', evt => {
				toast.dismiss();
			}, { passive: true });

		reject(err);
	});
});