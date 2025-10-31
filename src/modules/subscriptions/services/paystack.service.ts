import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as crypto from "crypto";

@Injectable()
export class PaystackService {
	private readonly baseURL = "https://api.paystack.co";
	private readonly secretKey: string;

	constructor(private readonly config: ConfigService) {
		this.secretKey = this.config.get<string>("PAYSTACK_SECRET_KEY") || "";
	}

	private getHeaders() {
		return {
			Authorization: `Bearer ${this.secretKey}`,
			"Content-Type": "application/json",
		};
	}

	async initializeTransaction(data: {
		email: string;
		amount: number;
		plan?: string;
		callback_url: string;
		metadata?: Record<string, any>;
	}) {
		try {
			const response = await axios.post(
				`${this.baseURL}/transaction/initialize`,
				data,
				{ headers: this.getHeaders() },
			);
			return response.data;
		} catch (error: any) {
			throw new Error(
				`Paystack error: ${error.response?.data?.message || error.message}`,
			);
		}
	}

	async verifyTransaction(reference: string) {
		try {
			const response = await axios.get(
				`${this.baseURL}/transaction/verify/${reference}`,
				{ headers: this.getHeaders() },
			);
			return response.data;
		} catch (error: any) {
			throw new Error(
				`Paystack verification error: ${error.response?.data?.message || error.message}`,
			);
		}
	}

	async createCustomer(data: {
		email: string;
		first_name: string;
		last_name: string;
		phone?: string;
		metadata?: Record<string, any>;
	}) {
		try {
			const response = await axios.post(
				`${this.baseURL}/customer`,
				data,
				{ headers: this.getHeaders() },
			);
			return response.data;
		} catch (error: any) {
			throw new Error(
				`Paystack customer creation error: ${error.response?.data?.message || error.message}`,
			);
		}
	}

	async createSubscription(data: {
		customer: string;
		plan: string;
		authorization?: string;
	}) {
		try {
			const response = await axios.post(
				`${this.baseURL}/subscription`,
				data,
				{ headers: this.getHeaders() },
			);
			return response.data;
		} catch (error: any) {
			throw new Error(
				`Paystack subscription error: ${error.response?.data?.message || error.message}`,
			);
		}
	}

	async disableSubscription(code: string, token: string) {
		try {
			const response = await axios.post(
				`${this.baseURL}/subscription/disable`,
				{
					code,
					token,
				},
				{ headers: this.getHeaders() },
			);
			return response.data;
		} catch (error: any) {
			throw new Error(
				`Paystack disable subscription error: ${error.response?.data?.message || error.message}`,
			);
		}
	}

	async enableSubscription(code: string, token: string) {
		try {
			const response = await axios.post(
				`${this.baseURL}/subscription/enable`,
				{
					code,
					token,
				},
				{ headers: this.getHeaders() },
			);
			return response.data;
		} catch (error: any) {
			throw new Error(
				`Paystack enable subscription error: ${error.response?.data?.message || error.message}`,
			);
		}
	}

	verifyWebhookSignature(payload: string, signature: string): boolean {
		const hash = crypto
			.createHmac("sha512", this.secretKey)
			.update(payload)
			.digest("hex");
		return hash === signature;
	}
}
