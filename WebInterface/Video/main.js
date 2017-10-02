let video, int;

function load() {
	video = document.querySelector('video');
	const timeEndElem = document.getElementById('time-end');
	const seekBarElem = document.getElementById('seekBar');
	const timeStartElem = document.getElementById('time-start');

	fetch('/data/').then(response => {
		response.json().then(json => {
			const videosElem = document.getElementById('videos');

			videosElem.innerHTML = '';
			json.video.videos.forEach((object, key) => {
				videosElem.innerHTML += `<button onclick="playVid('${object}')" draggable="true" ondragstart="drag(event)" class="video ${key}" id="${key}">${object}</button><hr>`;
			});
		});
	}).catch( err => {
		console.error('An error occurred', err);
	});

	video.onended = videoEnd;
	video.onplay = updateInterface;
	video.onpause = updateInterface;
	video.onclick = togglePlayState;

	video.addEventListener("playing", evt => {
		document.getElementById('loader').style.opacity = '1';

		if (video.readyState == 4)
			document.getElementById('loader').style.opacity = '0';
	});

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
	if (video.src != '') {
		const stateBtn = document.getElementById('playPause');

		if (video.paused == true) {
			video.play();
			stateBtn.childNodes[0].src = 'Assets/ic_pause_white.svg';
		} else if (video.paused == false) {
			video.pause();
			stateBtn.childNodes[0].src = 'Assets/ic_play_arrow_white.svg';
		} else console.error('WUT?');
	}
}

function playVid(title, notQueueTop) {
	video.src = '/video/' + title;
	video.play();

	if (!notQueueTop)
		queueTop(title);

	clearInterval(int);
	document.getElementById('songName').innerText = title;
	document.getElementById('autoplay').style.display = 'none';
	document.getElementById('playPause').childNodes[0].src = 'Assets/ic_pause_white.svg'
}

function videoEnd(evt) {
	if (getQueue().length > queueIndex) {
		let i = 1;
		const time = 2;
		const timeElem = document.getElementById('autoplay-time');
		const textElem = document.getElementById('autoplay').querySelector('span');

		document.getElementById('autoplay').style.display = 'flex';

		int = setInterval(() => {
			if (i <= time) {
				textElem.innerText = `Autoplay in: ${time - i}s`;
				timeElem.style.transform = `scaleX(${1 - (i / time)})`;
			} else {
				nextQueueItem();
				clearInterval(int);
				document.getElementById('autoplay').style.display = 'none';
				timeElem.style.transform = '';
			}

			i++;
		}, 1000);
	}
}

function updateInterface() {
	if (video.paused == true)
		document.getElementById('playPause').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	else if (video.paused == false)
		document.getElementById('playPause').querySelector('img').src = 'Assets/ic_pause_white.svg';
	else
		console.error('WUT?');
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