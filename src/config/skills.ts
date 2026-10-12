export const SKILLS = [
  "Java",
  "Selenium",
  "Playwright",
  "API Testing",
  "Postman",
  "SQL",
  "Node.js",
  "Next.js",
  "React",
  "MongoDB",
  "Jenkins",
  "Python",
  "C#",
  "REST Assured",
  "Cucumber",
  "GenAI",
  "Langchain",
  "Langgraph",
  "RAG",
  "Azure DevOps",
  "AWS Lambda",
  "GitHub",
  "DeepEval",
  "CI/CD pipeline automation",
  "MCP (Model Context Protocol)"
] as const;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const detectSkills = (rawText: string): string[] => {
  return SKILLS.filter((skill) => {
    const skillRegex = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapeRegex(skill)}(?![\\p{L}\\p{N}_])`,
      "iu"
    );

    return skillRegex.test(rawText);
  });
};