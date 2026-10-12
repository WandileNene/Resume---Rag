import { ResumeParserService } from "../src/modules/ingestion/services/ResumeParserService";
import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import PDFDocument from "pdfkit";
import { ObjectId } from "mongodb";
import { app } from "../src/app";
import { checkDatabaseConnection, getDatabase } from "../src/config/database";
import { EmbeddingService } from "../src/modules/ingestion/services/EmbeddingService";

jest.mock("../src/config/database", () => ({
  checkDatabaseConnection: jest.fn(),
  getDatabase: jest.fn()
}));

const embedding = Array.from({ length: 1024 }, () => 0.001);

const createTestPdf = (): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const document = new PDFDocument();
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.fontSize(14).text("Rajesh Mohan Kumar");
    document.text("Test Architect and Senior Test Engineer");
    document.text("Testleaf Software Solutions Private Limited");
    document.text("13+ years of experience");
    document.text("B.Tech - Information Technology");
    document.text("Selenium WebDriver, Python, RAG, DeepEval");
    document.end();
  });

describe("ingestion API integration", () => {
  const mockedCheckDatabaseConnection = jest.mocked(checkDatabaseConnection);
  const mockedGetDatabase = jest.mocked(getDatabase);
  const insertOne = jest.fn();

  beforeEach(() => {
    mockedCheckDatabaseConnection.mockResolvedValue(12);
    insertOne.mockResolvedValue({ insertedId: new ObjectId("507f1f77bcf86cd799439011") });
    mockedGetDatabase.mockResolvedValue({
      command: jest.fn().mockResolvedValue({ ok: 1 }),
      collection: jest.fn().mockReturnValue({ insertOne })
    } as never);
    jest.spyOn(EmbeddingService.prototype, "generateResumeEmbedding").mockResolvedValue(embedding);
      jest.spyOn(ResumeParserService.prototype, "extractTextFromPdf").mockResolvedValue(
        "Rajesh Mohan Kumar\nTest Architect and Senior Test Engineer\nTestleaf Software Solutions Private Limited\n13+ years of experience\nB.Tech - Information Technology\nSelenium WebDriver, Python, RAG, DeepEval"
      );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    const uploadsDirectory = path.resolve(process.cwd(), "uploads");
    for (const entry of await fs.readdir(uploadsDirectory, { withFileTypes: true })) {
      if (entry.isFile()) {
        await fs.rm(path.join(uploadsDirectory, entry.name), { force: true });
      }
    }
  });

  it("checks application and database health", async () => {
    await request(app).get("/v1/health").expect(200);
    const response = await request(app).get("/v1/health/db").expect(200);

    expect(response.body.connected).toBe(true);
    expect(response.body.latencyMs).toBe(12);
  });

  it("rejects an invalid PDF upload with a request ID", async () => {
    const response = await request(app)
      .post("/v1/resume/upload")
      .set("x-request-id", "integration-invalid-file")
      .attach("file", Buffer.from("not a PDF"), {
        filename: "resume.txt",
        contentType: "text/plain"
      })
      .expect(415);

    expect(response.body).toMatchObject({
      success: false,
      requestId: "integration-invalid-file",
      errorCode: "INVALID_FILE_TYPE"
    });
  });

  it("extracts, parses, embeds, and stores through individual endpoints", async () => {
    const testPdf = await createTestPdf();
    const extractResponse = await request(app)
      .post("/v1/resume/extract")
      .attach("file", testPdf, {
        filename: "resume.pdf",
        contentType: "application/pdf"
      })
      .expect(200);
    expect(extractResponse.body.rawText).toContain("Rajesh Mohan Kumar");

    const parseResponse = await request(app)
      .post("/v1/resume/parse")
      .send({ rawText: "Rajesh Mohan Kumar\nTest Architect and Senior Test Engineer\nPython, RAG" })
      .expect(200);
    expect(parseResponse.body.resume.name).toBe("Rajesh Mohan Kumar");

    const embedResponse = await request(app)
      .post("/v1/resume/embed")
      .send({ rawText: "Resume text", skills: ["Python", "RAG"] })
      .expect(200);
    expect(embedResponse.body.dimension).toBe(1024);

    const storeResponse = await request(app)
      .post("/v1/resume/store")
      .send({
        fileName: "resume.pdf",
        resume: parseResponse.body.resume,
        rawText: "Resume text",
        embedding
      })
      .expect(201);
    expect(storeResponse.body.resumeId).toBe("507f1f77bcf86cd799439011");
    expect(insertOne).toHaveBeenCalled();
  });

  it("runs the complete multipart ingestion flow", async () => {
    const testPdf = await createTestPdf();
    const response = await request(app)
      .post("/v1/resume/ingest")
      .attach("file", testPdf, {
        filename: "resume.pdf",
        contentType: "application/pdf"
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Resume ingestion completed",
      data: {
        embeddingDimension: 1024
      }
    });
    expect(response.body.resumeId).toBe("507f1f77bcf86cd799439011");
    expect(response.body.timings.totalMs).toEqual(expect.any(Number));
  });
});