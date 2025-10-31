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

type SubscriptionCancelledParams = {
  userName: string;
  planName: string;
  endDate: string;
  reactivateUrl?: string;
};

export default function SubscriptionCancelled(
  params: SubscriptionCancelledParams,
) {
  const { userName, planName, endDate } = params;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header headerText="Subscription Cancelled" />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base">Hello {userName},</Text>

              <Text className="text-base mt-4">
                Your subscription to <strong>{planName}</strong> has been
                cancelled.
              </Text>

              <Text className="text-base mt-4">
                You will continue to have access to all features until {endDate}
                . After this date, your subscription will expire.
              </Text>

              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <Text className="text-sm font-semibold mb-2">
                  Subscription Details:
                </Text>
                <Text className="text-sm">Plan: {planName}</Text>
                <Text className="text-sm">Access until: {endDate}</Text>
              </div>

              <Text className="text-base mt-6">
                If you change your mind, you can reactivate your subscription
                before it expires.
              </Text>

              <Text className="text-sm text-[#6b7280] mt-6">
                We're sorry to see you go. If you have any feedback, please
                don't hesitate to reach out.
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
