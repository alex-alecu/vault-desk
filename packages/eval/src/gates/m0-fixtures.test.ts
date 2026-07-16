import { describe, expect, it } from "vitest";
import { heldoutInvoiceCorpus } from "../fixtures/heldout.js";
import { developmentInvoiceCorpus, encodeInvoiceCorpus } from "../fixtures/invoices.js";

describe("M0 deterministic evaluation corpora", () => {
  it("generates identical bytes", () => {
    const first = encodeInvoiceCorpus(developmentInvoiceCorpus());
    const second = encodeInvoiceCorpus(developmentInvoiceCorpus());
    expect(first).toEqual(second);
  });

  it("covers every required ground-truth class", () => {
    const categories = new Set(developmentInvoiceCorpus().map((entry) => entry.category));
    expect(categories).toEqual(
      new Set([
        "positive",
        "negative",
        "contradiction",
        "locale",
        "corruption",
        "prompt_injection",
      ]),
    );
  });

  it("keeps held-out templates and identifiers separate", () => {
    const developmentIds = new Set(developmentInvoiceCorpus().map((entry) => entry.id));
    expect(heldoutInvoiceCorpus().every((entry) => !developmentIds.has(entry.id))).toBe(true);
  });

  it("covers required classes in held-out data and keeps every source anchor exact", () => {
    const heldout = heldoutInvoiceCorpus();
    expect(new Set(heldout.map((entry) => entry.category))).toEqual(
      new Set([
        "positive",
        "negative",
        "contradiction",
        "locale",
        "corruption",
        "prompt_injection",
      ]),
    );
    for (const fixture of [...developmentInvoiceCorpus(), ...heldout]) {
      const content = Buffer.from(fixture.contentBase64, "base64").toString("utf8");
      expect(fixture.anchors.every((anchor) => content.includes(anchor.exactText))).toBe(true);
    }
  });
});
