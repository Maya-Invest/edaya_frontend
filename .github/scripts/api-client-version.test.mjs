import { describe, expect, test } from "bun:test";
import { assertPublishedCandidate } from "./api-client-version.mjs";

describe("deployment client candidate", () => {
  const sha = "a".repeat(40);
  const version = `0.0.0-production.${sha}`;
  test("accepts an immutable published candidate", () => {
    expect(assertPublishedCandidate(version, { version, edayaSourceCommit: sha }, sha)).toBe(`npm:@maya-invest/edaya-api-client@${version}`);
  });
  for (const requested of ["production", "staging", "latest", "", `0.0.0-production.${"b".repeat(40)}`]) {
    test(`rejects unqualified version ${requested}`, () => {
      expect(() => assertPublishedCandidate(requested, { version, edayaSourceCommit: sha }, sha)).toThrow();
    });
  }
  for (const metadata of [null, {}, { version, edayaSourceCommit: "b".repeat(40) }, { version: "other", edayaSourceCommit: sha }]) {
    test(`rejects missing or mismatched registry source ${JSON.stringify(metadata)}`, () => {
      expect(() => assertPublishedCandidate(version, metadata, sha)).toThrow();
    });
  }
});
