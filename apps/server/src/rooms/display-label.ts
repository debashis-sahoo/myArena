// Labels are for display only; they never identify or authorize a participant.
export function disambiguateLabel(displayName: string, existingLabels: readonly string[]): string {
  const taken = new Set(existingLabels.map((label) => label.toLowerCase()));
  for (let attempt = 1; ; attempt++) {
    const candidate = attempt === 1 ? displayName : `${displayName} (${attempt})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
