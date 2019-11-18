import { Workbox } from '/ServiceWorker/workbox/workbox-window.prod.mjs';
import DownloadHandler from '/ServiceWorker/downloadHandler.mjs';
import ToastManager from '/ServiceWorker/ToastElement.mjs';

const wb = new Workbox('service-worker.js', { scope: './' });
const downloadHandler = new DownloadHandler();

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
			removeDownload: downloadHandler.removeDownload.bind(downloadHandler),
			getDownloaded: downloadHandler.getDownloaded.bind(downloadHandler),
			savePlaylist: downloadHandler.savePlaylist.bind(downloadHandler),
			downloadFile: downloadHandler.downloadFile.bind(downloadHandler),
			clearCache: downloadHandler.clearCache.bind(downloadHandler),
			displayToast: ToastManager.makeText.bind(ToastManager),
			checkBgFetchAvailability,
			checkConnectionSpeed,
			updateMostlistened,
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