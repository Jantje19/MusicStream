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
	const queue = getQueue();

	if (vals.length > 1)
		queue = vals;
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

function updateQueue(newQueue) {
	const queueElem = document.getElementById('queue');

	if (newQueue instanceof Array) {
		queueElem.innerHTML = '';
		newQueue.forEach((object, key) => {
			if (key == queueIndex - 1)
				queueElem.innerHTML += `<button style="background-color: rgba(22, 160, 133, 0.5);" onclick="queueClick(event)" draggable="true" ondragstart="drag(event)" class="queueItem ${key}" id="newId-${key}">${object}</button>`;
			else
				queueElem.innerHTML += `<button onclick="queueClick(event)" draggable="true" ondragstart="drag(event)" class="queueItem ${key}" id="newId-${key}">${object}</button>`;
		});
	}
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

	updateQueue(queue);
	playVid(queue[queueIndex - 1], true);
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