import { Context, ISaga, Request } from '../../lib/types';

class Saga1 implements ISaga {
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
