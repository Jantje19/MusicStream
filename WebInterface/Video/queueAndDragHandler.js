let settings = {};
let queueIndex = 0;

fetch('/getSettings/', {credentials: 'same-origin'}).then(response => {
	response.json().then(json => {
		settings = json;
	}).catch(err => {console.log(err);});
}).catch(err => {
	console.error('An error occurred', err);
	alert('Whoops!\nSettings couldn\'t be fetched! Please reload the page.');
});

function enqueue(...vals) {
	let queue = getQueue();

	if (vals.length > 1)
		queue = vals;
	else if (Array.isArray(vals[0]))
		vals[0].forEach(val => queue.push(val));
	else
		queue.push(vals[0]);

	updateQueue(queue);
	return queue;
}

function getQueue() {
	const queueElem = document.getElementById('queue');
	const queue = Array.from(queueElem.childNodes).filter(val => {
		if (val.tagName) {
			if (val.tagName.toLowerCase() === 'button' && !val.classList.contains('tmpBtn'))
				return true;
			else return false;
		} else return false;
	}).map(val => {
		return val.innerText;
	});

	return queue;
}

function updateQueue(newQueue, startPlaying) {
	const queueElem = document.getElementById('queue');

	if (Array.isArray(newQueue)) {
		const containerElem = queueElem.cloneNode();

		queueElem.innerHTML = '';
		newQueue.forEach((object, key) => {
			const buttonElem = document.createElement('button');

			buttonElem.addEventListener('click', queueClick);
			buttonElem.classList.add('queueItem', key);
			buttonElem.id = 'newId-' + key;
			buttonElem.innerText = object;

			if (key == queueIndex - 1) {
				buttonElem.style.backgroundColor = '#12876f';
				buttonElem.style.color = 'white';
			}

			containerElem.appendChild(buttonElem);
		});
		queueElem.replaceWith(containerElem);
	}

	if (startPlaying)
		nextQueueItem();
}

function allowDrop(evt) {
	evt.preventDefault();
}

function drag(evt) {
	evt.dataTransfer.setData('classlist', evt.target.classList.toString());
}

function drop(evt) {
	const target = evt.currentTarget;

	evt.preventDefault();
	if (target.childNodes.length > 0) {
		if (target.childNodes[1]) {
			if (target.childNodes[1].tagName.toLowerCase() == 'i')
				target.innerHTML = '';
		}
	}

	const dragElemClass = evt.dataTransfer.getData('classlist');
	const origElem = document.getElementsByClassName(dragElemClass)[0];
	const newElem = document.createElement('button');

	newElem.className = newElem.className.replace('video', 'queueItem');
	newElem.id = "newId-" + getQueue().length;
	newElem.innerText = origElem.innerText;
	newElem.title = origElem.innerText;
	newElem.classList.add('queueItem');
	newElem.onclick = queueClick;

	target.appendChild(newElem);
}

function queueClick(evt) {
	const newId = Number(evt.target.id.replace('newId-', ''));
	const queue = getQueue();

	if (evt.ctrlKey) {
		queue.splice(newId, 1);
		updateQueue(queue);
	} else {
		queueIndex = newId + 1;
		updateQueue(queue);
		playVid(queue[newId], true);
	}
}

function nextQueueItem() {
	const queue = getQueue();

	if (queue.length > queueIndex)
		queueIndex++;
	else return;

	if (selectElem) {
		const optsElemArr = Array.from(selectElem.getElementsByTagName('option'));

		for (let i = 0; i < optsElemArr.length; i++) {
			const object = optsElemArr[i];// !
			if (object.defaultSelected) {
				object.selected = '';
				return;
			}
		}

		optsElemArr[0].selected = '';
	}

	updateQueue(queue);
	playVid(queue[queueIndex - 1], true);
	removeTracks(document.getElementsByTagName('video')[0]);
}

function queueTop(video) {
	const queue = getQueue();

	queue.push(video);
	queue.move(queue.length - 1, queueIndex);
	queueIndex++;
	updateQueue(queue);
}

function clearQueue() {
	updateQueue([]);
}

function shuffleQueue() {
	queueIndex = 0;
	updateQueue(getQueue().shuffle(), true);
}

Array.prototype.move = function (old_index, new_index) {
	if (new_index >= this.length) {
		var k = new_index - this.length;
		while ((k--) + 1) {
			this.push(undefined);
		}
	}

	this.splice(new_index, 0, this.splice(old_index, 1)[0]);
	return this;
};

Array.prototype.shuffle = function () {
	for (let i = this.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[this[i], this[j]] = [this[j], this[i]];
	}

	return this;
};