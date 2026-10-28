import * as React from "react";
import { Section, Row, Column, Heading, Img } from "@react-email/components";

interface Params {
  headerText: string;
}

const LOGO_SRC =
  "https://res.cloudinary.com/dlfiul9k2/image/upload/f_png,w_480/v1792679383/ires-logo_ohffrt.svg";

const bannerStyle = {
  backgroundColor: "#1B2268",
  backgroundImage:
    "url(https://res.cloudinary.com/dplxh8dad/image/upload/v1710023068/hirefoster-v2/assets/hf_email_header_1_blncmh.png)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "cover",
};

export default function (params: Params) {
  const { headerText } = params;

  return (
    <>
      <Section
        style={{ backgroundColor: "#1B2268" }}
        className="bg-[#1B2268]"
      >
        <Row>
          <Column align="center" style={{ padding: "28px 24px 22px" }}>
            <Img
              src={LOGO_SRC}
              width="156"
              height="111"
              alt="iRES"
              style={{
                display: "block",
                margin: "0 auto",
                width: "156px",
                height: "auto",
                border: "0",
                outline: "none",
              }}
            />
          </Column>
        </Row>
      </Section>

      <Section style={bannerStyle} className="bg-[#1B2268] px-8 py-8">
        <Row>
          <Column>
            <Heading
              as="h1"
              className="font-semibold text-white"
              style={{
                color: "#ffffff",
                fontSize: "28px",
                lineHeight: "36px",
                fontWeight: 600,
                margin: "0",
              }}
            >
              {headerText || "iRES"}
            </Heading>
          </Column>
        </Row>
      </Section>
    </>
  );
}
