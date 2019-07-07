const queue = [];
let queueIndex = 0;
let previousTrack;

function enqueue(...vals) {
	if (Array.isArray(vals[0]))
		vals = vals[0];

	if (document.getElementById('shuffle').getAttribute('activated') == 'true')
		vals.shuffle();

	vals.forEach((object, key) => {
		queue[queue.length] = object;
	});

	updateInterface();
	updateCookies();
}

function end() {
	const songName = queue[queueIndex];

	if (shouldUpdateMostListened) {
		get('/updateMostListenedPlaylist', {method: 'POST', body: songName}).then(json => {
			if (json.success) console.log(json.data);
			else console.warn(json.data);
		}).catch(err => {
			console.error('An error occurred', err);
		});
	}

	next();
}

function next() {
	const repeatElem = document.getElementById('repeat');

	if (!(repeatElem.getAttribute('activated') == 'true' && repeatElem.hasAttribute('repeatOne'))) {
		const newIndex = Number(queueIndex) + 1;

		if (queue.length > newIndex)
			updateQueueIndex(newIndex);
		else {
			if (repeatElem.getAttribute('activated') == 'true')
				updateQueueIndex(0);
			else
				return;
		}

		updateInterface();
	}

	playSong(queue[queueIndex], true);
}

function previous() {
	const newIndex = queueIndex - 1;

	if (queueIndex > 0) {
		updateQueueIndex(newIndex);
	} else {
		if (document.getElementById('repeat').getAttribute('activated') == 'true')
			updateQueueIndex(queue.length - 1);
		else return;
	}

	updateInterface();
	playSong(queue[queueIndex], true);
}

function deleteQueue() {
	stopSong();
	queueIndex = 0;
	queue.length = 0;

	deleteCookie();
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
	try {document.getElementById('lyricsElem').innerHTML = `<h3>Loading</h3><br><div class="ball-scale-multiple"><div></div><div></div><div></div></div>`;} catch (err) {}
	document.getElementById('showData').setAttribute('activated', false);

	const audioPlayReturnVal = audio.play();
	if (audioPlayReturnVal) {
		audioPlayReturnVal.then(mediaSession).catch(err => {
			console.error(err);
		});
	} else {
		try {
			mediaSession();
		} catch (err) {
			console.error('MediaSession Error', err);
		}
	}

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
			if (key == queueIndex)
				elem.innerHTML += `<button title="${object}" onclick="queueClick(event, '${key}')" active><span>${key + 1}</span><span>${object}</button></div><hr>`;
			else
				elem.innerHTML += `<button title="${object}" onclick="queueClick(event, '${key}')"><span>${key + 1}</span><span>${object}</button></div><hr>`;
		});
	} else elem.innerHTML = '<i>Queue is empty</i><button class="tmpBtn" onclick="getTmpSavedQueue(\'ip\', true)">Get temporary saved IP-based queue</button><button class="tmpBtn" onclick="getTmpSavedQueue(\'global\', true)">Get temporary saved global queue</button>';

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

function setVolume(volumeNum, elem) {
	audio.volume = volumeNum;

	if (elem) {
		elem = elem.getElementsByTagName('img')[0];

		if (volumeNum <= 0)
			elem.src = 'Assets/ic_volume_off_white.svg';
		else
			elem.src = 'Assets/ic_volume_up_white.svg';
	}
}

function displayLyrics(artist, songName) {
	let lyricsElem = document.getElementById('lyricsElem');

	if (!lyricsElem) {
		lyricsElem = document.createElement('div');
		lyricsElem.id = 'lyricsElem';
		lyricsElem.innerHTML = `<h3>Loading</h3><br><div class="ball-scale-multiple"><div></div><div></div><div></div></div>`;

		document.body.appendChild(lyricsElem);
	} else lyricsElem.style.display = 'block';

	function isDescendant(parent, child) {
		let looped = 0;
		let node = child.parentNode;

		while (node != null && looped < 5) {
			if (node == parent)
				return true;

			looped++;
			node = node.parentNode;
		}

		return false;
	}

	setTimeout(() => {
		function clickEvt(evt) {
			if (!isDescendant(lyricsElem, evt.target)) {
				lyricsElem.style.display = 'none';
				document.body.removeEventListener('click', clickEvt);
			}
		}

		document.body.addEventListener('click', clickEvt);
	}, 100);

	if (previousTrack != songName) {
		get(`/getLyrics/${artist}/${songName}`).then(json => {
			if (json.success) {
				const lyrics = json.lyrics.trim().replace(/\n/g, '<br>');

				previousTrack = songName;
				lyricsElem.innerHTML = `<h3>Lyrics</h3><p style="line-height: 1.5;">${lyrics}</p>`;
			} else lyricsElem.innerHTML = `<h3>Error</h3><br><p>${json.error}</p>`;
		}).catch(err => {
			console.error(err);
			lyricsElem.innerHTML = `<h3>Error</h3><br><p>Couldn't fetch lyrics</p><br>` + err;
		});
	}
}

function escapeString(string) {
	return string.replace(/\'/g, "\\\'");
}

function updateCookies() {
	document.cookie = 'queueIndex=' + queueIndex;
	document.cookie = 'queue=' + encodeURIComponent(queue.map(val => {return escape(val)}).join(','));
}




// Media Sessions
function mediaSession() {
	const songName = queue[queueIndex].replace(/(\.\w{3})$/, '');
	const match = songName.split(/(\-|\–)/);

	let title = songName;
	let artist = songName;
	let tagsLoaded = false;

	if (match) {
		artist = match.splice(0, 1)[0].trim();
		title = match.join('-').trim();

		get('/songInfo/' + queue[queueIndex]).then(json => {
			if (json.error) return;
			try {document.getElementById('artistInfo').remove()} catch(err) {}

			tagsLoaded = true;

			let imageUrl;
			const img = new Image();
			const dataDiv = document.createElement('div');

			dataDiv.id = 'artistInfo';
			dataDiv.innerHTML += '<p style="font-size: 120%;">Song info:</p>';
			dataDiv.innerHTML += `<img title="View lyrics" class="infoBtn" onclick="displayLyrics('${escapeString(json.artist)}', '${escapeString(json.title)}')" src="Assets/ic_music_note_white.svg">`;
			dataDiv.innerHTML += `<img title="Edit tags" class="infoBtn" onclick="window.location = '/editTags.html#${queue[queueIndex]}'" src="Assets/ic_edit_white.svg"> <hr>`
			dataDiv.innerHTML += `<p><b>Title:</b> ${json.title}</p>`;
			dataDiv.innerHTML += `<p><b>Artist:</b> ${json.artist}</p>`;
			dataDiv.innerHTML += `<p><b>Album:</b> ${json.album}</p>`;
			dataDiv.innerHTML += `<p><b>Year:</b> ${json.year}</p>`;

			document.title = 'Music Stream - ' + title.replace(/-/g, '');

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
	}

	document.title = 'Music Stream - ' + title.replace(/-/g, '');

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

function deleteCookie() {
	decodeURIComponent(document.cookie).split(";").forEach((object, key) => {
		const eqPos = object.indexOf("=");
		const name = eqPos > -1 ? object.substr(0, eqPos) : object;

		document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
	});
}

function updateQueueIndex(num) {
	queueIndex = num;
	updateCookies();
}



function addVideoToQueue(name) {
	if (name)
		enqueue('../video/' + name);
}