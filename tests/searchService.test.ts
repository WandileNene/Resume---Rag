import { ResumeRepository } from "../src/modules/retrieval/repositories/ResumeRepository";
import { SearchService } from "../src/modules/retrieval/services/SearchService";

describe("retrieval search service normalization", () => {
  it("normalizes BM25 candidates with a BM25 source and score", async () => {
    jest.spyOn(ResumeRepository.prototype, "searchBm25").mockResolvedValue([
      {
        resumeId: "resume-1",
        name: "Jordan Example",
        skills: ["RAG"],
        score: 8.41
      }
    ]);

    const result = await new SearchService().searchBm25("RAG", 20);

    expect(result.results[0]).toMatchObject({
      resumeId: "resume-1",
      bm25Score: 8.41,
      sources: ["bm25"],
      matchedSkills: ["RAG"]
    });
  });

  it("normalizes vector candidates with a vector source and score", async () => {
    jest.spyOn(ResumeRepository.prototype, "searchVector").mockResolvedValue([
      {
        resumeId: "resume-1",
        name: "Jordan Example",
        skills: ["RAG"],
        score: 0.88
      }
    ]);

    const result = await new SearchService().searchVector("RAG", [0.1], 20);

    expect(result.results[0]).toMatchObject({
      resumeId: "resume-1",
      vectorScore: 0.88,
      sources: ["vector"]
    });
  });
});