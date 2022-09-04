class AlarmCounter {
	value: number = 0;
	context: any = null;
	expiresAt: number = 0;

	schedule() {
		this.context?.alarm?.set(1);
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
