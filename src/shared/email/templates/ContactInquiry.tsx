import * as React from "react";
import {
	Body,
	Container,
	Head,
	Html,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import Footer from "./components/Footer";
import Header from "./components/Header";

export type ContactInquiryParams = {
	headerText?: string;
	name: string;
	email: string;
	phone: string;
	subject: string;
	message: string;
};

export default function ContactInquiry(params: ContactInquiryParams) {
	const {
		headerText = "New contact inquiry",
		name,
		email,
		phone,
		subject,
		message,
	} = params;

	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Body style={main} className="pb-12">
					<Container style={container}>
						<Header headerText={headerText} />

						<Section className="pt-2 px-8 text-[#485467]">
							<Text className="text-base font-bold">
								You received a new inquiry from the website.
							</Text>

							<Text className="text-base">
								<strong>Name:</strong> {name}
							</Text>
							<Text className="text-base">
								<strong>Email:</strong> {email}
							</Text>
							<Text className="text-base">
								<strong>Phone:</strong> {phone}
							</Text>
							<Text className="text-base">
								<strong>Subject:</strong> {subject}
							</Text>
							<Text className="text-base font-bold mt-4">
								Message
							</Text>
							<Text className="text-base whitespace-pre-wrap">
								{message}
							</Text>
						</Section>

						<Footer />
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

const main = {
	backgroundColor: "#f6f9fc",
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
	backgroundColor: "#ffffff",
	margin: "0 auto",
	padding: "20px 0 48px",
	marginBottom: "64px",
	maxWidth: "600px",
};
