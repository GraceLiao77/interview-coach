# Error Patterns come from a curated list that grows only through human review

Language Errors are classified against a curated list of Error Patterns instead of the model's free-text labels. Each pattern has a code that never changes (e.g. `missing-article`) and a display name that can be edited. The scoring prompt receives the current list and must pick from it. When nothing fits, the model may propose a new pattern with a reason. A proposal stays pending until a human merges it into an existing pattern or accepts it as new.

We chose this over a fully dynamic list because free-text labels fragment: "missing article", "article omission" and "missing determiner" would end up stored as three types. Once that happens, the Test Set's Must-catch Errors can't be checked by code, and the cross-interview weakness profile (roadmap #9) can't count anything. We also rejected a permanently fixed list, because real answers will turn up patterns we didn't predict.

## Consequences

- Eval labels and weakness statistics reference pattern **codes**, never display names. Renaming a pattern is safe, but changing its code breaks history.
- Someone has to review pending proposals. Until that happens, a proposed pattern's errors are counted under `other`.
- Codes follow three rules:
  - Name the error's mechanism, not the topic it happened in (`redundant-article`, not `redundant-article-in-meal-expression`).
  - The codes are mutually exclusive, so every error fits exactly one code; where two could apply, the more specific one wins.
  - Keep the list to about 15 codes plus `other`. A finer list spreads the weakness counts too thin to show a pattern.
- For step 5 the list lives as a constant in code. The database table and the review flow arrive with the weakness profile (#9).
