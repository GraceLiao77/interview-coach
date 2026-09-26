# Interview Coach

Mock interview practice for non-native English-speaking engineers, scored separately on what they said and how they said it.

## Language

### Practice

**Interview**:
One mock interview practice built from a single job description, holding its set of questions and the candidate's answers. (Stored as the `Session` model in code.)
_Avoid_: Session (clashes with login sessions)

**Question Category**:
The kind of question: warmup, behavioral or technical. It says nothing about difficulty or rank.
_Avoid_: Tier, level

**Answer Structure**:
The shape a good answer to a given Question Category is expected to follow: Present-Past-Future for warmup, STAR (or CAR) for behavioral, and concept → how/why → real example → trade-off for technical.
_Avoid_: Template, format

**Target Level**:
The seniority the candidate is interviewing for. It sets which Content score counts as meeting the bar: 4 for intermediate, 5 for senior.
_Avoid_: Seniority, grade

### Scoring

**Score Report**:
The feedback for one answer: an independent score per Axis, the Language Errors found, and the two rewrite versions.

**Axis**:
One independently scored dimension of an answer, scored 1–5. Currently Content and Language; Delivery is deferred until it can be measured from the recording rather than guessed from text. Axes are never combined into a single total.
_Avoid_: Overall score, total

**Language Error**:
One flagged span in an answer: the original wording, a native rewrite, and the error pattern it belongs to.

**Error Pattern**:
One entry in the curated list of mistake kinds that every Language Error is classified into. It has a permanent code and an editable display name, e.g. `missing-article` / "Missing article (Chinese-L1 transfer)".
_Avoid_: Error type, error category

**Pattern Group**:
The top-level grouping of Error Patterns: Grammar, Vocabulary, Sentence Structure, Register, Coherence.

**Severity**:
How much a Language Error matters. **must-fix** means it is wrong or changes the meaning. **should-fix** means it is grammatical but sounds unnatural to a native speaker. **nice-to-have** means it is fine as written but could be more idiomatic. A style preference is at most nice-to-have.
_Avoid_: Priority, level

**Proposed Pattern**:
An Error Pattern the model suggested because nothing in the list fitted. It stays pending until a human merges it into an existing pattern or accepts it.

**Polished Version**:
The candidate's own answer with only the language fixed; the content is left unchanged.

**Structural Exemplar**:
The candidate's answer annotated in two layers: what is missing to reach the Target Level, and what a senior candidate would additionally consider. Deliberately not a model answer to memorise.
_Avoid_: Model answer, sample answer

### Evaluation

**Eval Case**:
One question plus a candidate answer, labelled in advance with what a correct Score Report must and must not contain.
_Avoid_: Test, sample

**Test Set**:
The full collection of Eval Cases that the scoring prompt is judged against.
_Avoid_: Dataset, golden set

**Score Band**:
The range of scores an Axis is expected to fall in for an Eval Case.

**Must-catch Error**:
A span in an Eval Case that the Score Report must flag, with its expected Error Pattern.

**Must-not-flag Span**:
Correct English in an Eval Case that the Score Report must not flag as must-fix or should-fix; it guards against false positives.

**Seeded Error**:
An error deliberately injected into a correct native sentence, so its label is right by construction.

**Regression Run**:
One pass of the scoring prompt over the whole Test Set, compared with the last accepted result before a prompt change ships.
