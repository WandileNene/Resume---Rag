import { validateParsedResume } from "../src/modules/ingestion/services/LLMResumeParser";

describe("LLM resume parser schema validation", () => {
  it("accepts the supported parsed resume shape", () => {
    expect(
      validateParsedResume({
        name: "Jordan Example",
        totalExperience: 5,
        skills: ["Python"]
      })
    ).toBe(true);
  });

  it("rejects invalid field types", () => {
    expect(
      validateParsedResume({
        name: 42,
        skills: ["Python"]
      })
    ).toBe(false);
  });
});