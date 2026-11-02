import * as React from "react";
import {
	Body,
	Container,
	Head,
	Html,
	Link,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import Footer from "./components/Footer";
import Header from "./components/Header";

export default function IncidentAccountReady(params: {
	name: string;
	email: string;
	password: string;
	loginUrl?: string;
	headerText?: string;
}) {
	const {
		name,
		email,
		password,
		loginUrl,
		headerText = "Your iRES account is ready",
	} = params;

	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Body style={main} className="pb-12">
					<Container style={container}>
						<Header headerText={headerText} />
						<Section className="pt-2 px-8 text-[#485467]">
							<Text className="text-base font-bold text-[#101828]">
								Hello {name},
							</Text>
							<Text className="text-base">
								We created an iRES account so you can follow the
								incident you reported. Sign in with this email
								and temporary password.
							</Text>
							<Text className="text-base">
								Email
								<br />
								<span className="font-bold text-[#101828]">
									{email}
								</span>
							</Text>
							<Text className="text-base">
								Temporary password
								<br />
								<span className="font-bold text-[#101828]">
									{password}
								</span>
							</Text>
							{loginUrl ? (
								<Text className="text-base">
									<Link href={loginUrl}>{loginUrl}</Link>
								</Text>
							) : null}
							<Text className="text-base">
								You will be asked to choose a new password the
								first time you sign in.
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
	width: "100%",
	margin: "0 auto",
	backgroundColor: "#F7F8FD",
	fontFamily:
		"-apple-system,'Instrument Sans',BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,Cantarell,'Helvetica Neue',sans-serif",
};

const container = {
	maxWidth: "680px",
	width: "100%",
	margin: "0 auto",
	backgroundColor: "#FFF",
};
