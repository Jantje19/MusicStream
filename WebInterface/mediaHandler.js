const queue = [];
let queueIndex = 0;

function enqueue(...vals) {
	if (vals.length > 1) {
		if (document.getElementById('shuffle').getAttribute('activated') != null) vals.shuffle();
		vals.forEach((object, key) => {
			queue[queue.length] = object;
		});
	} else queue[queue.length] = vals[0];

	updateInterface();
}

function next() {
	const newIndex = queueIndex + 1;

	if (queue.length > newIndex) {
		queueIndex = newIndex;
	} else {
		if (document.getElementById('repeat').getAttribute('activated') != null) queueIndex = 0;
		else return;
	}

	updateInterface();
	playSong(queue[queueIndex], true);
}

function previus() {
	const newIndex = queueIndex - 1;

	if (queueIndex > 0) {
		queueIndex = newIndex;
	} else {
		if (document.getElementById('repeat').getAttribute('activated') != null) queueIndex = queue.length - 1;
		else return;
	}

	updateInterface();
	playSong(queue[queueIndex], true);
}

function deleteQueue() {
	stopSong();
	queue.length = 0;
	updateInterface();
}

function playSong(songName, notAddToQueue) {
	if (notAddToQueue) {
		if (!songName) songName = queue[queueIndex];
		audio.src = '/song/' + songName;
		startSong();
	} else if (audio.currentTime > 0) {
		if (audio.src != '' && audio.src != undefined) {
			if (audio.paused == true) {
				audio.play();
				document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
			} else if (audio.paused == false) {
				audio.pause();
				document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_pause_white.svg';
			} else {
				console.error('WUT?');
			}
		}
	} else {
		if (!songName) songName = queue[queueIndex];
		audio.src = '/song/' + songName;
		if (!notAddToQueue) {
			enqueue(songName);
			queueIndex++;
			updateInterface();
		}

		startSong();
	}
}

function startSong() {
	document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	document.getElementById('songName').innerText = queue[queueIndex];
	audio.play().then(mediaSession).catch(err => {
		console.log(err);
	});
}

function pauseSong() {
	document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	audio.pause();
}

function stopSong() {
	document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	document.getElementById('songName').innerText = '';
	document.getElementById('seekBar').value = 0;
	updateCSS('0s', '0s');
	audio.pause();
}

function updateInterface() {
	const elem = document.getElementById('queue');

	if (queue.length > 0) {
		elem.innerHTML = '';

		queue.forEach((object, key) => {
			if (key == queueIndex) elem.innerHTML += `<button title="${object}" onclick="queueClick(event, '${key}')" style="background-color: lightblue;"><span>${key + 1}</span><span>${object}</button></div><hr>`;
			else elem.innerHTML += `<button title="${object}" onclick="queueClick(event, '${key}')"><span>${key + 1}</span><span>${object}</button></div><hr>`;

			// elem.innerHTML += '<br>';
		});
	} else elem.innerHTML = '<i>Queue is empty</i>';

	if (audio.src != '' && audio.src != undefined) {
		if (audio.paused == true) {
			document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
		} else if (audio.paused == false) {
			document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_pause_white.svg';
		} else {
			console.error('WUT?');
		}
	}
}



// Media Sessions
function mediaSession() {
	const songName = queue[queueIndex].replace(/(\.\w{3})$/, '');
	const arr = songName.split(/\s+-\s+/);
	const artist = arr[0].trim();
	const title = arr[1].trim();

	if ('mediaSession' in navigator) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: title,
			artist: artist,
			artwork: [
			{ src: 'Assets/Icons/icon-512.png', sizes: '512x512', type: 'image/png' },
			{ src: 'Assets/Icons/icon-128.png', sizes: '128x128', type: 'image/png' },
			{ src: 'Assets/Icons/icon-256.png', sizes: '256x256', type: 'image/png' },
			{ src: 'Assets/Icons/icon-387.png', sizes: '384x384', type: 'image/png' },
			{ src: 'Assets/Icons/android-icon-96x96.png', sizes: '96x96',   type: 'image/png' },
			{ src: 'Assets/Icons/android-icon-192x192.png', sizes: '192x192', type: 'image/png' }
			]
		});

		navigator.mediaSession.setActionHandler('nexttrack', next);
		navigator.mediaSession.setActionHandler('previoustrack', previus);
		navigator.mediaSession.setActionHandler('play', evt => {playSong(null, true)});
		navigator.mediaSession.setActionHandler('pause', evt => {pauseSong(null, true)});
		// navigator.mediaSession.setActionHandler('seekforward', function() {  Code excerpted.  });
		// navigator.mediaSession.setActionHandler('seekbackward', evt => {playSong(null, true)});
	}
}