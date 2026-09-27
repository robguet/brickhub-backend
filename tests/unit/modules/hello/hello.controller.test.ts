import { describe, expect, it } from "vitest";

import { getHello } from "../../../../src/modules/hello/hello.controller";

describe("getHello", () => {
  it("responde con un saludo JSON", () => {
    const response = getHello();

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({
      "content-type": "application/json; charset=utf-8",
    });
    expect(JSON.parse(response.body ?? "{}")).toEqual({
      message: "Hola mundo",
    });
  });
});

