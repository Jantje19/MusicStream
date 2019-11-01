/* https://gist.github.com/Jantje19/7be50eabb1c904eb38d067deb3427b0b */

class MSToast extends HTMLElement {
	#extraInfoContainer;
	#messageContainer;
	#buttonContainer;
	#extraInfoBtn;
	#container;

	constructor(...args) {
		const self = super(...args);

		const extraInfoContainer = document.createElement('div');
		const buttonContainer = document.createElement('div');
		const extraInfoBtn = document.createElement('button');
		const messageContainer = document.createElement('p');
		const shadow = this.attachShadow({ mode: 'open' });
		const styleElem = document.createElement('style');
		const container = document.createElement('div');

		styleElem.innerHTML = `
		:host {
			--accent-color: #FFFFFF;
		}

		:host {
			right: 10px;
			bottom: 10px;
			z-index: 1000;
			color: #fafafa;
			position: fixed;
			max-width: 500px;
			height: calc(100px + 50px);
			font-family: 'Roboto', sans-serif;
			width: calc(100% - (10px * 2) + (2 * 20px));
		}

		:host > div {
			width: calc(100% - (2 * 20px));
		}

		:host > div#container {
			right: 0;
			bottom: 0;
			height: 50px;
			display: flex;
			padding: 0 20px;
			overflow: hidden;
			position: absolute;
			align-items: center;
			will-change: transform;
			background-color: #424242;
			transition: transform .2s ease;
			box-shadow: 0 2px 10px rgba(0, 0, 0, .4);
			transform: translateY(calc(100% + 10px + 5px));
		}

		:host > div#container button {
			cursor: pointer;
		}

		:host > div#container button {
			margin: 0;
			padding: 0;
			border: none;
			position: relative;
			color: var(--accent-color);
			background-color: transparent;
		}

		:host > div#container button:before {
			top: 0;
			left: 0;
			opacity: 0;
			content: '';
			width: 100%;
			height: 100%;
			display: block;
			position: absolute;
			will-change: opacity;
			transition: opacity .3s ease;
			background-color: rgba(255, 255, 255, 0.3);
		}

		:host > div#container button:hover:before {
			opacity: 1;
		}

		:host > div#container > p {
			flex: 1;
			margin: 0;
			padding: 0;
			color: #fafafa;
			text-align: left;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		:host > div#container > button {
			width: 24px;
			height: 24px;
		}

		:host > div#container > button:before {
			border-radius: 100%;
		}

		:host > div#container > div > button {
			margin: 0 5px;
			padding: 5px 10px;
		}

		:host > div#container button#extra-info-btn > svg {
			will-change: transform;
			transition: transform .3s ease;
		}

		:host > div#container > button#extra-info-btn[open] > svg {
			transform: rotate(180deg);
		}

		:host > div#extra-info {
			right: 0;
			top: 50px;
			height: 100px;
			display: none;
			color: #fafafa;
			position: absolute;
			background-color: #424242;
			border-top: 2px solid #757575;
		}

		:host > div#extra-info > p {
			margin: 0;
			padding: 10px;
		}

		@media screen and (max-width: 800px) {
			:host {
				right: 20px;
				width: 100%;
				bottom: 30px;
				max-width: calc(100% - 20px - (2 * 10px));
			}

			:host > div#container {
				transform: translateY(calc(100% + 30px + 5px));
			}
		}`;

		container.id = 'container';

		extraInfoContainer.innerHTML = '<p></p>';
		extraInfoContainer.id = 'extra-info';

		extraInfoBtn.style.display = 'none';
		extraInfoBtn.id = 'extra-info-btn';
		extraInfoBtn.innerHTML = `
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
		<path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
		</svg>`;
		extraInfoBtn.addEventListener('click', evt => {
			this.toggleExtraInfo();
		});

		shadow.appendChild(styleElem);
		shadow.appendChild(container);
		shadow.appendChild(extraInfoContainer);

		container.appendChild(messageContainer);
		container.appendChild(extraInfoBtn);
		container.appendChild(buttonContainer);

		this.#extraInfoContainer = extraInfoContainer;
		this.#messageContainer = messageContainer;
		this.#buttonContainer = buttonContainer;
		this.#extraInfoBtn = extraInfoBtn;
		this.#container = container;

		return self;
	}

	setMessage(msg) {
		this.#messageContainer.innerText = msg;
		this.#messageContainer.title = msg;

		return this;
	}

	setExtraInfo(msg) {
		this.#extraInfoBtn.style.display = 'block';
		this.#extraInfoContainer.children[0].innerText = msg;

		return this;
	}

	isExtraInfoOpen() {
		return this.#extraInfoBtn.hasAttribute('open');
	}

	closeExtraInfo() {
		return new Promise((resolve, reject) => {
			this.#container.addEventListener('transitionend', evt => {
				resolve();
			}, { once: true });

			this.#extraInfoBtn.removeAttribute('open');
			this.#extraInfoContainer.style.display = 'none';
			this.#container.style.transform = 'translateY(0px)';
		});
	}

	openExtraInfo() {
		return new Promise((resolve, reject) => {
			this.#extraInfoContainer.style.width = this.getBoundingClientRect().width + 'px';
			this.#extraInfoBtn.setAttribute('open', '');
			this.#container.addEventListener('transitionend', evt => {
				this.#extraInfoContainer.style.display = 'block';
				resolve();
			}, { once: true });
			this.#container.style.transform = 'translateY(-100px)';
		});
	}

	toggleExtraInfo() {
		if (this.isExtraInfoOpen())
			this.closeExtraInfo();
		else
			this.openExtraInfo();
	}

	setAccentColor(color) {
		this.style.setProperty('--accent-color', color);
	}

	addButton(...btns) {
		btns = btns.map(str => {
			const btn = document.createElement('button');
			btn.innerText = str.trim();
			this.#buttonContainer.appendChild(btn);
			return btn;
		});

		if (btns.length == 1)
			return btns[0];
		else
			return btns;
	}

	getButton(name, all = false, caseSensitive = false) {
		const btns = this.#buttonContainer.getElementsByTagName('button');
		const allArr = [];

		if (!caseSensitive)
			name = name.toLowerCase();

		for (let i = 0; i < btns.length; i++) {
			let innerText = btns[i].innerText;

			if (!caseSensitive)
				innerText = innerText.toLowerCase();

			if (innerText == name) {
				if (!all)
					return btns[i];
				else
					allArr.push(btns[i]);
			}
		}

		if (all)
			return allArr;
		else
			return;
	}

	dismiss() {
		this.closeExtraInfo().then(() => {
			this.#container.addEventListener('transitionend', evt => {
				this.#container.remove();
			}, { once: true });

			this.#container.style.transform = 'translateY(calc(100% + 10px + 5px))';
		});
	}

	connectedCallback() {
		if (this.hasAttribute('message'))
			this.setMessage(this.getAttribute('message'));

		if (this.hasAttribute('extra-info'))
			this.setExtraInfo(this.getAttribute('extra-info'));

		if (this.hasAttribute('button'))
			this.addButton(...this.getAttribute('button').split(','));

		if (this.hasAttribute('accent-color'))
			this.setAccentColor(this.getAttribute('accent-color'));

		setTimeout(() => {
			this.#container.style.transform = 'translateY(0px)';
		}, 800);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'message':
				this.setMessage(newValue);
				break;
			case 'extra-info':
				this.setExtraInfo(newValue);
				break;
			case 'button':
				this.addButton(...newValue.split(','));
				break;
			case 'accent-color':
				this.setAccentColor(newValue);
				break;
		}
	}
}

class ToastManager {
	static autoOkDismiss = false;
	static #toast;

	static getToast() {
		if (!this.#toast) {
			this.#toast = new MSToast();

			if (this.autoOkDismiss) {
				this.#toast.addButton('Ok').addEventListener('click', evt => {
					this.#toast.dismiss();
				});
			}

			document.body.appendChild(this.#toast);
		}

		return this.#toast;
	}

	static makeText(message, extraInfo) {
		const toast = this.getToast();

		toast.setMessage(message);
		if (extraInfo && extraInfo.toString().trim().length > 0)
			toast.setExtraInfo(extraInfo);

		return this;
	}
}

customElements.define('musicstream-toast', MSToast);

export default ToastManager;