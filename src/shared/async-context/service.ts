import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { RequestContext } from "./interface";

@Injectable()
export class AsyncContextService {
	private readonly context = new AsyncLocalStorage<RequestContext>();

	run<T>(context: RequestContext, callback: () => T): T {
		return this.context.run(context, callback);
	}

	getContext(): RequestContext | undefined {
		return this.context.getStore();
	}

	get<T>(key: keyof RequestContext): T | undefined {
		const ctx = this.getContext();
		if (!ctx) return undefined;
		return ctx[key] as T;
	}

	set<T>(key: keyof RequestContext, value: T) {
		const ctx = this.getContext();
		if (ctx) {
			ctx[key] = value;
		}
	}

	getRequestId(): string {
		return this.get("requestId");
	}

	getUserId(): string | undefined {
		return this.get("userId");
	}
}
