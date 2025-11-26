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

type SubscriptionActivatedParams = {
  userName: string;
  planName: string;
  billingDate: string;
  loginUrl?: string;
};

export default function SubscriptionActivated(
  params: SubscriptionActivatedParams,
) {
  const { userName, planName, billingDate } = params;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header headerText="Subscription Activated" />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base">Hello {userName},</Text>

              <Text className="text-base mt-4">
                Great news! Your subscription to <strong>{planName}</strong> has
                been successfully activated.
              </Text>

              <Text className="text-base mt-4">
                You now have full access to all features included in your plan.
              </Text>

              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <Text className="text-sm font-semibold mb-2">
                  Subscription Details:
                </Text>
                <Text className="text-sm">Plan: {planName}</Text>
                <Text className="text-sm">
                  Next billing date: {billingDate}
                </Text>
              </div>

              <Text className="text-sm text-[#6b7280] mt-6">
                If you have any questions about your subscription, please
                contact our support team.
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
