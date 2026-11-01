import { describe, it, expect } from "vitest";
import { getToken, setToken } from "./api.ts";

describe("Frontend API Client Auth", () => {
  it("stores and retrieves auth token", () => {
    setToken("test_bearer_token");
    expect(getToken()).toBe("test_bearer_token");
    setToken("");
    expect(getToken()).toBe("");
  });
});
