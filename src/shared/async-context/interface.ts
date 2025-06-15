export interface RequestContext {
	requestId: string;
	userId?: string;
	path: string;
	method: string;
	timestamp: Date;
	ip?: string;
	duration?: string;
	[key: string]: any;
}
