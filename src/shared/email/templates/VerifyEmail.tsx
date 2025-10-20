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

type VerifyEmailParams = {
  headerText?: string;
  otp: string;
};

export default function VerifyEmail(params: VerifyEmailParams) {
  const { headerText = "Verify your email", otp } = params;
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header headerText={headerText} />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base">
                Please use the one-time code below to verify your email address.
                This code expires in 15 minutes.
              </Text>

              <div
                className="inline-block"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: 4,
                  padding: "12px 16px",
                  border: "1px solid #eee",
                  borderRadius: 8,
                }}
              >
                {otp}
              </div>

              <Text className="text-sm text-[#6b7280] mt-6">
                If you didn’t request this, you can safely ignore this email.
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
