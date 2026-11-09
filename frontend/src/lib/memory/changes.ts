/** Adapter over generated Python rules. Edit backend/app/core/changes.py. */
import data from "./generated/change-rules.json";

const qualifiers = new RegExp(data.qualifiers, "i");
const rules = data.rules.map(rule => ({
  ...rule,
  changePattern: new RegExp(rule.change, "i"),
  factPattern: new RegExp(rule.fact, "i"),
}));
const normalize = (value: string) => value.trim().replace(/[.!]+$/, "").split(/\s+/).join(" ");

export function currentStatement(content: string): string | null {
  const text = normalize(content);
  if (qualifiers.test(text)) return null;
  for (const rule of rules) {
    const match = rule.changePattern.exec(text);
    if (!match) continue;
    const [, subject, previous, current] = match.map(part => part.trim());
    if (previous.toLowerCase() !== current.toLowerCase()) {
      return rule.template.replace("{subject}", subject).replace("{value}", current);
    }
  }
  return null;
}

export function explicitChange(first: string, second: string, relocation: boolean): string | null {
  const a = normalize(first), b = normalize(second);
  if (qualifiers.test(a) || qualifiers.test(b)) return null;
  for (const [incoming, existing] of [[a, b], [b, a]]) {
    for (const rule of rules) {
      if ((rule.key === "relocation") !== relocation) continue;
      const change = rule.changePattern.exec(incoming);
      const fact = rule.factPattern.exec(existing);
      const previousChange = rule.changePattern.exec(existing);
      if (!change || (!fact && !previousChange)) continue;
      const [, person, previous, current] = change.map(part => part.trim().toLowerCase());
      const owner = (fact ?? previousChange)![1].trim().toLowerCase();
      const recorded = (fact ? fact[2] : previousChange![3]).trim().toLowerCase();
      if (person === owner && previous === recorded && previous !== current) return rule.reason;
    }
  }
  return null;
}

export const RELOCATION_REASON = data.rules.find(rule => rule.key === "relocation")!.reason;
