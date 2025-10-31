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

type PaymentFailedParams = {
  userName: string;
  planName: string;
};

export default function PaymentFailed(params: PaymentFailedParams) {
  const { userName, planName } = params;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header headerText="Payment Failed" />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base">Hello {userName},</Text>

              <Text className="text-base mt-4">
                We were unable to process the payment for your{" "}
                <strong>{planName}</strong> subscription.
              </Text>

              <Text className="text-base mt-4">
                This could be due to an expired card, insufficient funds, or
                other payment issues.
              </Text>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <Text className="text-sm font-semibold mb-2 text-yellow-800">
                  Action Required:
                </Text>
                <Text className="text-sm text-yellow-700">
                  Please update your payment method to continue enjoying
                  uninterrupted access to your subscription.
                </Text>
              </div>

              <Text className="text-sm text-[#6b7280] mt-6">
                If you need assistance or have questions about your payment,
                please contact our support team.
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
