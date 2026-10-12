import request from "supertest";
import { app } from "../src/app";
import { ResumeRepository } from "../src/modules/retrieval/repositories/ResumeRepository";

describe("BM25 search endpoint", () => {
  it("returns mapped lexical search candidates", async () => {
    jest.spyOn(ResumeRepository.prototype, "searchBm25").mockResolvedValue([
      {
        resumeId: "resume-1",
        name: "Rajesh Mohan Kumar",
        role: "Test Architect & Senior Agentic Test Engineer",
        skills: ["RAG", "DeepEval", "MCP (Model Context Protocol)"],
        score: 8.41
      }
    ]);

    const response = await request(app)
      .post("/v1/search/bm25")
      .send({
        query: "agentic QA architect RAG MCP DeepEval",
        topK: 20,
        filters: { minYearsExperience: 10 }
      })
      .expect(200);

    expect(response.body).toMatchObject({
      mode: "bm25",
      query: "agentic QA architect RAG MCP DeepEval",
      count: 1
    });
    expect(response.body.results[0].matchedSkills).toEqual([
      "RAG",
      "DeepEval",
      "MCP (Model Context Protocol)"
    ]);
  });

  it("rejects invalid search parameters", async () => {
    const response = await request(app)
      .post("/v1/search/bm25")
      .send({ query: "RAG", topK: 0 })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_BM25_REQUEST");
  });
});