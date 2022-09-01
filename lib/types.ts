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
