import request from "supertest";
import { app } from "../src/app";
import { EmbeddingService } from "../src/modules/ingestion/services/EmbeddingService";
import { ResumeRepository } from "../src/modules/retrieval/repositories/ResumeRepository";

describe("vector search endpoint", () => {
  it("embeds the query and returns vector-ranked candidates", async () => {
    const embedding = Array.from({ length: 1024 }, () => 0.001);
    const embed = jest
      .spyOn(EmbeddingService.prototype, "generateResumeEmbedding")
      .mockResolvedValue(embedding);
    const search = jest
      .spyOn(ResumeRepository.prototype, "searchVector")
      .mockResolvedValue([
        {
          resumeId: "resume-1",
          name: "Rajesh Mohan Kumar",
          role: "Test Architect & Senior Agentic Test Engineer",
          skills: ["RAG"],
          score: 0.88
        }
      ]);

    const response = await request(app)
      .post("/v1/search/vector")
      .send({ query: "senior engineer with RAG experience", topK: 20 })
      .expect(200);

    expect(response.body).toMatchObject({
      mode: "vector",
      query: "senior engineer with RAG experience",
      count: 1
    });
    expect(response.body.results[0].vectorScore).toBe(0.88);
    expect(embed).toHaveBeenCalledWith({
      rawText: "senior engineer with RAG experience",
      skills: []
    });
    expect(search).toHaveBeenCalledWith(
      embedding,
      20,
      { minYearsExperience: undefined }
    );
    embed.mockRestore();
    search.mockRestore();
  });

  it("rejects an empty vector search query", async () => {
    const response = await request(app)
      .post("/v1/search/vector")
      .send({ query: "", topK: 20 })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_VECTOR_REQUEST");
  });
});