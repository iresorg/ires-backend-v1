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

export default function IncidentAssigned(params: {
	agentName: string;
	reference: string;
	severity: string;
	incidentType: string;
	organization?: string;
	customerEmail: string;
	headerText?: string;
}) {
	const {
		agentName,
		reference,
		severity,
		incidentType,
		organization,
		customerEmail,
		headerText = "Incident assigned to you",
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
								Hello {agentName},
							</Text>
							<Text className="text-base">
								An incident has been assigned to you to monitor.
								Open the Incidents tab on the staff dashboard.
							</Text>
							<Text className="text-base">
								Reference: {reference}
								<br />
								Severity: {severity}
								<br />
								Type: {incidentType}
								<br />
								{organization ? (
									<>
										Organization: {organization}
										<br />
									</>
								) : null}
								Customer email: {customerEmail}
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
