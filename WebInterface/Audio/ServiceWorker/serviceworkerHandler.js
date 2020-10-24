import { Workbox } from '/ServiceWorker/workbox/workbox-window.prod.mjs';
import ToastManager from '/ServiceWorker/ToastElement.mjs';

const wb = new Workbox('service-worker.js', { scope: './' });
const musicCache = 'ms-media';

const generateFileLocation = (fileName, path = '/song/') => {
	return location.origin + path + fileName;
}
const downloadFile = (file, progressUpdateHandler) => {
	const doDownloadBgFetch = async fileLocation => {
		const reg = await navigator.serviceWorker.ready;
		const size = await (async () => {
			const controller = new AbortController();
			const signal = controller.signal;
			const resp = await fetch(fileLocation, { credentials: 'include', signal });
			controller.abort();
			return resp.headers.get('Content-Length');
		})();

		const bgFetch = await reg.backgroundFetch.fetch("song-" + file, [fileLocation, generateFileLocation(file, '/songInfo/')], {
			icons: [{ src: generateFileLocation(file, '/image/'), type: 'image/jpeg' }],
			downloadTotal: size,
			title: file,
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
		await (() => {
			return new Promise(resolve => {
				navigator.serviceWorker.addEventListener('message', function handler({ data }) {
					if (data && 'type' in data && data.type === "bgfetch") {
						navigator.serviceWorker.removeEventListener('message', handler);
						resolve(data.data);
					}
				});
			});
		})();
		return file;
	}

	const doDownload = async (fileLocation, cache) => {
		const downloadWithProgress = async (url, progressCb, responseArgs = {}) => {
			const response = await fetch(url, { credentials: 'include' });
			const size = parseInt(response.headers.get('Content-Length'), 10);
			const headers = new Headers(response.headers);

			const body = await response.body;
			const reader = body.getReader();
			let downloaded = 0;

			const stream = await new ReadableStream({
				start(controller) {
					return pump();

					function pump() {
						return reader.read().then(({ done, value }) => {
							if (done) {
								controller.close();
								return;
							}

							downloaded += value.length;
							controller.enqueue(value);

							progressCb(downloaded / size);
							return pump();
						});
					}
				}
			});


			if (responseArgs.headers) {
				Object.keys(responseArgs.headers).forEach(key => {
					headers.set(key, responseArgs.headers[key]);
				});
			}

			responseArgs.headers = headers;
			return await new Response(stream, responseArgs);
		}
		const downloadTags = async () => {
			const infoFileLoc = generateFileLocation(file, '/songInfo/');
			const response = await fetch(infoFileLoc, { credentials: 'include' });
			const responseCopy = response.clone();
			const data = await response.json();

			if (data.success)
				await cache.put(infoFileLoc, responseCopy);

			return data.success;
		}
		const downloadFile = async () => {
			await cache.put(
				fileLocation,
				await downloadWithProgress(
					fileLocation,
					progressUpdateHandler,
					{
						status: 200, // Firefox sets this to 206 and then complains
						statusText: file,
						headers: {
							'x-filename': file
						},
					}
				)
			);
		}

		await Promise.all([
			downloadFile(),
			downloadTags(),
		]);

		return file;
	}

	return (async () => {
		const fileLocation = generateFileLocation(file);
		const cache = await caches.open(musicCache);

		// const downloadFunc = ('BackgroundFetchManager' in self) ? doDownloadBgFetch : doDownload;
		const downloadFunc = doDownload; // BackgroundFetch seems to be broken?
		const resolveHandler = async () => {
			try {
				const ref = await navigator.serviceWorker.ready;

				if ('index' in registration) {
					await ref.index.add({
						description: 'MusicStream downloaded song',
						category: 'audio',
						launchUrl: '/',
						title: file,
						url: '/',
						id: file,
						icons: [{
							src: '/image/' + file,
							type: 'image/png',
						}],
					});
				}
			} catch (err) { }
		}


		if (await cache.match(fileLocation)) {
			progressUpdateHandler({ progress: 1 });
			return file;
		}

		try {
			// Attempt persistent storage
			if (navigator.storage && navigator.storage.persist)
				await navigator.storage.persist();
		} catch (err) { }

		await resolveHandler(await downloadFunc(fileLocation, cache));
		return file;
	})();
}
const getDownloaded = async () => {
	const cache = await caches.open(musicCache);
	const keys = await cache.keys();
	const getFilename = async req => {
		const resp = await cache.match(req);

		if (resp.headers.has('x-filename'))
			return resp.headers.get('x-filename');
		else
			return decodeURIComponent(new URL(req.url).pathname.replace(/^\/\w+\//, ''));
	}

	const returnObj = { playlists: [], songs: [] };
	await Promise.all(keys.map(async key => {
		if (key.url.includes('/song/')) {
			const fileName = await getFilename(key);
			returnObj.songs.push(fileName);
			return fileName;
		} else if (key.url.includes('/playlist/')) {
			const fileName = await getFilename(key);
			returnObj.playlists.push(fileName);
			return fileName;
		}
	}));
	return returnObj;

	// This gets active fetches...
	const reg = await navigator.serviceWorker.ready;
	const ids = await reg.backgroundFetch.getIds();

	return {
		songs: ids.filter(id => id.startsWith('song-')),
		playlists: []
	}
}
const savePlaylist = async (name, songs) => {
	const cache = await caches.open(musicCache);

	return await cache.put('/playlist/' + name, new Response(JSON.stringify({
		success: true,
		songs
	}), { headers: { 'Content-Type': 'application/json', 'x-filename': name } }));
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
const updateMostlistened = async (file, tag = 'TagNotSpecified') => {
	if (!('SyncManager' in window))
		throw Error('SyncManager is not in window');

	return await (await navigator.serviceWorker.ready).sync.register(`updatemostlistened-${tag}-${file}`);
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
			savePlaylist,
			downloadFile,
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