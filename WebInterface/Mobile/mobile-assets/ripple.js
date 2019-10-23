class RipplePainter {
	static get inputProperties() { return ['--color', '--animation-tick', '--btn-y']; }

	#easing = function (t) { return t * (2 - t) };

	paint(ctx, geom, properties) {
		let tick = parseFloat(properties.get('--animation-tick').toString());
		const btnY = parseFloat(properties.get('--btn-y').toString());
		const endR = Math.sqrt((geom.width / 2) ** 2 + (geom.height - btnY) ** 2);

		if (tick < 0)
			tick = 0;
		if (tick > 1000)
			tick = 1000;

		ctx.beginPath();
		ctx.fillStyle = properties.get('--color').toString();
		ctx.arc(geom.width / 2, btnY, endR * this.#easing(tick / 1000), 0, 2 * Math.PI);
		ctx.fill();
		ctx.closePath();
	}
}

// Register our class under a specific name
registerPaint('ripple', RipplePainter);