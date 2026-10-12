import { env } from "../src/config/env";
import { LLMService } from "../src/modules/retrieval/services/LLMService";

describe("LLMService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as unknown as { fetch?: jest.Mock }).fetch = undefined;
  });

  it("reranks candidates and only returns known resume IDs", async () => {
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                results: [
                  {
                    resumeId: "candidate-b",
                    rank: 1,
                    relevanceScore: 0.96,
                    reason: "Strong fit for senior QA architecture and RAG evaluation."
                  },
                  {
                    resumeId: "candidate-a",
                    rank: 2,
                    relevanceScore: 0.84,
                    reason: "Good fit for automation and governance work."
                  }
                ]
              })
            }
          }
        ]
      })
    });

    (env as { groqApiKey?: string }).groqApiKey = "test-key";
    const fetchMock = globalThis.fetch as jest.Mock;

    const service = new LLMService();
    const result = await service.rerankCandidates(
      "Need a senior QA architect experienced in RAG, DeepEval, MCP and GenAI governance",
      [
        { resumeId: "candidate-a", skills: ["QA", "API"], sources: ["bm25"], snippet: "QA automation and governance" },
        { resumeId: "candidate-b", skills: ["RAG", "DeepEval", "MCP"], sources: ["vector"], snippet: "RAG, DeepEval, MCP and enterprise governance" }
      ],
      2
    );

    expect(fetchMock).toHaveBeenCalled();
    expect(result.model).toBe(env.groqModel);
    expect(result.results.map((item) => item.resumeId)).toEqual(["candidate-b", "candidate-a"]);
    expect(new Set(result.results.map((item) => item.resumeId)).size).toBe(result.results.length);
    expect(result.results.every((item) => ["candidate-a", "candidate-b"].includes(item.resumeId))).toBe(true);
  });

  it("throws on invalid LLM JSON for reranking", async () => {
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not valid json" } }]
      })
    });
    (env as { groqApiKey?: string }).groqApiKey = "test-key";

    const service = new LLMService();

    await expect(
      service.rerankCandidates("Need an architect", [{ resumeId: "candidate-a", skills: ["QA"], sources: ["bm25"], snippet: "QA" }])
    ).rejects.toThrow("LLM rerank response was invalid");
  });

  it("surfaces the real Groq HTTP status when the upstream request fails", async () => {
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify({ error: "Unauthorized" })
    });
    (env as { groqApiKey?: string }).groqApiKey = "test-key";

    const service = new LLMService();

    await expect(
      service.rerankCandidates("Need an architect", [{ resumeId: "candidate-a", skills: ["QA"], sources: ["bm25"], snippet: "QA" }])
    ).rejects.toThrow("401 Unauthorized");
  });

  it("summarizes candidate fit from supplied snippet data only", async () => {
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Strong fit for the role with direct RAG and QA automation experience." } }]
      })
    });
    (env as { groqApiKey?: string }).groqApiKey = "test-key";

    const service = new LLMService();
    const summary = await service.summarizeCandidateFit(
      "Senior QA architect with RAG experience",
      { resumeId: "candidate-a", snippet: "RAG, QA automation, enterprise governance", skills: ["RAG", "QA"], sources: ["bm25"] },
      { style: "short", maxTokens: 120 }
    );

    expect(summary).toContain("Strong fit");
  });

  it("extracts simple metadata from raw text", () => {
    const service = new LLMService();
    const metadata = service.extractMetadata(`Rajesh Mohan Kumar\nSenior QA Architect\nTestleaf\nSkills: RAG, MCP, DeepEval, Python\n13+ years experience`);

    expect(metadata.name).toBe("Rajesh Mohan Kumar");
    expect(metadata.role).toBe("Senior QA Architect");
    expect(metadata.company).toBe("Testleaf");
    expect(metadata.skills).toContain("RAG");
    expect(metadata.skills).toContain("MCP");
    expect(metadata.yearsExperience).toBeGreaterThanOrEqual(13);
  });
});
