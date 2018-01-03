let video, int;

function load() {
	video = document.querySelector('video');
	const timeEndElem = document.getElementById('time-end');
	const seekBarElem = document.getElementById('seekBar');
	const timeStartElem = document.getElementById('time-start');

	fetch('/data/', {credentials: 'same-origin'}).then(response => {
		response.json().then(json => {
			const keys = Object.keys(json.video.videos);
			const videosElem = document.getElementById('videos');
			const addVideosToDiv = (arr, div) => {
				arr.forEach((object, key) => {
					div.innerHTML += `<button onclick="vidClick(event, '${object}')" draggable="true" ondragstart="drag(event)" class="video ${key}" id="${key}">${object}</button><hr>`;
				});
			}

			videosElem.innerHTML = '';
			if (keys.length > 1) {
				keys.forEach((object, key) => {
					const containerDiv = document.createElement('div');
					const titleButton = document.createElement('button');
					const videoDiv = document.createElement('div');

					titleButton.innerHTML = `<span>${object}</span><img src="/Assets/ic_keyboard_arrow_up_white.svg">`;
					titleButton.onclick = evt => {
						if (containerDiv.className.indexOf('closed') > -1)
							containerDiv.className = containerDiv.className.replace('closed', '');
						else
							containerDiv.className += 'closed';
					}

					addVideosToDiv(json.video.videos[object], videoDiv);
					containerDiv.appendChild(titleButton);
					containerDiv.appendChild(videoDiv);
					videosElem.appendChild(containerDiv);
				});
			} else addVideosToDiv(json.video.videos[keys[0]], videosElem);
		});
	}).catch(err => {
		console.error('An error occurred', err);
	});

	video.onended = videoEnd;
	video.onplay = updateInterface;
	video.onpause = updateInterface;
	video.onclick = togglePlayState;
	video.ondblclick = toggleFullScreen;

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

	const videoSettingsElem = document.getElementById('video-settings');
	videoSettingsElem.getElementsByTagName('button')[0].addEventListener('click', evt => {
		evt.currentTarget.parentElement.style.display = 'none';
	});

	document.getElementById('settings-toggle').addEventListener('click', evt => {
		if (videoSettingsElem.style.display == 'block')
			videoSettingsElem.style.display = 'none';
		else
			videoSettingsElem.style.display = 'block';
	});

	document.getElementById('vidSpeed').addEventListener('change', evt => {
		video.playbackRate = evt.currentTarget.value;
	});

	document.getElementById('captions').addEventListener('change', evt => {
		addSubtitleTrack(evt.target.files[0]);
	});

	document.getElementById('playPause').addEventListener('click', togglePlayState);
	document.getElementById('fullScreen').addEventListener('click', toggleFullScreen);

	document.addEventListener('fullscreenchange', checkFullScreen, false);
	document.addEventListener('msfullscreenchange', checkFullScreen, false);
	document.addEventListener('mozfullscreenchange', checkFullScreen, false);
	document.addEventListener('webkitfullscreenchange', checkFullScreen, false);

	// For plugins
	try {
		loaded();
	} catch (err) {}
}

function vidClick(evt, title) {
	if (evt.ctrlKey)
		enqueue(title);
	else
		playVid(title);
}

function checkFullScreen(evt) {
	if (isFullScreen())
		document.getElementById('fullScreen').querySelector('img').src = 'Assets/ic_fullscreen_exit_white.svg';
	else
		document.getElementById('fullScreen').querySelector('img').src = 'Assets/ic_fullscreen_white.svg';
}

function toggleFullScreen() {
	const elem = document.getElementById('player');
	const typePrefix = getFullScreenType(elem);

	if (isFullScreen()) {
		if (typePrefix.length < 1) document['exitFullscreen']();
		else document[typePrefix + 'ExitFullscreen']();
	} else {
		if (typePrefix.length < 1) elem['requestFullscreen']();
		else elem[typePrefix + 'RequestFullscreen']();
	}

	function getFullScreenType(elem) {
		if ('requestFullscreen' in elem) return '';
		if ('msRequestFullscreen' in elem) return 'ms';
		if ('mozRequestFullscreen' in elem) return 'moz';
		if ('webkitRequestFullscreen' in elem) return 'webkit';
	}
}

function isFullScreen() {
	return !((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
		(document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
		(document.mozFullScreen !== undefined && !document.mozFullScreen) ||
		(document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
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

	console.log(title);

	if (!notQueueTop)
		queueTop(title);

	document.title = 'Video Stream - ' + title.replace('-', '');

	clearInterval(int);
	document.getElementById('songName').innerText = title;
	document.getElementById('autoplay').style.display = 'none';
	document.getElementById('playPause').childNodes[0].src = 'Assets/ic_pause_white.svg'
}

function videoEnd(evt) {
	if (getQueue().length > queueIndex) {
		let i = 1;
		const time = Number(settings.autoplayTime) || 10;
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

function addSubtitleTrack(file) {
	const url = window.URL.createObjectURL(file);
	const trackElem = document.createElement('track');

	trackElem.src = url;
	trackElem.srclang = 'en';
	trackElem.kind = 'captions';
	trackElem.setAttribute('default', '');

	document.getElementsByTagName('video')[0].appendChild(trackElem);
}

window.onload = load;