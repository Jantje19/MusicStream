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
			if (val.tagName.toLowerCase() == 'button')
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
		queueElem.innerHTML = '';
		newQueue.forEach((object, key) => {
			if (key == queueIndex - 1)
				queueElem.innerHTML += `<button style="background-color: #12876f; color: white;" onclick="queueClick(event)" draggable="true" ondragstart="drag(event)" class="queueItem ${key}" id="newId-${key}">${object}</button>`;
			else
				queueElem.innerHTML += `<button onclick="queueClick(event)" draggable="true" ondragstart="drag(event)" class="queueItem ${key}" id="newId-${key}">${object}</button>`;
		});
	}

	if (startPlaying)
		nextQueueItem();
}

function allowDrop(evt) {
	evt.preventDefault();
}

function drag(evt) {
	evt.dataTransfer.setData("text", evt.target.id);
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

	const data = evt.dataTransfer.getData("text");
	const nodeCopy = document.getElementById(data).cloneNode(true);
	nodeCopy.id = "newId-" + data;
	nodeCopy.onclick = queueClick;
	nodeCopy.className = nodeCopy.className.replace('video', 'queueItem');
	target.appendChild(nodeCopy);
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