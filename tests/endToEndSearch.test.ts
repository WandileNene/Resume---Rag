import { EmbeddingService } from "../src/modules/ingestion/services/EmbeddingService";
import { ResumeRepository } from "../src/modules/retrieval/repositories/ResumeRepository";
import { LLMService } from "../src/modules/retrieval/services/LLMService";
import { SearchService } from "../src/modules/retrieval/services/SearchService";

describe("SearchService end-to-end search", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("retrieves, deduplicates, reranks, and optionally summarizes candidates", async () => {
    jest.spyOn(ResumeRepository.prototype, "searchBm25").mockResolvedValue([
      { resumeId: "candidate-a", name: "Candidate A", skills: ["QA"], score: 8.4 },
      { resumeId: "candidate-b", name: "Candidate B", skills: ["RAG"], score: 7.1 }
    ]);
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockResolvedValue([0.1, 0.2]);
    jest.spyOn(ResumeRepository.prototype, "searchVector").mockResolvedValue([
      { resumeId: "candidate-b", name: "Candidate B", skills: ["RAG"], score: 0.88 },
      { resumeId: "candidate-c", name: "Candidate C", skills: ["MCP"], score: 0.81 }
    ]);
    jest.spyOn(ResumeRepository.prototype, "findById").mockImplementation(async (resumeId) => ({
      resumeId,
      name: `Name ${resumeId}`,
      role: "QA Architect",
      company: "Example Co",
      skills: ["RAG"],
      rawText: `${resumeId} resume content`,
      experienceSummary: "Senior experience"
    }));
    jest.spyOn(LLMService.prototype, "rerankCandidates").mockResolvedValue({
      model: "openai/gpt-oss-120b",
      results: [
        { resumeId: "candidate-b", rank: 1, relevanceScore: 0.96, reason: "Strong RAG fit" },
        { resumeId: "candidate-a", rank: 2, relevanceScore: 0.72, reason: "Good QA fit" }
      ]
    });
    jest.spyOn(LLMService.prototype, "summarizeCandidateFit").mockImplementation(
      async (_query, candidate) => `Summary for ${candidate.resumeId}`
    );

    const result = await new SearchService().endToEndSearch(
      "Senior QA architect with RAG",
      { minYearsExperience: 10 },
      {
        bm25TopK: 2,
        vectorTopK: 2,
        rerankTopN: 2,
        finalTopK: 2,
        summarize: true,
        summaryStyle: "short"
      }
    );

    expect(result.results.map((candidate) => candidate.resumeId)).toEqual([
      "candidate-b",
      "candidate-a"
    ]);
    expect(result.results[0]).toMatchObject({
      rank: 1,
      relevanceScore: 0.96,
      sources: ["bm25", "vector"],
      summary: "Summary for candidate-b"
    });
    expect(result.results).toHaveLength(2);
    expect(result.model).toBe("openai/gpt-oss-120b");
  });

  it("falls back to BM25 when embedding or vector search fails", async () => {
    jest.spyOn(ResumeRepository.prototype, "searchBm25").mockResolvedValue([
      { resumeId: "candidate-a", name: "Candidate A", skills: ["QA"], score: 8.4 }
    ]);
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockRejectedValue(
      new Error("embedding unavailable")
    );
    jest.spyOn(ResumeRepository.prototype, "findById").mockResolvedValue({
      resumeId: "candidate-a",
      name: "Candidate A",
      skills: ["QA"],
      rawText: "QA resume"
    });
    jest.spyOn(LLMService.prototype, "rerankCandidates").mockRejectedValue(
      new Error("rerank unavailable")
    );

    const result = await new SearchService().endToEndSearch("QA architect", undefined, {
      finalTopK: 1
    });

    expect(result.degraded).toBe(true);
    expect(result.vectorFallback).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining(["VECTOR_SEARCH_FAILED", "LLM_RERANK_FAILED"])
    );
    expect(result.results[0].resumeId).toBe("candidate-a");
  });

  it("falls back to vector results when BM25 fails", async () => {
    jest.spyOn(ResumeRepository.prototype, "searchBm25").mockRejectedValue(
      new Error("BM25 unavailable")
    );
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockResolvedValue([0.1]);
    jest.spyOn(ResumeRepository.prototype, "searchVector").mockResolvedValue([
      { resumeId: "candidate-v", name: "Vector Candidate", skills: ["RAG"], score: 0.88 }
    ]);
    jest.spyOn(ResumeRepository.prototype, "findById").mockResolvedValue({
      resumeId: "candidate-v",
      name: "Vector Candidate",
      skills: ["RAG"],
      rawText: "RAG resume"
    });
    jest.spyOn(LLMService.prototype, "rerankCandidates").mockRejectedValue(
      new Error("rerank unavailable")
    );

    const result = await new SearchService().endToEndSearch("RAG architect", undefined, {
      finalTopK: 1
    });

    expect(result.bm25Fallback).toBe(true);
    expect(result.warnings).toContain("BM25_SEARCH_FAILED");
    expect(result.results[0].resumeId).toBe("candidate-v");
  });

  it("returns ranked results without summaries when summarization fails", async () => {
    jest.spyOn(ResumeRepository.prototype, "searchBm25").mockResolvedValue([
      { resumeId: "candidate-a", skills: ["QA"], score: 8.4 }
    ]);
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockResolvedValue([0.1]);
    jest.spyOn(ResumeRepository.prototype, "searchVector").mockResolvedValue([]);
    jest.spyOn(ResumeRepository.prototype, "findById").mockResolvedValue({
      resumeId: "candidate-a",
      skills: ["QA"],
      rawText: "QA resume"
    });
    jest.spyOn(LLMService.prototype, "rerankCandidates").mockResolvedValue({
      model: "openai/gpt-oss-120b",
      results: [{ resumeId: "candidate-a", rank: 1, relevanceScore: 0.8, reason: "QA fit" }]
    });
    jest.spyOn(LLMService.prototype, "summarizeCandidateFit").mockRejectedValue(
      new Error("summary unavailable")
    );

    const result = await new SearchService().endToEndSearch("QA", undefined, {
      summarize: true,
      finalTopK: 1
    });

    expect(result.degraded).toBe(true);
    expect(result.warnings).toContain("SUMMARIZATION_FAILED");
    expect(result.results[0].summary).toBeUndefined();
  });

  it("throws a controlled error when both retrieval strategies fail", async () => {
    jest.spyOn(ResumeRepository.prototype, "searchBm25").mockRejectedValue(
      new Error("BM25 unavailable")
    );
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockRejectedValue(
      new Error("embedding unavailable")
    );

    await expect(
      new SearchService().endToEndSearch("unavailable search")
    ).rejects.toMatchObject({ code: "SEARCH_UNAVAILABLE" });
  });
});
