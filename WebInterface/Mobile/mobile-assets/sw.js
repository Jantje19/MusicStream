if ('serviceWorker' in navigator) {
	new Promise(async (resolve, _) => {
		const { Workbox } = await import('/ServiceWorker/workbox/workbox-window.prod.mjs');

		if (window.location.port === '4200')
			resolve(new Workbox('/service-worker-mobile.js', { scope: '/' }));
		else
			resolve(new Workbox('/service-worker-mobile.js', { scope: '/mobile/' }));
	}).then(wb => {
		wb.register().catch(console.error);
		// TODO: Add this
		/* wb.addEventListener('waiting', () => {

		});*/
	}).catch(console.error);
}