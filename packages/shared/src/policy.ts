import { z } from "zod";

export const PolicyDecisionSchema = z.object({
  decision: z.enum(["allow", "deny"]),
  reason: z.enum([
    "within_workspace_scope",
    "outside_workspace_scope",
    "unsupported_operation",
    "approval_required",
  ]),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
