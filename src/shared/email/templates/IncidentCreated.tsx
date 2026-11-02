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

export default function IncidentCreated(params: {
	firstName: string;
	reference: string;
	incidentType: string;
	severity: string;
	organization?: string;
	headerText?: string;
}) {
	const {
		firstName,
		reference,
		incidentType,
		severity,
		organization,
		headerText = "Incident created",
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
								Hello {firstName},
							</Text>
							<Text className="text-base">
								An incident has been created on your iRES
								account. Our incident response team will review
								the details.
							</Text>
							<Text className="text-base">
								Reference: {reference}
								<br />
								Severity: {severity}
								<br />
								Type: {incidentType}
								{organization ? (
									<>
										<br />
										Organization: {organization}
									</>
								) : null}
							</Text>
							<Text className="text-base">
								Keep this reference for future communication.
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
