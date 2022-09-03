import { Context, Saga, Request } from '../../lib/types';

class Saga1 implements Saga {
	value: number = 0;
	context: Context;
	request: Request;

	increment() {
		this.value += 1;
	}

	decrement() {
		this.value -= 1;
	}
}
