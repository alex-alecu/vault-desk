# Retrieval And Verification

Created: 2026-06-29

Vault Desk must produce answers, summaries, and exports that can be checked against local source documents.

The retrieval and verification architecture should make correctness observable.

## Retrieval Stack

Use hybrid retrieval:

1. Permission and workspace filters.
2. Lexical search for exact names, invoice numbers, clause labels, account IDs, dates, and amounts.
3. Dense retrieval with EmbeddingGemma.
4. Optional vector compression and approximate search acceleration with turbovec-like indexing.
5. Metadata-aware reranking.
6. Gemma-family evidence verification.

Dense search alone is not enough for professional documents because exact identifiers and numeric values matter.

## Encoder Choice

EmbeddingGemma should be the default dense encoder.

Reasons:

- It keeps the product inside the Gemma family.
- It is designed for local retrieval.
- It is small enough to run alongside generation profiles.
- It supports multilingual professional document sets better than an English-only encoder would.

The first index should store full source text and source anchors separately from compressed vectors. Compression accelerates retrieval; it must not become the only record of evidence.

## Vector Storage And Acceleration

Use three logical stores:

- Canonical content store: full extracted text, structure, metadata, and source anchors.
- Lexical index: exact terms, identifiers, dates, numbers, names, and headings.
- Dense vector index: EmbeddingGemma vectors, optionally compressed for speed and memory.

turbovec is a candidate acceleration layer because it focuses on memory-efficient vector search. It should be evaluated for:

- Recall loss after compression.
- Index build time on tens of huge documents.
- Query latency.
- Incremental update behavior.
- Cross-platform packaging.
- Fit with a TypeScript/Node control plane.

If turbovec is used, Vault Desk should still keep uncompressed or reproducible embeddings for evaluation and audit.

## Chunking Strategy

Chunking should be structure-aware:

- Page.
- Heading.
- Clause.
- Paragraph.
- Table.
- Row group.
- Sheet.
- Named range.
- OCR region.
- Attachment.

Each chunk should store:

- Document ID.
- Source file hash.
- Page number.
- Section path.
- Table ID.
- Sheet name.
- Row and column range.
- Bounding box where available.
- Parser confidence.
- OCR confidence where applicable.
- Parent summary node.

## Evidence Packs

The prompt builder should assemble evidence packs instead of dumping documents.

An evidence pack contains:

- Task instruction.
- Output schema.
- Retrieved chunks.
- Relevant summary nodes.
- Exact numeric or identifier matches.
- Conflicting evidence if found.
- Known extraction warnings.
- Citation IDs.

The model must answer using citation IDs. Unsupported statements are verifier failures.

## Verification Pipeline

Every high-value answer should pass a verifier:

1. Parse the answer into claims.
2. Check every claim has one or more citations.
3. Confirm cited chunks contain the needed evidence.
4. Re-run exact searches for names, dates, amounts, invoice numbers, and clause references.
5. Recalculate spreadsheet and arithmetic claims with deterministic tools.
6. Search for contradictory evidence.
7. Flag low-confidence OCR or table evidence.
8. Mark unsupported, ambiguous, or contradicted claims.
9. Require approval before export.

The verifier should be a workflow stage, not a generic final prompt saying "check your work."

## Summary Verification

Summaries should be evaluated for:

- Coverage.
- Unsupported claims.
- Missing major sections.
- Numeric consistency.
- Date consistency.
- Citation precision.
- Known extraction warnings.

Folder-level summaries should preserve a link from every major statement back to document-level or page-level evidence.

## Extraction Verification

Structured extraction should be verified with:

- Schema validation.
- Type validation.
- Required-field checks.
- Cross-field consistency.
- Duplicate detection.
- Spreadsheet reconciliation where applicable.
- Parser confidence thresholds.
- Human review queues for uncertain fields.

## Audit Artifacts

The audit log should capture:

- Query.
- Retrieval filters.
- Dense and lexical candidates.
- Final evidence pack.
- Model profile.
- Prompt version.
- Answer.
- Claims.
- Verification result.
- Export approval.

This makes answers replayable and supportable.

## Research Links

- [EmbeddingGemma docs](https://ai.google.dev/gemma/docs/embeddinggemma)
- [turbovec repository](https://github.com/RyanCodrai/turbovec)

## Revision History

| Date | Change |
|---|---|
| 2026-06-29 | Initial retrieval, embedding, vector acceleration, citation, and verification architecture created. |
