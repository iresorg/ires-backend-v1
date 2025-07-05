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
import { Role } from "@/modules/users/enums/role.enum";

export interface NewTicketParams {
  ticketId: string;
  link: string;
  title: string;
  headerText: string;
  descriptionn: string;
  createdAt: string;
  submittedBy: {
    role: Role;
    name?: string;
  };
}

export default (params: NewTicketParams) => {
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
                A new ticket has been submitted and requires your attention.
                Below are the ticket details:
              </Text>

              <Text className="text-base">
                <b>Ticket ID</b>: {params.ticketId} <br></br>
                <b>Subject</b>: {params.title} <br />
                <b>Submitted At</b>: {params.createdAt}
              </Text>
              <Text className="text-base">
                You can view and take acction on this ticket by clicking the
                link below.
              </Text>
              <Section className="text-center">
                <Button
                  className="bg-[#0C0E5D] rounded-lg px-[18px] py-3 text-white font-semibold"
                  href={params.link}
                >
                  View Ticket
                </Button>
              </Section>
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
