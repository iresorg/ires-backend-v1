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
  Link,
} from "@react-email/components";
import Footer from "./components/Footer";
import Header from "./components/Header";

type PasswordResetParams = {
  headerText?: string;
  resetToken: string;
  email: string;
  resetUrl?: string;
};

export default function PasswordReset(params: PasswordResetParams) {
  const {
    headerText = "Reset your password",
    resetToken,
    email,
    resetUrl = `${process.env.PUBLIC_FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`,
  } = params;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header headerText={headerText} />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base">
                You requested to reset your password. Click the button below to
                reset your password. This link expires in 1 hour.
              </Text>

              <div className="text-center mt-6">
                <Button
                  href={resetUrl}
                  className="bg-[#3B82F6] text-white px-6 py-3 rounded-lg text-base font-medium no-underline"
                  style={{
                    backgroundColor: "#3B82F6",
                    color: "#FFFFFF",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "500",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  Reset Password
                </Button>
              </div>

              <Text className="text-sm text-[#6b7280] mt-6 text-center">
                Or click this link to reset your password:
              </Text>

              <Text className="text-sm mt-2 text-center">
                <Link
                  href={resetUrl}
                  className="text-[#3B82F6] underline break-all"
                  style={{
                    color: "#3B82F6",
                    textDecoration: "underline",
                    wordBreak: "break-all",
                  }}
                >
                  {resetUrl}
                </Link>
              </Text>

              <Text className="text-xs text-[#9CA3AF] mt-6">
                If you didn't request this password reset, you can safely ignore
                this email. Your password will not be changed.
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
