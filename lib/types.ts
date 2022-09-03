import { Item } from './kv-store';

export interface Request {
	domainName?: string;
	domainPrefix?: string;
	requestContext?: {
		http?: {
			method?: string;
			path?: string;
			sourceIp?: string;
			userAgent?: string;
		};
	};
	body?: any;
	rawPath?: string;
	cookies?: string[];
	headers?: { [key: string]: string };
	queryStringParameters?: { [key: string]: string };
	isBase64Encoded?: boolean;
}

export interface Response {
	statusCode?: number;
	cookies?: string[];
	headers?: { [key: string]: string };
}

export type ISaga = {
	id?: string;
	onAlarm?: () => void;
	context?: Context;
	request?: Request;
};

export interface Context {
	store: {
		get<T extends Item>(id: string, type: string): Promise<T>;
		set<T extends Item>(item: T & { [key: string]: any }, type: string): Promise<T>;
	};
	alarm: {
		inMinutes(minute: number): Promise<void>;
		atDate(date: Date): Promise<void>;
		clear(): Promise<void>;
	};
}
