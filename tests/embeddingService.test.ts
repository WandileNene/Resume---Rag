import {
  EmbeddingError,
  EmbeddingService
} from "../src/modules/ingestion/services/EmbeddingService";
import { env } from "../src/config/env";

describe("embedding service", () => {
  it("builds embedding input from meaningful resume context", () => {
    const text = new EmbeddingService().buildEmbeddingText({
      name: "Jordan Example",
      role: "Test Engineer",
      skills: ["Python", "RAG"],
      company: "Example Ltd",
      experienceSummary: "Automation experience",
      rawText: "Resume text"
    });

    expect(text).toContain("Jordan Example");
    expect(text).toContain("Test Engineer");
    expect(text).toContain("Python, RAG");
    expect(text).toContain("Example Ltd");
    expect(text).toContain("Resume text");
  });

  it("returns a stable error when the Mistral key is missing", async () => {
    const configuredKey = env.mistralApiKey;
    (env as { mistralApiKey?: string }).mistralApiKey = undefined;

    try {
      await expect(
        new EmbeddingService().generateResumeEmbedding({
          skills: [],
          rawText: "Resume text"
        })
      ).rejects.toBeInstanceOf(EmbeddingError);
    } finally {
      (env as { mistralApiKey?: string }).mistralApiKey = configuredKey;
    }
  });
});