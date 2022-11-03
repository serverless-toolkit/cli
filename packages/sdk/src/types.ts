import { Item } from './kv-store';
import { RequestInfo, RequestInit, Response as FetchResponse } from 'node-fetch';

export interface Request {
	fetch: (url: RequestInfo, init?: RequestInit) => Promise<FetchResponse>;
	rawQueryString?: string;
	requestContext?: {
		domainName?: string;
		domainPrefix?: string;
		authorizer?: {
			lambda?: unknown;
		};
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
