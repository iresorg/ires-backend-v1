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

type AccountWelcomeParams = {
  headerText?: string;
  userName: string;
  accountType: "individual" | "organization";
  loginUrl?: string;
};

export default function AccountWelcome(params: AccountWelcomeParams) {
  const {
    headerText = "Welcome to iRes",
    userName,
    accountType,
    loginUrl = `${process.env.PUBLIC_FRONTEND_URL}/login`,
  } = params;

  const accountTypeText =
    accountType === "individual" ? "Individual" : "Organization";

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header headerText={headerText} />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base">
                Welcome to iRes, {userName}! Your{" "}
                {accountTypeText.toLowerCase()} account has been successfully
                verified and activated.
              </Text>

              <Text className="text-base mt-4">
                You can now access all the features available to{" "}
                {accountTypeText.toLowerCase()} accounts, including:
              </Text>

              <div className="mt-4">
                {accountType === "individual" ? (
                  <ul className="list-disc list-inside text-base space-y-2">
                    <li>Submit support tickets</li>
                    <li>Track ticket progress</li>
                    <li>Communicate with our support team</li>
                    <li>Access your account dashboard</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside text-base space-y-2">
                    <li>Submit support tickets for your organization</li>
                    <li>Manage multiple users and departments</li>
                    <li>Track organizational ticket metrics</li>
                    <li>Access priority support channels</li>
                  </ul>
                )}
              </div>

              <div className="text-center mt-6">
                <Button
                  href={loginUrl}
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
                  Access Your Account
                </Button>
              </div>

              <Text className="text-sm text-[#6b7280] mt-6">
                If you have any questions or need assistance, please don't
                hesitate to contact our support team.
              </Text>

              <Text className="text-xs text-[#9CA3AF] mt-4">
                If the button doesn't work, copy and paste this link into your
                browser:
                <br />
                {loginUrl}
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
