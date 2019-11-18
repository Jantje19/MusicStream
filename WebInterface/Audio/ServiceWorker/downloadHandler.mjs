const generateFileLocation = (fileName, path = '/song/') => {
	return location.origin + path + fileName;
}

export default class {
	#musicCache;

	constructor(cacheName = 'ms-media') {
		this.#musicCache = cacheName;
	}

	downloadFile(file, progressUpdateHandler, songInfoFetched) {
		const doDownload = async () => {
			const cache = await caches.open(this.#musicCache);
			const fileLocation = generateFileLocation(file);

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
					.then(() => {
						doDownload().then(resolve).catch(reject);
					})
					.catch(reject);

			doDownload().then(resolve).catch(reject);
		});
	}

	clearCache() {
		return caches.delete(this.#musicCache);
	}

	async getDownloaded() {
		const cache = await caches.open(this.#musicCache);
		const keys = (await cache.keys());
		const mapFunc = val => {
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
	}

	async savePlaylist(name, songs) {
		const cache = await caches.open(this.#musicCache);

		return await cache.put('/playlist/' + name, new Response(JSON.stringify({
			success: true,
			songs
		})), { headers: { 'Content-Type': 'application/json' } });
	}

	async removeDownload(file) {
		const cache = await caches.open(this.#musicCache);

		return Promise.all([
			cache.delete(generateFileLocation(file, '/songInfo/')),
			cache.delete(generateFileLocation(file)),
		]);
	}
}