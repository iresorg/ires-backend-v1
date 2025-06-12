import { AuthPayload } from "@/modules/auth/interfaces/auth";
import { Request } from "express";

export interface AuthRequest extends Request {
	user: AuthPayload;
}

