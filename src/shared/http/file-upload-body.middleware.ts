import { IncomingMessage } from "http";

const FILE_UPLOAD_ROUTES: Array<{ method: string; pattern: RegExp }> = [
	{ method: "POST", pattern: /^\/api\/v1\/agents\/?$/ },
	{ method: "PUT", pattern: /^\/api\/v1\/agents\/[^/]+\/?$/ },
	{ method: "POST", pattern: /^\/api\/v1\/users\/?$/ },
	{ method: "PUT", pattern: /^\/api\/v1\/users\/[^/]+\/?$/ },
	{ method: "POST", pattern: /^\/api\/v1\/responders\/?$/ },
	{ method: "PUT", pattern: /^\/api\/v1\/responders\/[^/]+\/?$/ },
	{ method: "POST", pattern: /^\/api\/v1\/tickets\/?$/ },
	{ method: "POST", pattern: /^\/api\/v1\/accounts\/auth\/register\/?$/ },
	{ method: "PUT", pattern: /^\/api\/v1\/accounts\/auth\/profile\/?$/ },
];

export function isFileUploadRoute(req: IncomingMessage): boolean {
	const path = (
		("originalUrl" in req && typeof req.originalUrl === "string"
			? req.originalUrl
			: req.url) || ""
	).split("?")[0];
	const method = (req.method || "").toUpperCase();
	return FILE_UPLOAD_ROUTES.some(
		(route) => route.method === method && route.pattern.test(path),
	);
}
