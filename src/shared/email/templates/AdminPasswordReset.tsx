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

export interface AdminPasswordResetParams {
	userName: string;
	headerText?: string;
	password: string;
}

export default function AdminPasswordReset(params: AdminPasswordResetParams) {
	const { userName, password, headerText = "Your password was reset" } = params;

	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Body style={main} className="pb-12">
					<Container style={container}>
						<Header headerText={headerText} />

						<Section className="pt-2 px-8 text-[#485467]">
							<Text className="text-base font-bold text-[#101828]">
								Hello {userName || "there"},
							</Text>
							<Text className="text-base">
								An administrator reset your iRES password. Use
								the temporary password below to sign in.
							</Text>
							<Text className="text-lg mt-0 font-bold text-[#101828]">
								{password}
							</Text>
							<Text className="text-base">
								This password is temporary. Change it
								immediately after you sign in. Any sessions
								that were already open have been signed out.
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
