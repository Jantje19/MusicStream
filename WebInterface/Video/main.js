let video;

function load() {
	video = document.querySelector('video');
	const timeEndElem = document.getElementById('time-end');
	const seekBarElem = document.getElementById('seekBar');
	const timeStartElem = document.getElementById('time-start');

	fetch('/data/').then(response => {
		response.json().then(json => {
			json.video.videos.forEach((object, key) => {
				document.getElementById('videos').innerHTML +=
				`<button onclick="playVid('${object}')" class="video ${key}">${object}</button><hr>`;
			});
		});
	}).catch( err => {
		console.error('An error occurred', err);
	});

	video.onplay = updateInterface;
	video.onpause = updateInterface;
	video.onclick = togglePlayState;

	video.addEventListener('timeupdate', evt => {
		seekBarElem.value = (video.currentTime / video.duration) * 100;

		if (video.duration) {
			timeEndElem.innerText = convertToReadableTime(Math.floor(video.duration));
			timeStartElem.innerText = convertToReadableTime(Math.floor(video.currentTime));
			// timeEndElem.innerText = convertToReadableTime(Math.floor(video.duration - video.currentTime));
		} else {
			timeEndElem.innerText = '0s';
			timeStartElem.innerText = convertToReadableTime(Math.floor(video.currentTime));
		}
	});

	seekBarElem.addEventListener('input', evt => {
		if (video.src != '' && video.src != undefined)
			video.currentTime = video.duration / (evt.target.max / evt.target.value)
	});

	// Player btns
	document.getElementById('playPause').addEventListener('click', togglePlayState);

	document.getElementById('fullScreen').addEventListener('click', evt => {
		const elem = document.getElementById('player');
		const typePrefix = getFullScreenType(elem);

		if (isFullScreen()) {
			if (typePrefix.length < 1) document['exitFullscreen']();
			else document[typePrefix + 'ExitFullscreen']();
			evt.target.querySelector('img').src = 'Assets/ic_fullscreen_white.svg';
		} else {
			if (typePrefix.length < 1) elem['requestFullscreen']();
			else elem[typePrefix + 'RequestFullscreen']();
			evt.target.querySelector('img').src = 'Assets/ic_fullscreen_exit_white.svg';
		}

		function isFullScreen() {
			return !((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
				(document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
				(document.mozFullScreen !== undefined && !document.mozFullScreen) ||
				(document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
		}

		function getFullScreenType(elem) {
			if ('requestFullscreen' in elem) return '';
			if ('msRequestFullscreen' in elem) return 'ms';
			if ('mozRequestFullscreen' in elem) return 'moz';
			if ('webkitRequestFullscreen' in elem) return 'webkit';
		}
	});
}

function togglePlayState() {
	if (video.src != '' || video.src != null) {
		if (video.paused == true) video.play();
		else if (video.paused == false) video.pause();
		else console.error('WUT?');
	}
}

function playVid(title) {
	video.src = '/video/' + title;
	video.play();

	video.addEventListener("playing", function() {
		document.getElementById('loader').style.opacity = '1';

		if (video.readyState == 4) {
			document.getElementById('loader').style.opacity = '0';

			document.getElementById('title').innerText = title;
			document.getElementById('length').innerText = 'Duration: ' +  convertToReadableTime(Math.round(video.duration)) + 's';
		}
	});
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

function convertToReadableTime(int) {
	let outp = '';
	let hours   = Math.floor(int / 3600);
	let minutes = Math.floor((int - (hours * 3600)) / 60);
	let seconds = int - (hours * 3600) - (minutes * 60);

	if (hours < 10) hours = "0"+hours;
	if (minutes < 10) minutes = "0"+minutes;
	if (seconds < 10) seconds = "0"+seconds;
	if (hours > 0) outp += hours + ':';

	outp += minutes + ':';
	outp += seconds;

	return outp;
}

window.onload = load;