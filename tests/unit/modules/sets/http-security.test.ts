import { describe, expect, it, vi } from "vitest";

import { safeLogError } from "../../../../src/shared/http-response";

describe("safeLogError", () => {
  it("registra únicamente contexto permitido", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    safeLogError({ event: "brickset_search_failed", code: "UPSTREAM_UNAVAILABLE", requestId: "request-1" });

    const logged = String(spy.mock.calls[0]?.[0]);
    expect(logged).toContain("brickset_search_failed");
    expect(logged).not.toContain("apiKey");
    expect(logged).not.toContain("userHash");
    spy.mockRestore();
  });
});
