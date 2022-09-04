class Counter {
	value: number = 0;
	context: any = null;
	expiresAt: number = 0;

	constructor(params) {
		console.log(JSON.stringify({ params }, null, 4));
	}

	schedule() {
		this.context.alarm.set(2);
	}

	deschedule() {
		console.log('Clear alarm!');
		this.context.alarm.clear();
	}

	onAlarm() {
		console.log('Alarm executed.');
		this.increment();

		if (this.value === 10) {
			console.log('Clear alarm.');
			return this.context.alarm.clear();
		}

		console.log('Reset alarm.');
		this.context.alarm.set(this.value);
	}

	onExpire() {}

	increment() {
		this.value += 1;
	}

	decrement() {
		this.value -= 1;
	}
}
