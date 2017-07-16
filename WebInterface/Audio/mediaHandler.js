const queue = [];
let queueIndex = 0;

function enqueue(...vals) {
	if (vals.length > 1) {
		if (document.getElementById('shuffle').getAttribute('activated') == 'true') vals.shuffle();
		vals.forEach((object, key) => {
			queue[queue.length] = object;
		});
	} else queue[queue.length] = vals[0];

	updateInterface();
}

function end() {
	const songName = queue[queueIndex];

	fetch('/updateMostListenedPlaylist', {method: 'POST', body: songName}).then(response => {
		response.json().then(json => {
			if (json.success) console.log(json.data);
			else console.warn(json.data);
		});
	}).catch( err => {
		console.error('An error occurred', err);
	});

	next();
}

function next() {
	if (!(document.getElementById('repeat').getAttribute('activated') == 'true' && document.getElementById('repeat').getAttribute('repeatOne') == 'true')) {
		const newIndex = Number(queueIndex) + 1;

		if (queue.length > newIndex) {
			queueIndex = newIndex;
		} else {
			if (document.getElementById('repeat').getAttribute('activated') == 'true') queueIndex = 0;
			else return;
		}

		updateInterface();
	}

	playSong(queue[queueIndex], true);
}

function previous() {
	const newIndex = queueIndex - 1;

	if (queueIndex > 0) {
		queueIndex = newIndex;
	} else {
		if (document.getElementById('repeat').getAttribute('activated') == 'true') queueIndex = queue.length - 1;
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
		if (!songName) songName = queue[queueIndex];
		audio.src = '/song/' + songName;
		startSong();
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
	try {document.getElementById('songName').innerText = queue[queueIndex].replace(/(\.\w{2,5})$/, '');} catch (err) {}
	document.getElementById('showData').setAttribute('activated', false);
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

function pickRandomSong() {
	const elems = document.getElementById('songs').querySelectorAll('button');
	const songName = elems[Math.floor(Math.random() * elems.length)].innerText;
	enqueue(songName);
	if (queue.length <= 1) playSong(null, true);
	// // queue.length = 0;
	// // queueIndex = 0;
	// // enqueue(songName);
	// playSong(songName/*, true*/);
}

function updateInterface() {
	const elem = document.getElementById('queue');

	if (queue.length > 0) {
		elem.innerHTML = '';
		document.getElementById('queueCount').innerText = "Amount: " + queue.length;
		queue.forEach((object, key) => {
			if (key == queueIndex) elem.innerHTML += `<button title="${object}" onclick="queueClick(event, '${key}')" style="background-color: lightblue;"><span>${key + 1}</span><span>${object}</button></div><hr>`;
			else elem.innerHTML += `<button title="${object}" onclick="queueClick(event, '${key}')"><span>${key + 1}</span><span>${object}</button></div><hr>`;
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
	const match = songName.split(/(\-|\–)/);

	let title = songName;
	let artist = songName;

	if (match) {
		artist = match.splice(0, 1)[0].trim();
		title = match.join('-').trim();

		fetchArtistData(artist).then(json => {
			try {document.getElementById('artistInfo').remove()} catch(err) {}

			const dataDiv = document.createElement('div');

			dataDiv.id = 'artistInfo';
			dataDiv.innerHTML += `<p style="font-size: 120%;"><i>Artist info:</i></p><hr>`;
			dataDiv.innerHTML += `<p><b>Name:</b> <a href="${json.url}">${json.name}</a></p>`;
			dataDiv.innerHTML += `<p><b>On tour:</b> ${(json.ontour == 1) ? true : false}</p>`;
			dataDiv.innerHTML += `<p><b>Playcount:</b> ${json.stats.playcount}</p>`;
			dataDiv.innerHTML += `<p><b>Listeners:</b> ${json.stats.listeners}</p>`;
			dataDiv.innerHTML += `<p><b>Tags:</b> ${json.tags.tag.map(obj => {return obj.name})}</p>`;

			if (window.innerWidth > 500) {
				const img = document.createElement('img');
				img.style.top = '60px';
				img.style.right = '20px';
				img.style.position = 'absolute';
				img.style.border = '2px white solid';
				img.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
				img.src = json.image[1]['#text'];
				dataDiv.appendChild(img);
			}

			document.getElementById('mainControls').appendChild(dataDiv);
			document.getElementById('showData').setAttribute('activated', true);

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

		fetch('/songInfo/' + queue[queueIndex]).then(response => {
			response.json().then(json => {
				if (json.error) return;
				try {document.getElementById('artistInfo').remove()} catch(err) {}

				let imageUrl;
				const img = new Image();
				const dataDiv = document.createElement('div');

				dataDiv.id = 'artistInfo';
				dataDiv.innerHTML += `<p style="font-size: 120%;">Song info:</p><hr>`;
				dataDiv.innerHTML += `<p><b>Title:</b> ${json.title}</p>`;
				dataDiv.innerHTML += `<p><b>Artist:</b> ${json.artist}</p>`;
				dataDiv.innerHTML += `<p><b>Album:</b> ${json.album}</p>`;
				dataDiv.innerHTML += `<p><b>Year:</b> ${json.year}</p>`;

				try {
					if (window.innerWidth > 500) {
						if (json.image.imageBuffer.data.length > 1e7) return;
						const arrayBufferView = new Uint8Array(json.image.imageBuffer.data);
						const blob = new Blob([arrayBufferView], {type: "image/jpeg"});
						const urlCreator = window.URL || window.webkitURL;

						imageUrl = urlCreator.createObjectURL(blob);
						img.id = 'thumbnail';
						img.style.top = '40px';
						img.style.right = '10px';
						img.style.width = '100px';
						img.style.height = 'auto';
						img.style.position = 'absolute';
						img.style.border = '2px white solid';
						img.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
						img.src = imageUrl;
						dataDiv.appendChild(img);
					}
				} catch (err) {};

				document.getElementById('mainControls').appendChild(dataDiv);
				document.getElementById('showData').setAttribute('activated', true);

				if ('mediaSession' in navigator) {
					navigator.mediaSession.metadata.title = json.title;
					navigator.mediaSession.metadata.album = json.album;
					navigator.mediaSession.metadata.artist = json.artist;

					img.onload = evt => {
						navigator.mediaSession.metadata.artwork.length = 0;
						navigator.mediaSession.metadata.artwork = [
						{ src: imageUrl, sizes: '512x512', type: 'image/jpeg' },
						];
					}
				}
			}).catch(err => console.warn(err));
		}).catch(err => console.warn(err));
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
		navigator.mediaSession.setActionHandler('previoustrack', previous);
		navigator.mediaSession.setActionHandler('pause', evt => pauseSong(null, true));
		navigator.mediaSession.setActionHandler('play', evt => {
			if (audio.src != null) {
				if (audio.paused) startSong();
				else pauseSong();
			} else playSong(null, true);
		});
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