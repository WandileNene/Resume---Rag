import { cleanText } from "../src/modules/ingestion/utils/textCleaner";

describe("text cleaner", () => {
  it("normalizes whitespace without removing technical symbols", () => {
    expect(cleanText("Name\n\n  C#   C++   .NET\tRAG  ")).toBe(
      "Name\nC# C++ .NET RAG"
    );
  });
});