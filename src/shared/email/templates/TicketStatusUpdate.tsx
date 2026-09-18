import * as React from "react";
import {
	Body,
	Container,
	Head,
	Html,
	Text,
	Section,
	Tailwind,
	Button,
} from "@react-email/components";
import Footer from "./components/Footer";
import Header from "./components/Header";

export interface TicketStatusUpdateParams {
	headerText: string;
	greetingName: string;
	intro: string;
	ticketId: string;
	title: string;
	status: string;
	details?: string;
	link?: string;
}

export default (params: TicketStatusUpdateParams) => {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Body style={main} className="pb-12">
					<Container style={container}>
						<Header {...params} />

						<Section className="pt-2 px-8 text-[#485467]">
							<Text className="text-base font-bold ">
								Hello {params.greetingName},
							</Text>

							<Text className="text-base">{params.intro}</Text>

							<Text className="text-base">
								<b>Ticket ID</b>: {params.ticketId}
								<br />
								<b>Subject</b>: {params.title}
								<br />
								<b>Status</b>: {params.status}
							</Text>

							{params.details ? (
								<Text className="text-base">{params.details}</Text>
							) : null}

							{params.link ? (
								<Section className="text-center">
									<Button
										className="bg-[#0C0E5D] rounded-lg px-[18px] py-3 text-white font-semibold"
										href={params.link}
									>
										View Ticket
									</Button>
								</Section>
							) : null}
						</Section>

						<Footer />
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

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
