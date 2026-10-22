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

export type IncidentReportConfirmationParams = {
	headerText?: string;
	firstName: string;
	reference: string;
	organization: string;
	incidentType: string;
	severity: string;
	ongoing: string;
	reportedAt: string;
	website?: string;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
	return (
		<Text className="text-base my-1">
			<span className="text-[#667085]">{label}</span>
			<br />
			<span className="text-[#101828]">{value}</span>
		</Text>
	);
}

export default function IncidentReportConfirmation(
	params: IncidentReportConfirmationParams,
) {
	const {
		headerText = "We received your report",
		firstName,
		reference,
		website = "https://iresorg.com",
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
								Hi {firstName},
							</Text>
							<Text className="text-base">
								Thank you for reporting this incident to iRES.
							</Text>
							<Text className="text-base">
								We understand that cybersecurity incidents can
								be stressful, especially when business
								operations or sensitive information may be at
								risk.
							</Text>
							<Text className="text-base">
								Your report has been successfully received, and
								our incident response team will review the
								details you provided.
							</Text>

							<Text className="text-base font-bold text-[#101828]">
								Your incident summary
							</Text>
							<Section className="bg-[#F7F8FD] rounded-lg px-4 py-2 my-2">
								<SummaryRow
									label="Incident reference"
									value={reference}
								/>
								<SummaryRow
									label="Organization"
									value={params.organization}
								/>
								<SummaryRow
									label="Incident type"
									value={params.incidentType}
								/>
								<SummaryRow
									label="Reported severity"
									value={params.severity}
								/>
								<SummaryRow
									label="Incident status"
									value={params.ongoing}
								/>
								<SummaryRow
									label="Date reported"
									value={params.reportedAt}
								/>
							</Section>
							<Text className="text-base">
								Please keep your incident reference handy for
								future communication.
							</Text>

							<Text className="text-base font-bold text-[#101828]">
								What happens next?
							</Text>
							<Text className="text-base">
								<strong>1. Initial assessment.</strong> Our
								team will evaluate your report to understand
								the nature, severity, and potential impact of
								the incident.
							</Text>
							<Text className="text-base">
								<strong>2. Response coordination.</strong> Based
								on our assessment, an iRES representative may
								contact you using the phone number or email
								address you provided to request additional
								information or discuss the appropriate next
								steps.
							</Text>
							<Text className="text-base">
								<strong>3. Guidance and support.</strong> Where
								appropriate, our team will provide
								recommendations to help contain the incident,
								preserve evidence, and determine the next
								course of action.
							</Text>

							<Text className="text-base font-bold text-[#101828]">
								Important: what you can do right now
							</Text>
							<Text className="text-base">
								While your report is being reviewed, we
								recommend the following precautions:
							</Text>
							<Text className="text-base">
								• Isolate affected systems. If safe and
								operationally appropriate, disconnect
								compromised devices from the network to prevent
								further spread.
								<br />
								• Preserve evidence. Avoid deleting suspicious
								files, emails, system logs, or messages that
								may help with an investigation.
								<br />
								• Avoid unnecessary changes. Do not reset,
								reinstall, or power off affected systems unless
								required for immediate safety or advised by a
								qualified responder.
								<br />• Protect your credentials. Never share
								passwords, recovery codes, or one-time
								passwords by email.
							</Text>
							<Text className="text-base">
								If the situation changes significantly, please
								contact our response team and reference{" "}
								{reference}.
							</Text>

							<Text className="text-base font-bold text-[#101828]">
								We&apos;re here to help
							</Text>
							<Text className="text-base">
								At iRES, we believe that responding to cyber
								threats starts with timely action, clear
								communication, and the right expertise.
							</Text>
							<Text className="text-base">
								Thank you for trusting us with your report.
							</Text>
							<Text className="text-base">
								Stay safe,
								<br />
								iRES Incident Response Team
								<br />
								Cybersecurity. Resilience. Trust.
								<br />
								<Link href={website}>{website}</Link>
							</Text>
							<Text className="text-xs text-[#667085]">
								This is an automated acknowledgment confirming
								receipt of your report. It does not indicate
								that an investigation has been completed or
								that the incident has been resolved.
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
