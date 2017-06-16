let video;

function load() {
	video = document.querySelector('video');

	fetch('/data/').then(response => {
		response.json().then(json => {
			json.video.videos.forEach((object, key) => {
				document.getElementById('videos').innerHTML += `<button onclick="playVid('${object}')" class="video ${key}">${object}</button><hr>`;
			});
		});
	}).catch( err => {
		console.error('An error occurred', err);
	});

	video.onplay = updateInterface;
	video.onpause = updateInterface;

	// Player btns
	document.getElementById('playPause').addEventListener('click', evt => {
		if (video.src != '' || video.src != null) {
			if (video.paused == true) video.play();
			else if (video.paused == false) video.pause();
			else console.error('WUT?');
		}
	});

	// document.getElementById('fullScreen').addEventListener('click', evt => {
	// 	const elem = document.getElementById('player');

	// 	if ('requestFullscreen' in elem) elem.requestFullscreen();
	// 	if ('mozRequestFullscreen' in elem) elem.mozRequestFullscreen();
	// 	if ('webkitRequestFullscreen' in elem) elem.webkitRequestFullscreen();
	// });
}

function playVid(title) {
	video.src = '/video/' + title;
	video.play();
}

function updateInterface() {
	if (video.paused == true) {
		document.getElementById('playPause').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	} else if (video.paused == false) {
		document.getElementById('playPause').querySelector('img').src = 'Assets/ic_pause_white.svg';
	} else {
		console.error('WUT?');
	}
}

window.onload = load;