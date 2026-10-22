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

export type IncidentReportEmailParams = {
	headerText?: string;
	reference?: string;
	severity: string;
	incidentType: string;
	ongoing: string;
	name: string;
	organization: string;
	phone: string;
	email: string;
	detectedAt?: string;
	affectedSystems?: string;
	description: string;
};

function Row({ label, value }: { label: string; value?: string }) {
	if (!value) return null;
	return (
		<Text className="text-base my-1">
			<span className="text-[#667085]">{label}</span>
			<br />
			<span className="text-[#101828]">{value}</span>
		</Text>
	);
}

export default function IncidentReportToSupport(
	params: IncidentReportEmailParams,
) {
	const { headerText = "New incident report", description } = params;

	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Body style={main} className="pb-12">
					<Container style={container}>
						<Header headerText={headerText} />

						<Section className="pt-2 px-8 text-[#485467]">
							<Text className="text-base">
								A visitor submitted an incident report from the
								website. Reply to this email to reach them.
							</Text>

							<Section className="bg-[#F7F8FD] rounded-lg px-4 py-2 my-4">
								<Row
									label="Incident reference"
									value={params.reference}
								/>
								<Row label="Severity" value={params.severity} />
								<Row
									label="Incident type"
									value={params.incidentType}
								/>
								<Row label="Ongoing" value={params.ongoing} />
								<Row label="Name" value={params.name} />
								<Row
									label="Organization"
									value={params.organization}
								/>
								<Row label="Phone" value={params.phone} />
								<Row label="Email" value={params.email} />
								<Row
									label="Detected"
									value={params.detectedAt}
								/>
								<Row
									label="Affected systems"
									value={params.affectedSystems}
								/>
							</Section>

							<Text className="text-base font-bold text-[#101828]">
								What happened
							</Text>
							<Text className="text-base whitespace-pre-wrap text-[#101828]">
								{description}
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
	margin: "0 auto",
	padding: "20px 0 48px",
	width: "580px",
	maxWidth: "100%",
};
