import request from "supertest";
import { app } from "../src/app";
import { LLMService } from "../src/modules/retrieval/services/LLMService";

describe("summarize endpoint", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("summarizes a valid candidate and returns a grounded summary", async () => {
    jest.spyOn(LLMService.prototype, "summarizeCandidateFit").mockResolvedValue(
      "Strong fit for senior QA architecture with direct RAG and governance experience."
    );

    const response = await request(app)
      .post("/v1/search/summarize")
      .send({
        query: "Senior QA architect with GenAI RAG and evaluation experience",
        candidate: {
          resumeId: "candidate-a",
          snippet: "RAG, DeepEval, MCP and enterprise governance",
          skills: ["RAG", "DeepEval", "MCP"],
          sources: ["bm25", "vector"]
        },
        style: "short",
        maxTokens: 120
      })
      .expect(200);

    expect(response.body.resumeId).toBe("candidate-a");
    expect(response.body.summary).toContain("Strong fit");
  });

  it("rejects invalid summary requests", async () => {
    const response = await request(app)
      .post("/v1/search/summarize")
      .send({
        query: "",
        candidate: { resumeId: "", snippet: "" },
        style: "invalid",
        maxTokens: 0
      })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_SUMMARY_REQUEST");
    expect(response.body.success).toBe(false);
  });
});
