import {
  EMAIL_REGEX,
  EXPERIENCE_REGEX,
  PHONE_REGEX
} from "../src/modules/ingestion/utils/regex";

describe("resume regex utilities", () => {
  it("matches email addresses", () => {
    expect("Contact rajesh@example.com".match(EMAIL_REGEX)?.[0]).toBe(
      "rajesh@example.com"
    );
  });

  it("matches Indian phone numbers", () => {
    expect("Call +91 9876543210".match(PHONE_REGEX)?.[0]).toBe(
      "+91 9876543210"
    );
  });

  it("extracts numeric experience from plus-years text", () => {
    const match = "13+ years of experience".match(EXPERIENCE_REGEX);

    expect(match?.[1]).toBe("13");
  });
});