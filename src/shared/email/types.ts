import { templates } from "../queue/consumers/email.consumer";

export interface EmailPayload<T = TemplateName> {
	from: string;
	to: string | string[];
	subject: string;
	template: T;
	options: T extends TemplateName
		? TemplateProps<T>
		: Record<string, unknown>;
}

export type TemplateName = keyof typeof templates;
export type TemplateProps<T extends TemplateName> = Parameters<
	(typeof templates)[T]
>[0];
export type EmailComponent = (
	props: TemplateProps<TemplateName>,
) => React.JSX.Element;
