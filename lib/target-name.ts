/**
 * The one place a target's name is split into tokens, because the email
 * pipeline and the `{{first_name}}` prefill must never disagree.
 *
 * `firstName`/`lastName` are an override for names that do not split naively
 * (`Bae Suzy`, `van der Berg`, `Cher`, `J. Smith`). They are null on most
 * rows, not a second copy of the name. No imports, so both the Next app and the
 * standalone workers can load it.
 */

export interface NameSource {
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface NameParts {
  firstName: string;
  /** Undefined for a mononym: "Cher" has no second token to offer. */
  lastName?: string;
}

export function nameParts(source: NameSource): NameParts {
  const tokens = source.fullName.trim().split(/\s+/).filter((token) => token !== "");
  // Each half falls back independently, so a name that splits fine can still
  // have just its surname corrected.
  const first = source.firstName?.trim() || tokens[0];
  const last = source.lastName?.trim() || tokens.slice(1).join(" ");
  return last ? { firstName: first ?? "", lastName: last } : { firstName: first ?? "" };
}
