function load() {
	fetch('/data/').then(response => {
		response.json().then(json => {
			json.video.videos.forEach((object, key) => {
				document.getElementById('videos').innerHTML += `<button class="video ${key}">${object}</button>`;
			});
		});
	}).catch( err => {
		console.error('An error occurred', err);
	});
}

window.onload = load;