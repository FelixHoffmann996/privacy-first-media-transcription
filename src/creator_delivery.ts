export type DeliveryDecision = {
  status: "ready" | "needs_review";
  reason: "clear" | "clinical_language" | "empty_transcript";
};

const clinicalTerms = [
  "diagnosis",
  "medication",
  "patient",
  "prescription",
  "treatment",
];

export function decideCreatorDelivery(transcript: string): DeliveryDecision {
  const normalized = transcript.trim().toLowerCase();

  if (normalized.length === 0) {
    return { status: "needs_review", reason: "empty_transcript" };
  }

  const containsClinicalLanguage = clinicalTerms.some((term) =>
    normalized.includes(term),
  );

  return containsClinicalLanguage
    ? { status: "needs_review", reason: "clinical_language" }
    : { status: "ready", reason: "clear" };
}
