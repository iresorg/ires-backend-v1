import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Tailwind,
  Text,
  Button,
} from "@react-email/components";
import Footer from "./components/Footer";
import Header from "./components/Header";

type SubscriptionEndedParams = {
  userName: string;
  planName: string;
  renewUrl?: string;
};

export default function SubscriptionEnded(params: SubscriptionEndedParams) {
  const {
    userName,
    planName,
    renewUrl = `${process.env.PUBLIC_FRONTEND_URL}/subscription`,
  } = params;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header headerText="Subscription Expired" />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base">Hello {userName},</Text>

              <Text className="text-base mt-4">
                Your subscription to <strong>{planName}</strong> has expired.
              </Text>

              <Text className="text-base mt-4">
                We're sorry to see you go. You can reactivate your subscription
                at any time to regain access to all features.
              </Text>

              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <Text className="text-sm font-semibold mb-2">
                  What You Miss:
                </Text>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                  <li>Priority support</li>
                  <li>Advanced features</li>
                  <li>Regular updates</li>
                  <li>Access to premium tools</li>
                </ul>
              </div>

              <div className="text-center mt-6">
                <Button
                  href={renewUrl}
                  className="bg-[#3B82F6] text-white px-6 py-3 rounded-lg text-base font-medium no-underline"
                >
                  Renew Subscription
                </Button>
              </div>

              <Text className="text-sm text-[#6b7280] mt-6">
                Thank you for being with us. We hope to see you back soon!
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
