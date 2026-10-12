import { detectSkills } from "../src/config/skills";

describe("resume skill detection", () => {
  it("detects the documented skills in dictionary order", () => {
    const rawText =
      "Experienced in Selenium WebDriver, Python, RAG, DeepEval and MCP (Model Context Protocol).";

    expect(detectSkills(rawText)).toEqual([
      "Selenium",
      "Python",
      "RAG",
      "DeepEval",
      "MCP (Model Context Protocol)"
    ]);
  });

  it("does not match skills inside larger words", () => {
    expect(detectSkills("JavaScript and pythonista experience")).toEqual([]);
  });
});