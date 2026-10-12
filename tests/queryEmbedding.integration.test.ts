import request from "supertest";
import { app } from "../src/app";
import { EmbeddingService } from "../src/modules/ingestion/services/EmbeddingService";

describe("query embedding endpoint", () => {
  it("generates an on-demand query embedding without resume data", async () => {
    const embedding = Array.from({ length: 1024 }, () => 0.001);
    const generate = jest
      .spyOn(EmbeddingService.prototype, "generateResumeEmbedding")
      .mockResolvedValue(embedding);

    const response = await request(app)
      .post("/v1/embeddings")
      .send({
        model: "mistral-embed",
        input: "senior agentic QA architect with RAG, DeepEval and MCP experience"
      })
      .expect(200);

    expect(response.body).toMatchObject({
      model: "mistral-embed",
      dimension: 1024
    });
    expect(response.body.embedding).toHaveLength(1024);
    expect(generate).toHaveBeenCalledWith({
      rawText: "senior agentic QA architect with RAG, DeepEval and MCP experience",
      skills: []
    });
    generate.mockRestore();
  });

  it("rejects an empty query", async () => {
    const response = await request(app)
      .post("/v1/embeddings")
      .send({ model: "mistral-embed", input: " " })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_EMBEDDING_REQUEST");
  });
});