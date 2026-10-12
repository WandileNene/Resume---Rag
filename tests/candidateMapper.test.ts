import { buildSnippet, attachSnippet } from "../src/modules/retrieval/utils/candidateMapper";
import type { CandidateSnippet, MergedCandidate } from "../src/modules/retrieval/types/retrieval.types";

// Minimal CandidateSnippet factory
const makeSnippet = (overrides: Partial<CandidateSnippet> = {}): CandidateSnippet => ({
  resumeId: "resume-1",
  name: "Rajesh Mohan Kumar",
  role: "Test Architect & Senior Agentic Test Engineer",
  company: "Testleaf Software Solutions Private Limited",
  skills: ["RAG", "DeepEval", "MCP (Model Context Protocol)"],
  rawText: "Experienced test architect with 13 years in enterprise QA, agentic systems, and LLM evaluation.",
  ...overrides
});

// Minimal MergedCandidate factory
const makeMerged = (overrides: Partial<MergedCandidate> = {}): MergedCandidate => ({
  resumeId: "resume-1",
  skills: ["RAG"],
  sources: ["bm25"],
  snippet: "",
  ...overrides
});

describe("buildSnippet", () => {
  it("includes name, role, company, skills, and rawText in the output", () => {
    const snippet = buildSnippet(makeSnippet());

    expect(snippet).toContain("Rajesh Mohan Kumar");
    expect(snippet).toContain("Test Architect");
    expect(snippet).toContain("Testleaf");
    expect(snippet).toContain("RAG");
    expect(snippet).toContain("DeepEval");
  });

  it("includes experienceSummary when present", () => {
    const snippet = buildSnippet(
      makeSnippet({ experienceSummary: "13 years of enterprise automation and GenAI." })
    );
    expect(snippet).toContain("13 years of enterprise automation");
  });

  it("does not include a Summary line when experienceSummary is absent", () => {
    const snippet = buildSnippet(makeSnippet({ experienceSummary: undefined }));
    expect(snippet).not.toContain("Summary:");
  });

  it("truncates rawText to 800 characters and appends an ellipsis", () => {
    const longRaw = "x".repeat(900);
    const snippet = buildSnippet(makeSnippet({ rawText: longRaw }));

    // The Resume: line should contain at most 800 chars of rawText plus "…"
    const resumeLine = snippet.split("\n").find((l) => l.startsWith("Resume:"))!;
    expect(resumeLine).toContain("…");
    // The raw portion before "…" must be exactly 800 chars
    const rawPart = resumeLine.replace("Resume: ", "").replace("…", "");
    expect(rawPart.length).toBe(800);
  });

  it("does not truncate rawText that is exactly 800 characters", () => {
    const exactRaw = "y".repeat(800);
    const snippet = buildSnippet(makeSnippet({ rawText: exactRaw }));
    const resumeLine = snippet.split("\n").find((l) => l.startsWith("Resume:"))!;
    expect(resumeLine).not.toContain("…");
  });

  it("does not append a Resume line when rawText is empty", () => {
    const snippet = buildSnippet(makeSnippet({ rawText: "" }));
    expect(snippet).not.toContain("Resume:");
  });

  it("returns a non-empty string even when all optional fields are absent", () => {
    const snippet = buildSnippet({
      resumeId: "resume-x",
      name: undefined,
      role: undefined,
      company: undefined,
      skills: [],
      rawText: "Some resume content"
    });
    expect(snippet.length).toBeGreaterThan(0);
  });

  it("uses only rawText when no structured fields are present", () => {
    const snippet = buildSnippet({
      resumeId: "resume-x",
      name: undefined,
      role: undefined,
      company: undefined,
      skills: [],
      rawText: "Only raw content here"
    });
    expect(snippet).toContain("Only raw content here");
  });

  it("formats skills as a comma-separated list", () => {
    const snippet = buildSnippet(makeSnippet({ skills: ["Python", "RAG", "DeepEval"] }));
    expect(snippet).toContain("Python, RAG, DeepEval");
  });
});

describe("attachSnippet", () => {
  it("returns a new object with snippet populated from buildSnippet", () => {
    const merged = makeMerged();
    const source = makeSnippet();

    const result = attachSnippet(merged, source);

    expect(result.snippet.length).toBeGreaterThan(0);
    expect(result.snippet).toContain("Rajesh Mohan Kumar");
  });

  it("does not mutate the original merged candidate", () => {
    const merged = makeMerged({ snippet: "" });
    const source = makeSnippet();

    attachSnippet(merged, source);

    expect(merged.snippet).toBe("");
  });

  it("preserves all other fields from the merged candidate", () => {
    const merged = makeMerged({
      resumeId: "resume-42",
      bm25Score: 7.5,
      vectorScore: 0.91,
      sources: ["bm25", "vector"]
    });
    const result = attachSnippet(merged, makeSnippet());

    expect(result.resumeId).toBe("resume-42");
    expect(result.bm25Score).toBe(7.5);
    expect(result.vectorScore).toBe(0.91);
    expect(result.sources).toEqual(["bm25", "vector"]);
  });
});
