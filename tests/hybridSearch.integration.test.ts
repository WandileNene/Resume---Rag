import request from "supertest";
import { app } from "../src/app";
import { EmbeddingService } from "../src/modules/ingestion/services/EmbeddingService";
import { ResumeRepository } from "../src/modules/retrieval/repositories/ResumeRepository";

describe("hybrid search endpoint", () => {
  it("returns independent BM25 and vector results with timings", async () => {
    const embedding = Array.from({ length: 1024 }, () => 0.001);
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockResolvedValue(embedding);
    const bm25 = jest.spyOn(ResumeRepository.prototype, "searchBm25").mockResolvedValue([
      { resumeId: "resume-1", name: "Jordan Example", skills: ["RAG"], score: 8.41 }
    ]);
    const vector = jest.spyOn(ResumeRepository.prototype, "searchVector").mockResolvedValue([
      { resumeId: "resume-1", name: "Jordan Example", skills: ["RAG"], score: 0.88 }
    ]);

    const response = await request(app)
      .post("/v1/search/hybrid")
      .send({ query: "agentic QA architect with RAG evaluation", topK: 20 })
      .expect(200);

    expect(response.body.mode).toBe("hybrid-debug");
    expect(response.body.bm25[0].bm25Score).toBe(8.41);
    expect(response.body.vector[0].vectorScore).toBe(0.88);
    expect(response.body.timings).toEqual({
      bm25Ms: expect.any(Number),
      embeddingMs: expect.any(Number),
      vectorMs: expect.any(Number)
    });
    expect(bm25).toHaveBeenCalledWith(
      "agentic QA architect with RAG evaluation",
      20,
      { minYearsExperience: undefined }
    );
    expect(vector).toHaveBeenCalledWith(embedding, 20, { minYearsExperience: undefined });
    jest.restoreAllMocks();
  });

  it("allows the same resume to appear in both BM25 and vector lists", async () => {
    const embedding = Array.from({ length: 1024 }, () => 0.001);
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockResolvedValue(embedding);
    jest.spyOn(ResumeRepository.prototype, "searchBm25").mockResolvedValue([
      { resumeId: "resume-1", name: "Jordan Example", skills: ["RAG"], score: 8.41 }
    ]);
    jest.spyOn(ResumeRepository.prototype, "searchVector").mockResolvedValue([
      { resumeId: "resume-1", name: "Jordan Example", skills: ["RAG"], score: 0.88 }
    ]);

    const response = await request(app)
      .post("/v1/search/hybrid")
      .send({ query: "RAG evaluation", topK: 20 })
      .expect(200);

    // Same resumeId must be present in both lists — no premature deduplication
    expect(response.body.bm25[0].resumeId).toBe("resume-1");
    expect(response.body.vector[0].resumeId).toBe("resume-1");
    // Scores must remain in their own fields, not mixed
    expect(response.body.bm25[0].bm25Score).toBeDefined();
    expect(response.body.bm25[0].vectorScore).toBeUndefined();
    expect(response.body.vector[0].vectorScore).toBeDefined();
    expect(response.body.vector[0].bm25Score).toBeUndefined();
    jest.restoreAllMocks();
  });

  it("applies minYearsExperience filter to both searches", async () => {
    const embedding = Array.from({ length: 1024 }, () => 0.001);
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockResolvedValue(embedding);
    const bm25 = jest.spyOn(ResumeRepository.prototype, "searchBm25").mockResolvedValue([]);
    const vector = jest.spyOn(ResumeRepository.prototype, "searchVector").mockResolvedValue([]);

    await request(app)
      .post("/v1/search/hybrid")
      .send({ query: "RAG architect", topK: 10, filters: { minYearsExperience: 10 } })
      .expect(200);

    expect(bm25).toHaveBeenCalledWith("RAG architect", 10, { minYearsExperience: 10 });
    expect(vector).toHaveBeenCalledWith(embedding, 10, { minYearsExperience: 10 });
    jest.restoreAllMocks();
  });

  it("rejects an empty query with INVALID_HYBRID_REQUEST", async () => {
    const response = await request(app)
      .post("/v1/search/hybrid")
      .send({ query: "", topK: 20 })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_HYBRID_REQUEST");
    expect(response.body.success).toBe(false);
  });

  it("rejects a whitespace-only query", async () => {
    const response = await request(app)
      .post("/v1/search/hybrid")
      .send({ query: "   ", topK: 20 })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_HYBRID_REQUEST");
  });

  it("rejects topK of zero", async () => {
    const response = await request(app)
      .post("/v1/search/hybrid")
      .send({ query: "RAG", topK: 0 })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_HYBRID_REQUEST");
  });

  it("rejects topK above 100", async () => {
    const response = await request(app)
      .post("/v1/search/hybrid")
      .send({ query: "RAG", topK: 101 })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_HYBRID_REQUEST");
  });

  it("rejects a negative minYearsExperience filter", async () => {
    const response = await request(app)
      .post("/v1/search/hybrid")
      .send({ query: "RAG", topK: 10, filters: { minYearsExperience: -1 } })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_HYBRID_REQUEST");
  });
});