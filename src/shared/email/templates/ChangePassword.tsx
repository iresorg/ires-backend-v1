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

export interface InitiateResetPasswordParams {
  greeting: string;
  headerText: string;
  setPasswordUrl: string;
  validUntil: string;
}

export default (params: InitiateResetPasswordParams) => {
  const { setPasswordUrl, validUntil } = params;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header {...params} />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base font-bold ">
                {params.greeting ?? "Hello World!"}
              </Text>

              <Text className="text-base">
                We received a request on your email address to reset your
                password.
              </Text>

              <Text className="text-base">
                We are sorry that you cannot sign in because you forgot your
                password. It's okay. These things happen.
              </Text>

              <Text className="text-base">
                Kindly click on the 'Set New Password' button below to set your
                new password. The link in the button is valid until{" "}
                <span className="font-bold">
                  {validUntil ?? "23-04-2022 12:09 PM"}.
                </span>
              </Text>

              <Text className="text-base">Cheers!</Text>
            </Section>

            <Section className="px-8 text-[#485467]">
              <Text className="text-sm">
                If you did not initiate a request to reset your password by
                yourself, please ignore this mail.
              </Text>
            </Section>

            <Section className="text-center py-4">
              <Button
                href={setPasswordUrl || "https://google.com"}
                className="rounded-full bg-[#4653CD] font-semibold text-white px-8 py-4 text-base text-center"
              >
                Set New Password
              </Button>
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
