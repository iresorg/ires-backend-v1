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

export interface UserSignUpParams {
  userName: string;
  headerText: string;
  password: string;
}

export default (params: UserSignUpParams) => {
  const { password } = params;

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body style={main} className="pb-12">
          <Container style={container}>
            <Header {...params} />

            <Section className="pt-2 px-8 text-[#485467]">
              <Text className="text-base font-bold ">
                Hello {params.userName ?? "User!"},
              </Text>

              <Text className="text-base">
                You have been added to the iRes workspace. Please use the
                temporary password to login.
              </Text>

              <Text className="text-base">
                Here is your temporary password.
              </Text>

              <Text className="text-lg mt-0 font-bold">{password}</Text>
              <Text className="text-base">
                This is temporary, please change it immediately after login.
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
