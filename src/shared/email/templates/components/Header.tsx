import * as React from "react";
import { Section, Row, Heading, Img } from "@react-email/components";

interface Params {
  headerText: string;
}

const headerStyle = {
  background:
    "no-repeat center/100% url(https://res.cloudinary.com/dplxh8dad/image/upload/v1710023068/hirefoster-v2/assets/hf_email_header_1_blncmh.png)",
};

export default function (params: Params) {
  const { headerText } = params;

  return (
    <>
      <Section className="pt-10 pb-12 bg-[#F7F8FD]">
        <Img
          className="h-12 mx-auto"
          src="https://auxybonrcumfggtvxjpx.supabase.co/storage/v1/object/public/scrollz//Logo.svg"
        />
      </Section>

      <Section style={headerStyle} className="bg-[#1B2268] px-8 py-8">
        <Row>
          <Heading
            as="h1"
            className="font-semibold xs:text-xl sm:text-3xl text-white"
          >
            {headerText || "Lorem Ipsum Sit Dolor Amet"}
          </Heading>
        </Row>
      </Section>
    </>
  );
}
