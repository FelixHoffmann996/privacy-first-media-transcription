import assert from "node:assert/strict";
import test from "node:test";
import { decideCreatorDelivery } from "../src/creator_delivery.js";

test("clinical language holds a creator delivery for privacy review", () => {
  assert.deepEqual(
    decideCreatorDelivery("The patient should discuss this medication with their clinician."),
    { status: "needs_review", reason: "clinical_language" },
  );
});

test("ordinary production notes are ready for creator delivery", () => {
  assert.deepEqual(decideCreatorDelivery("Move the opening music under the first sentence."), {
    status: "ready",
    reason: "clear",
  });
});
