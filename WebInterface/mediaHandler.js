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
	if (audio.currentTime > 0) {
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
		} else if (notAddToQueue) {
			if (!songName) songName = queue[queueIndex];
			audio.src = '/song/' + songName;
			startSong();
		}
	} else if (notAddToQueue) {
		if (!songName) songName = queue[queueIndex];
		audio.src = '/song/' + songName;
		startSong();
	} else {
		if (!songName) songName = queue[queueIndex];

		audio.src = '/song/' + songName;

		if (!notAddToQueue) {
			enqueue(songName);
			// queueIndex++;
			updateInterface();
		}

		startSong();
	}
}

function startSong() {
	document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	document.getElementById('songName').innerText = queue[queueIndex];
	document.getElementById('showData').removeAttribute('activated');
	audio.play().then(mediaSession).catch(err => {
		console.log(err);
	});

	try {document.getElementById('artistInfo').remove()} catch(err) {}
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
	const match = songName.match(/(.+)(\s+)?-(\s+)?(.+)/);

	let title = songName;
	let artist = songName;

	if (match) {
		artist = match[1].trim();
		title = match[4].trim();

		fetchArtistData(artist).then(json => {
			// console.log(json);

			// Display info
			const dataDiv = document.createElement('div');

			dataDiv.id = 'artistInfo';
			dataDiv.innerHTML += `<p style="font-size: 120%;"><i>Artist info:</i></p><hr>`;
			dataDiv.innerHTML += `<p><b>Name:</b> <a href="${json.url}">${json.name}</a></p>`;
			dataDiv.innerHTML += `<p><b>On tour:</b> ${(json.ontour == 1) ? true : false}</p>`;
			dataDiv.innerHTML += `<p><b>Playcount:</b> ${json.stats.playcount}</p>`;
			dataDiv.innerHTML += `<p><b>Listeners:</b> ${json.stats.listeners}</p>`;
			dataDiv.innerHTML += `<p><b>Tags:</b> ${json.tags.tag.map(obj => {return obj.name})}</p>`;

			document.getElementById('mainControls').appendChild(dataDiv);
			document.getElementById('showData').setAttribute('activated', '');

			// Edit thumbnail
			if (json.image && 'mediaSession' in navigator) {
				navigator.mediaSession.metadata = new MediaMetadata({
					title: title,
					artist: artist,
					artwork: [
					{ src: json.image[0]['#text'], sizes: '34x32', type: 'image/png' },
					{ src: json.image[1]['#text'], sizes: '64x64', type: 'image/png' },
					{ src: json.image[2]['#text'], sizes: '174x174', type: 'image/png' },
					{ src: json.image[3]['#text'], sizes: '300x300', type: 'image/png' },
					{ src: json.image[4]['#text'], sizes: '500x498', type: 'image/png' },
					{ src: json.image[5]['#text'], sizes: '126x126', type: 'image/png' }
					]
				});
			}
		}).catch(err => {
			console.warn(err);
		});
	}

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


		let skipTime = 10; // Time to skip in seconds

		navigator.mediaSession.setActionHandler('seekbackward', function() {
		  // User clicked "Seek Backward" media notification icon.
		  audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
		});

		navigator.mediaSession.setActionHandler('seekforward', function() {
		  // User clicked "Seek Forward" media notification icon.
		  audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration);
		});
	}
}

function fetchArtistData(artistName) {
	artistName = escape(artistName);
	const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${artistName}&api_key=f02456f630621a02581b2143a67372f0&format=json&autocorrect=1`;
	// const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=f02456f630621a02581b2143a67372f0&artist=${artistName}&track=${songName}&format=json&autocorrect=1`;

	return new Promise((resolve, reject) => {
		fetch(url).then(response => {
			response.json().then(json => {
				if (json.artist) resolve(json.artist);
				else if (json.error) reject(json.message);
				else reject('Something went wrong with the JSON');
			});
		}).catch(err => reject(err));
	});
}