# Retrieval And Verification

Created: 2026-07-10

Vault Desk must produce answers, summaries, and exports that can be checked against local source documents.

The retrieval and verification architecture should make correctness observable.

## Retrieval Stack

Use hybrid retrieval:

1. Permission and workspace filters.
2. Evidence-scope filters separating customer documents, installed Knowledge Bundles, and deterministic tool results.
3. For Knowledge Bundles, applicability filters for bundle digest, domain, jurisdiction, language, validity interval, source status, and authority class.
4. Lexical search for exact names, invoice numbers, clause labels, account IDs, dates, and amounts.
5. Dense retrieval with EmbeddingGemma.
6. Optional vector compression and approximate search acceleration with TurboQuant-based indexing.
7. Metadata-aware reranking.
8. Contradiction and supersession search.
9. Gemma-family evidence verification.

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

### Index Choice (Verified 2026-07-11)

Primary candidate: LanceDB (Apache 2.0). It is the only verified option that is embedded in the Node process (Rust core, disk-native, no server), provides native hybrid search (Tantivy full-text plus dense vectors with reciprocal-rank fusion), and supports binary quantization (RaBitQ, 1 to 8 bit). That covers the canonical store acceleration, the lexical index, and the dense index with one dependency and zero extra processes — the least-code fit for the TypeScript/Node control plane.

Fallback: sqlite-vec plus FTS5 (MIT/Apache dual) when a single SQLite file for all state is preferred and corpora stay small; it is pre-1.0 with a brute-force main path and experimental ANN.

### TurboQuant And turbovec

Naming, verified 2026-07-11: TurboQuant is the underlying algorithm — a Google Research online vector quantization method (arXiv 2504.19874, accepted to ICLR 2026). It is data-oblivious (random rotation plus optimal per-coordinate scalar quantization with a 1-bit residual stage), needs no codebook training or index rebuilds, and quantizes to 2 to 4 bits per coordinate with distortion near the information-theoretic lower bound. That makes it a strong fit for streaming folder ingest.

Two implementations matter to Vault Desk:

- turbovec: an MIT-licensed community Rust vector index built on TurboQuant, with Python bindings only. It reports large memory savings (10M documents from 31 GB to 4 GB) and FAISS-beating filtered search. It has no Node.js bindings and is an index library, not a database.
- Qdrant 1.18: ships TurboQuant natively, but requires a server process, which does not fit the desktop profile.

turbovec should be evaluated as an acceleration layer behind the retrieval adapter contract, hosted inside the sandboxed Python document worker that the parser layer already requires. Evaluation criteria:

- Recall loss after compression versus LanceDB's RaBitQ quantization on the same corpora.
- Index build time on tens of huge documents.
- Query latency.
- Incremental update behavior.
- Cross-platform packaging.
- Operational cost of the Python-hosted path versus the in-process LanceDB path.

Adopt turbovec only if it beats the LanceDB baseline by enough to justify the extra process boundary. Desktop-scale corpora (thousands to hundreds of thousands of chunks) may not need TurboQuant-level compression at all.

Whichever index is used, Vault Desk must keep uncompressed or reproducible embeddings for evaluation and audit. Compression accelerates retrieval; it must not become the only record of evidence.

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
- Evidence scope.
- Knowledge Bundle ID and installed bundle digest when applicable.
- Source authority, jurisdiction, validity interval, and supersession status when applicable.

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
- Exact Knowledge Bundle digests and applicability filters used.

The model must answer using citation IDs. Unsupported statements are verifier failures.

Evidence packs should be reproducible. A later compacted session must be able to reconstruct the same pack or explain why source files, parser outputs, retrieval settings, or indexes changed.

Local 12 and Local 16 should use the same retrieval candidate generation and verification policy. Local 16 may include more evidence tokens in the live prompt because it has a larger certified active context, but it should not use different quality rules.

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
- Compaction state version.
- Answer.
- Claims.
- Verification result.
- Export approval.
- Installed Knowledge Bundle versions, digests, trust status, and applicability filters used.

This makes answers replayable and supportable.

## Compaction And Retrieval

Context compaction must preserve retrieval-critical state:

- Active query intent.
- User constraints.
- Evidence pack IDs.
- Citation IDs.
- Source anchors.
- Exact matches used for identifiers, dates, amounts, names, and clauses.
- Contradictions and low-confidence warnings.
- Verification outcomes.
- Pending follow-up searches.

Compaction should not replace source evidence with prose memory. After compacting, the system should still retrieve against canonical chunks and summaries, not against the compacted chat summary alone.

## Research Links

- [EmbeddingGemma docs](https://ai.google.dev/gemma/docs/embeddinggemma)
- [TurboQuant paper](https://arxiv.org/abs/2504.19874)
- [Google Research TurboQuant blog](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/)
- [turbovec repository](https://github.com/RyanCodrai/turbovec)
- [Qdrant TurboQuant article](https://qdrant.tech/articles/turboquant-quantization/)
- [LanceDB](https://github.com/lancedb/lancedb)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
- [Offline Knowledge Bundles](KNOWLEDGE_BUNDLES.md)

## Revision History

| Date | Change |
|---|---|
| 2026-07-10 | Initial retrieval, embedding, vector acceleration, citation, and verification architecture created. |
| 2026-07-10 | Added reproducible evidence-pack and compaction requirements for Local 12 and Local 16. |
| 2026-07-11 | Verified TurboQuant as the Google Research algorithm underlying turbovec, documented the Python-only binding constraint, and named LanceDB as the primary embedded index candidate with sqlite-vec fallback and turbovec as a benchmark-gated acceleration option. |
| 2026-07-12 | Added separate Knowledge Bundle evidence scope, applicability and authority filters, supersession checks, and bundle-digest replay requirements. |
