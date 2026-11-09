import { explicitChange } from "./changes";

export function explicitRevision(first: string, second: string): string | null {
  return explicitChange(first, second, false);
}
