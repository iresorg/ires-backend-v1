import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Text,
  Section,
  Tailwind,
} from "@react-email/components";
import Footer from "./components/Footer";
import Header from "./components/Header";

export interface TicketEscalateParams {
  headerText: string;
  ticketId: string;
  subject: string;
  escalatedBy: string;
  escalationReason: string;
  timestamp: string;
}

export default (params: TicketEscalateParams) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header {...params} />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base font-bold ">Hello Admin,</Text>

              <Text className="text-base">
                A ticket has been escalated and requires attention.
              </Text>

              <Section className="pt-2 px-8 text-[#485467]">
                <Text className="text-base ">Ticket Details:</Text>
                <ul>
                  <li className="mb-2">
                    <b>Ticket ID:</b> {params.ticketId}
                  </li>
                  <li className="mb-2">
                    <b>Subject:</b> {params.subject}
                  </li>
                  <li className="mb-2">
                    <b>Escalated By:</b> {params.escalatedBy}
                  </li>
                  <li className="mb-2">
                    <b>Escalation Reason:</b> {params.escalationReason}
                  </li>
                  <li className="mb-2">
                    <b>Timestamp:</b> {params.timestamp}
                  </li>
                </ul>
              </Section>

              <Text className="text-base">
                Please review and take the necessary action as soon as possible.
              </Text>
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
  maxWidth: "680px",
  width: "100%",
  margin: "0 auto",
  backgroundColor: "#FFF",
};
