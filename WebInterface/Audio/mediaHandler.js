const blobImageArr = [];
const queue = [];

let prevLoadedMediaSessionSong;
let previousLyricsSong;
let queueIndex = 0;

function enqueue(...vals) {
	if (Array.isArray(vals[0]))
		vals = vals[0];

	if (document.getElementById('shuffle').getAttribute('activated') == 'true')
		vals.shuffle();

	vals.forEach((object) => {
		queue[queue.length] = object;
	});

	updateInterface();
	updateQueueStore();
}

function end() {
	const songName = queue[queueIndex];
	const fallback = () => {
		get('/updateMostListenedPlaylist', { method: 'POST', body: songName }).then(json => {
			if (json.success)
				console.log(json.data);
			else
				console.warn(json.data);
		}).catch(err => {
			console.error('An error occurred', err);
		});
	}

	if (shouldUpdateMostListened) {
		if (window.sw && window.sw.funcs) {
			window.sw.funcs.updateMostlistened(songName)
				.catch(fallback);

			next();
			return;
		}

		fallback();
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

	removeQueueStore();
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
	document.getElementById('showData').setAttribute('activated', false);

	try {
		document.getElementById('songName').innerText = queue[queueIndex].replace(/(\.\w{2,5})$/, '');
	} catch (err) { }
	try {
		const elem = document.getElementById('lyricsElem').getElementsByTagName('div')[0];

		elem.innerHTML = '';
		elem.appendChild(document.getElementById('lyricsElem-loading').content.cloneNode(true));
	} catch (err) { }

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

	if (prevLoadedMediaSessionSong !== queue[queueIndex]) {
		try {
			document.getElementById('artistInfo').remove();
		} catch (err) { }
	}
}

function pauseSong() {
	document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	audio.pause();
}

function stopSong() {
	const seekBar = document.getElementById('seekBar');

	document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	document.getElementById('songName').innerText = '';
	seekBar.value = 0;
	updateCSS(seekBar, '00:00', '00:00');
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

	document.getElementById('queueCount').innerText = "Amount: " + queue.length;
	if (queue.length > 0) {
		elem.innerHTML = '';

		const containerElem = elem.cloneNode();
		queue.forEach((object, key) => {
			const buttonElem = document.createElement('button');

			buttonElem.addEventListener('click', evt => queueClick(evt, key));
			buttonElem.setAttribute('index', key + 1);
			buttonElem.classList.add('listElem');
			buttonElem.innerText = object;
			buttonElem.title = object;

			if (key === queueIndex)
				buttonElem.setAttribute('active', '');

			containerElem.appendChild(buttonElem);
		});

		elem.replaceWith(containerElem);
	} else elem.innerHTML = '<i>Queue is empty</i><button class="tmpBtn" onclick="getTmpSavedQueue(\'ip\', true)">Get temporary saved IP-based queue</button><button class="tmpBtn" onclick="getTmpSavedQueue(\'global\', true)">Get temporary saved global queue</button>';

	if (audio.src != '' && audio.src != undefined) {
		if (audio.paused == true)
			document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
		else if (audio.paused == false)
			document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_pause_white.svg';
		else
			console.error('WUT?');
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
	let lyricsElemContainer = document.getElementById('lyricsElem');
	let lyricsElem = lyricsElemContainer.getElementsByTagName('div')[0];

	lyricsElemContainer.style.display = 'block';
	setTimeout(() => {
		document.body.addEventListener('click', function clickEvt(evt) {
			if (!evt.path.includes(lyricsElemContainer)) {
				lyricsElemContainer.style.display = 'none';
				document.body.removeEventListener('click', clickEvt);
			}
		});
	}, 500);

	if (previousLyricsSong != songName) {
		get(`/getLyrics/${artist}/${songName}`).then(json => {
			if (!json.success) {
				const templateElem = document.getElementById('lyricsElem-error').content.cloneNode(true);
				templateElem.querySelector('p').innerText = json.error;

				lyricsElem.innerHTML = '';
				lyricsElem.appendChild(templateElem);
			} else {
				const templateElem = document.getElementById('lyricsElem-lyrics').content.cloneNode(true);
				const lyrics = json.lyrics.trim().replace(/\n/g, '<br>');

				templateElem.querySelector('p').innerText = lyrics;
				previousLyricsSong = songName;

				lyricsElem.innerHTML = '';
				lyricsElem.appendChild(templateElem);
			}
		}).catch(err => {
			console.error(err);

			const templateElem = document.getElementById('lyricsElem-error').content.cloneNode(true);
			templateElem.querySelector('p').innerText = "Couldn't fetch lyrics";

			lyricsElem.innerHTML = '';
			lyricsElem.appendChild(templateElem);
		});
	}
}

function escapeString(string) {
	if (string)
		return string.replace(/\'/g, "\\\'");
	else
		return '';
}

function updateQueueStore() {
	// Only save first 50
	localforage.setItem('queue', JSON.stringify(queue.slice(0, 50))).catch(console.error);
	localforage.setItem('queueIndex', queueIndex).catch(console.error);
}




// Media Sessions
function mediaSession() {
	if (prevLoadedMediaSessionSong === queue[queueIndex])
		return;

	prevLoadedMediaSessionSong = queue[queueIndex];

	const songName = queue[queueIndex].replace(/(\.\w{3})$/, '');
	const match = songName.split(/(\-|\–)/);

	let title = songName;
	let artist = songName;

	if (match) {
		artist = match.splice(0, 1)[0].trim();
		title = match.join('-').trim();

		get('/songInfo/' + queue[queueIndex]).then(data => {
			if (!data.success)
				return;

			try {
				document.getElementById('artistInfo').remove();
			} catch (err) { }

			const dataDiv = document.createElement('div');
			const img = new Image();
			const json = data.tags;
			let imageUrl;

			dataDiv.id = 'artistInfo';

			(() => {
				const pElem = document.createElement('p');
				pElem.innerText = 'Song info:';
				pElem.style.fontSize = '120%';
				dataDiv.appendChild(pElem);

				const lyricsBtn = document.createElement('img');
				const tagsBtn = document.createElement('img');

				lyricsBtn.src = 'Assets/ic_music_note_white.svg';
				lyricsBtn.className = 'infoBtn';
				lyricsBtn.title = 'View lyrics';

				tagsBtn.src = 'Assets/ic_edit_white.svg';
				tagsBtn.className = 'infoBtn';
				tagsBtn.title = 'Edit tags';

				dataDiv.appendChild(lyricsBtn);
				dataDiv.appendChild(tagsBtn);
				dataDiv.appendChild(document.createElement('hr'));

				tagsBtn.addEventListener('click', () => window.open('/editTags.html#' + encodeURIComponent(queue[queueIndex])));
				lyricsBtn.addEventListener('click', () => displayLyrics(json.artist, json.title));

				['Title', 'Artist', 'Album', 'Year'].forEach(val => {
					const spanElem = document.createElement('span');
					const pElem = document.createElement('p');
					const bElem = document.createElement('b');

					spanElem.innerText = ' ' + json[val.toLowerCase()];
					bElem.innerText = val + ':';

					pElem.appendChild(bElem);
					pElem.appendChild(spanElem);
					dataDiv.appendChild(pElem);
				});
			})();

			document.title = 'Music Stream - ' + title.replace(/-/g, '');

			try {
				if (window.innerWidth > 500) {
					if (json.image.imageBuffer.data.length > 1e7) return;
					const arrayBufferView = new Uint8Array(json.image.imageBuffer.data);
					const blob = new Blob([arrayBufferView], { type: "image/jpeg" });
					const urlCreator = window.URL || window.webkitURL;

					// Revoke previous images
					for (let i = blobImageArr.length - 1; i >= 0; i--) {
						urlCreator.revokeObjectURL(blobImageArr[i]);
						blobImageArr.splice(i, 1);
					}

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

					blobImageArr.push(imageUrl);
					dataDiv.appendChild(img);
				}
			} catch (err) { };

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
				{ src: 'Assets/Icons/android-icon-96x96.png', sizes: '96x96', type: 'image/png' },
				{ src: 'Assets/Icons/android-icon-192x192.png', sizes: '192x192', type: 'image/png' }
			]
		});
	}
}

function removeQueueStore() {
	localforage.removeItem('queueIndex').catch(console.error);
	localforage.removeItem('queue').catch(console.error);
}

function updateQueueIndex(num) {
	queueIndex = num;
	updateQueueStore();
}

function addVideoToQueue(name) {
	if (name)
		enqueue('../video/' + name);
}