// The vocabulary Saifu's copy must never use — features/030-saifu/plan.md §5.6.
//
// Each rule names the requirement it enforces, and its terms are that
// requirement's own words and their inflections. Matching is case-insensitive
// and on word boundaries, so "refund" or "keychain" never trip a rule; spaced,
// hyphenated and joined spellings of a compound are all caught.

export interface Rule {
  /** The requirement the rule enforces. */
  readonly trace: "REQ-SP-1a" | "REQ-TM-2";
  /** Why the terms are forbidden, for the report. */
  readonly reason: string;
  /** Terms, as regular-expression sources matched on word boundaries. */
  readonly terms: readonly string[];
}

export const RULES: readonly Rule[] = [
  {
    trace: "REQ-SP-1a",
    reason:
      "no user-facing flow may present a fee, a gas estimate, a top-up prompt, or a funding step, and no user needs a ledger balance",
    terms: ["fees?", "gas", "top[\\s-]?ups?", "fund(s|ed|ing)?", "balances?"],
  },
  {
    trace: "REQ-TM-2",
    reason:
      "Kippu must not describe or imply trustless, tamper-proof, or decentralised properties under a backend that attests them",
    terms: [
      "trust[\\s-]?less(ly|ness)?",
      "tamper[\\s-]?proof",
      "decentrali[sz](e|ed|es|ing|ation)",
    ],
  },
];

export interface Match {
  readonly rule: Rule;
  /** The text that matched, as written. */
  readonly term: string;
  /** Where the match starts in the text. */
  readonly index: number;
}

const compiled = RULES.map((rule) => ({
  rule,
  pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${rule.terms.join("|")})(?![\\p{L}\\p{N}])`, "giu"),
}));

/** Every forbidden term in `text`. */
export function matches(text: string): Match[] {
  const found: Match[] = [];
  for (const { rule, pattern } of compiled) {
    for (const match of text.matchAll(pattern))
      found.push({ rule, term: match[0], index: match.index });
  }
  return found;
}
