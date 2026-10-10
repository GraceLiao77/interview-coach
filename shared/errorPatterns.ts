// Curated list of Error Patterns (see docs/adr/0001-curated-error-pattern-list.md).
// Codes are permanent: eval labels and weakness stats refer to them. Names and definitions can change.
// Definitions are sent to the model in the scoring prompt, so keep them short, concrete and in English.

export const PATTERN_GROUPS = ['Grammar', 'Vocabulary', 'Sentence Structure', 'Register', 'Coherence', 'Other'] as const;
export type PatternGroup = (typeof PATTERN_GROUPS)[number]; // 从数组里推导出联合类型

export const SEVERITIES = ['must-fix', 'should-fix', 'nice-to-have'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PATTERN_CODES = [
  'missing-article', 'redundant-article', 'missing-plural', 'uncountable-pluralised',
  'subject-verb-agreement', 'wrong-tense-narrative', // grammar
  'wrong-word-choice', 'improper-collocation', // vocabulary
  'existential-have-confusion', 'missing-preposition-object', 'dropped-subject',
  'embedded-question-order', 'unnatural-word-order', // sentence structure
  'too-informal', 'too-written', // register
  'correlative-conjunction-redundancy', 'missing-connector', 'overused-additive-connectors', // coherence
  'other',
] as const;
export type PatternCode = (typeof PATTERN_CODES)[number];

type PatternInfo = { group: PatternGroup; name: string; definition: string };

// Keyed by code, because every lookup starts from a code the model returned.
// Record<PatternCode, ...> makes the compiler reject a missing or unknown code.
export const PATTERN_INFO: Record<PatternCode, PatternInfo> = {
  // ---- Grammar ----
  'missing-article': {
    group: 'Grammar',
    name: 'Missing article',
    definition: 'A needed a/an/the is left out, e.g. "I fixed bug" instead of "I fixed a bug".',
  },
  'redundant-article': {
    group: 'Grammar',
    name: 'Extra article',
    definition: 'An article is used where English needs none, e.g. "have a dinner" instead of "have dinner".',
  },
  'missing-plural': {
    group: 'Grammar',
    name: 'Missing plural',
    definition: 'A countable noun stays singular when it should be plural, e.g. "two year" instead of "two years".',
  },
  'uncountable-pluralised': {
    group: 'Grammar',
    name: 'Uncountable noun made plural',
    definition: 'An uncountable noun is made plural, e.g. "informations" instead of "information".',
  },
  'subject-verb-agreement': {
    group: 'Grammar',
    name: 'Subject-verb agreement',
    definition: 'The verb does not match its subject, e.g. "it work well" instead of "it works well".',
  },
  'wrong-tense-narrative': {
    group: 'Grammar',
    name: 'Wrong tense in a story',
    definition: 'The tense does not fit the time of the story, e.g. "Yesterday I solve it" instead of "Yesterday I solved it".',
  },

  // ---- Vocabulary ----
  'wrong-word-choice': {
    group: 'Vocabulary',
    name: 'Wrong word',
    definition: 'The word itself is wrong for what the speaker means, e.g. "model" instead of "modal". A wrong preposition is improper-collocation, not this.',
  },
  'improper-collocation': {
    group: 'Vocabulary',
    name: "Words that don't go together",
    definition: 'Each word is fine on its own, but native speakers do not use them together, e.g. "did typos" instead of "made typos". This includes the wrong preposition, e.g. "arrived to the office" instead of "arrived at the office".',
  },

  // ---- Sentence Structure ----
  'existential-have-confusion': {
    group: 'Sentence Structure',
    name: '"Have" instead of "there is"',
    definition: '"Have" is used to say that something exists, e.g. "In my room has a desk" instead of "There is a desk in my room".',
  },
  'missing-preposition-object': {
    group: 'Sentence Structure',
    name: 'Preposition with no object',
    definition: 'A preposition is missing the noun it needs, e.g. "It is located on" instead of "It is located on the server". A preposition at the end of a clause, like "the service we depended on", is correct.',
  },
  'dropped-subject': {
    group: 'Sentence Structure',
    name: 'Missing subject',
    definition: 'The subject of a sentence is left out, e.g. "Is very hard" instead of "It is very hard".',
  },
  'embedded-question-order': {
    group: 'Sentence Structure',
    name: 'Question word order inside a sentence',
    definition: "A question inside a sentence keeps question word order, e.g. 'I don't know what is the problem' instead of 'I don't know what the problem is'.",
  },
  'unnatural-word-order': {
    group: 'Sentence Structure',
    name: 'Unnatural word order',
    definition: 'Words are in an unnatural order, e.g. "Chinese traditional food" instead of "traditional Chinese food".',
  },

  // ---- Register ----
  'too-informal': {
    group: 'Register',
    name: 'Too informal',
    definition: 'A word is too casual for a job interview, e.g. "gonna", "kinda" or "stuff".',
  },
  'too-written': {
    group: 'Register',
    name: 'Too formal for speech',
    definition: 'A word sounds like formal writing, not speech, e.g. "hereby" or "aforementioned".',
  },

  // ---- Coherence ----
  'correlative-conjunction-redundancy': {
    group: 'Coherence',
    name: 'Doubled connector',
    definition: 'Two connectors do the same job, e.g. "Although it was hard, but I solved it" instead of "Although it was hard, I solved it".',
  },
  'missing-connector': {
    group: 'Coherence',
    name: 'Missing connector',
    definition: 'Sentences have no linking words, so the ideas feel disconnected, e.g. "I fixed it. The page was faster." instead of "I fixed it, so the page was faster."',
  },
  'overused-additive-connectors': {
    group: 'Coherence',
    name: 'Too many "and"s',
    definition: 'Most ideas are joined with "and" or "and also", so there is no sense of order or cause.',
  },

  // ---- Other ----
  'other': {
    group: 'Other',
    name: 'Other',
    definition: 'A real error that does not fit any code above.',
  },
};
