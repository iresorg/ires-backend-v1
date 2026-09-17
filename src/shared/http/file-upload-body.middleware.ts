import { NextFunction, Request, Response } from "express";

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

export function isFileUploadRoute(req: Request): boolean {
	const path = (req.originalUrl || req.url || "").split("?")[0];
	const method = req.method.toUpperCase();
	return FILE_UPLOAD_ROUTES.some(
		(route) => route.method === method && route.pattern.test(path),
	);
}

export function restoreMultipartContentType(
	req: Request,
	_res: Response,
	next: NextFunction,
) {
	if (!isFileUploadRoute(req)) {
		return next();
	}

	const contentType = String(req.headers["content-type"] || "");
	if (
		contentType.includes("multipart/form-data") &&
		/boundary=/i.test(contentType)
	) {
		return next();
	}

	const onEnd = () => next();
	const onData = (chunk: Buffer) => {
		req.pause();
		req.removeListener("end", onEnd);
		const preview = chunk.toString("utf8", 0, Math.min(chunk.length, 256));
		if (preview.startsWith("--")) {
			const boundary = preview
				.split(/\r?\n/, 1)[0]
				.replace(/^--/, "")
				.trim();
			if (boundary) {
				req.headers["content-type"] =
					`multipart/form-data; boundary=${boundary}`;
			}
		}
		req.unshift(chunk);
		next();
		req.resume();
	};

	req.once("data", onData);
	req.once("end", onEnd);
}
