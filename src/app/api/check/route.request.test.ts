import { describe, expect, it, vi } from "vitest";
import { geminiOk, post, stubApiKey } from "./route.fixtures";

stubApiKey();

/** What the route sends upstream, as opposed to what it sends back. */
describe("POST /api/check — the Gemini call", () => {
  it("passes the context through to the model", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({ status: "correct", corrected: "Hi.", errors: [] }),
    );

    await post({ content: "Hi.", context: "formal email to a client" });

    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(JSON.stringify(requestBody.contents)).toContain("formal email to a client");
  });

  it("sends the API key as a header, not in the URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      geminiOk({ status: "correct", corrected: "Hi.", errors: [] }),
    );

    await post({ content: "Hi." });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).not.toContain("test-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  });
});
