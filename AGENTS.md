<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## P&L and mapping (Phase 1)

Retail / hospitality accounting hierarchy, line-item discipline, and “ask instead of guess” for unclear labels are defined in the Cursor project rule [`.cursor/rules/pl-accounting-phase1.mdc`](.cursor/rules/pl-accounting-phase1.mdc). Confirm it appears under **Cursor Settings → Rules** for this workspace.

## Macro sensitivity by industry (Phase 2)

The six Australian retail/hospitality industry buckets and macro sensitivity matrix (confidence, CPI, WPI, rates, unemployment) live in [`.cursor/rules/pl-macro-sensitivity-phase2.mdc`](.cursor/rules/pl-macro-sensitivity-phase2.mdc). Do not mix profiles across categories.

## Industry choice and overlay explanations (Phase 3)

After the user picks **one** of the six categories, follow [`.cursor/rules/pl-industry-overlay-phase3.mdc`](.cursor/rules/pl-industry-overlay-phase3.mdc): confirm the industry, apply **only** that Phase 2 profile, keep Phase 1 accounting discipline, explain dominant macro factors and **direction** without inventing numeric impacts unless they come from the product model. Persisting industry on `SessionAnswers` / UI remains optional product work.

## Benchmarking vs ATO Small Business Benchmarks (Phase 4)

Four-ratio benchmarking and ATO comparison behaviour (with strict Phase 1 accounting) are in [`.cursor/rules/pl-benchmarking-phase4.mdc`](.cursor/rules/pl-benchmarking-phase4.mdc). Official ATO percentage bands are not shipped in-repo yet—see the rule’s integrity section. **Auto-running** benchmarks after upload in the Next.js app is future work unless implemented in code.
