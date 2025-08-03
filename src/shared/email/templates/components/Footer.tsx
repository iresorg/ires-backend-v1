import * as React from "react";
import { Link, Text, Section, Row, Column, Hr } from "@react-email/components";

export default () => (
  <Section className="pt-4 pb-10 px-2 text-center">
    <Hr className="pt-4" />

    <Row>
      <Text className="text-gray-500 text-xs text-center my-0">
        Address here
      </Text>
    </Row>

    <Row className="my-0">
      <Text className="text-gray-500 text-xs text-center mt-1.5 mb-0">
        Email: <Link href="mailto:support@ires.co">support@ires.co</Link>
      </Text>
    </Row>

    <Row className="my-0">
      <Column className="inline pr-2">
        <Text className="inline">
          <Link href="https://ng.linkedin.com/company/ires" className="text-xs">
            LinkedIn
          </Link>
        </Text>
      </Column>
      <Column className="inline ">
        <Text className="inline">
          <Link href="https://www.instagram.com/iRes" className="text-xs">
            Instagram
          </Link>
        </Text>
      </Column>
      <Column className="inline pl-2">
        <Text className="inline">
          <Link href="https://twitter.com/iRes" className="text-xs">
            Twitter
          </Link>
        </Text>
      </Column>
    </Row>

    <Row>
      <Text className="text-gray-500 text-xs text-center my-0">
        © {new Date().getFullYear()}. All rights reserved.{" "}
        <Link href="https://ires.co">iRes</Link>.
      </Text>
    </Row>
  </Section>
);
