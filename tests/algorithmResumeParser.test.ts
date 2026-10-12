import { AlgorithmResumeParser } from "../src/modules/ingestion/services/AlgorithmResumeParser";

describe("algorithm resume parser", () => {
  it("extracts supported resume fields without an LLM", () => {
    const parser = new AlgorithmResumeParser();
    const result = parser.parseResume(`
      Rajesh Mohan Kumar
      Test Architect & Senior Agentic Test Engineer
      Testleaf Software Solutions Private Limited
      13+ years of experience
      B.Tech - Information Technology
      Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval and MCP (Model Context Protocol)
    `);

    expect(result.name).toBe("Rajesh Mohan Kumar");
    expect(result.role).toBe("Test Architect & Senior Agentic Test Engineer");
    expect(result.company).toBe("Testleaf Software Solutions Private Limited");
    expect(result.education).toBe("B.Tech - Information Technology");
    expect(result.totalExperience).toBe(13);
    expect(result.skills).toEqual([
      "Selenium WebDriver",
      "Core Java",
      "C#",
      "Python",
      "REST Assured",
      "Postman",
      "RAG",
      "DeepEval",
      "MCP (Model Context Protocol)"
    ]);
  });

  it("does not invent unsupported values", () => {
    const result = new AlgorithmResumeParser().parseResume("Jordan Example");

    expect(result).toEqual({
      name: "Jordan Example",
      skills: []
    });
  });

  it("does not use labels or section headings as candidate fields", () => {
    const result = new AlgorithmResumeParser().parseResume(`
      CURRICULUM VITAE
      Name: Anita Sharma
      Email: anita@example.com
      Phone: +919876543210
      Senior QA Engineer
      Acme Technologies Private Limited
      Professional Experience
      8 years of experience
      Education
      M.Tech - Computer Science
      Skills
      Java, Selenium, API Testing
    `);

    expect(result.name).toBe("Anita Sharma");
    expect(result.role).toBe("Senior QA Engineer");
    expect(result.company).toBe("Acme Technologies Private Limited");
    expect(result.education).toBe("M.Tech - Computer Science");
    expect(result.totalExperience).toBe(8);
  });
});