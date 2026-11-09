import { explicitChange } from "./changes";
export { RELOCATION_REASON } from "./changes";

export function explicitRelocation(first: string, second: string): boolean {
  return explicitChange(first, second, true) !== null;
}
