/**
 * Word-level diff via longest common subsequence.
 *
 * Small enough to not warrant a dependency: the inputs are capped at 5,000
 * characters, so the O(n*m) table stays well under a million cells.
 */

export type DiffOp = "equal" | "insert" | "delete";

export interface DiffPart {
  op: DiffOp;
  text: string;
}

/**
 * Splits into words *and* the whitespace between them, so reassembling the
 * parts reproduces the input exactly.
 */
function tokenize(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);

  // lcs[i][j] = length of the LCS of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (op: DiffOp, text: string) => {
    const last = parts[parts.length - 1];
    // Coalesce runs so consumers render one <ins>/<del> per change, not one per word.
    if (last && last.op === op) last.text += text;
    else parts.push({ op, text });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("equal", a[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("delete", a[i]);
      i++;
    } else {
      push("insert", b[j]);
      j++;
    }
  }
  while (i < a.length) push("delete", a[i++]);
  while (j < b.length) push("insert", b[j++]);

  return coalesce(parts);
}

const isWhitespace = (text: string) => /^\s+$/.test(text);

/**
 * Merges each run of changes into a single delete + insert pair.
 *
 * Rewriting two adjacent words leaves the space between them matching on both
 * sides, so the raw LCS output fragments into `del/equal/del`, which renders as
 * a stutter of separate highlights. Absorbing that bridging whitespace into
 * *both* sides of the change keeps the reconstruction invariant intact —
 * equal+delete still rebuilds `before`, equal+insert still rebuilds `after`.
 */
function coalesce(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  let i = 0;

  while (i < parts.length) {
    if (parts[i].op === "equal") {
      out.push(parts[i]);
      i++;
      continue;
    }

    let deleted = "";
    let inserted = "";
    while (i < parts.length) {
      const part = parts[i];
      if (part.op === "delete") {
        deleted += part.text;
        i++;
      } else if (part.op === "insert") {
        inserted += part.text;
        i++;
      } else if (
        // Only bridge whitespace that sits *between* two changes; trailing
        // whitespace belongs outside the run.
        isWhitespace(part.text) &&
        parts[i + 1] !== undefined &&
        parts[i + 1].op !== "equal"
      ) {
        deleted += part.text;
        inserted += part.text;
        i++;
      } else {
        break;
      }
    }

    if (deleted) out.push({ op: "delete", text: deleted });
    if (inserted) out.push({ op: "insert", text: inserted });
  }

  return out;
}
