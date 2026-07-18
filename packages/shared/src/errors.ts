import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "invalid_request",
  "incompatible_version",
  "workspace_busy",
  "path_out_of_scope",
  "path_changed",
  "not_found",
  "cancelled",
  "unsupported",
  "internal",
]);

export const VaultErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type VaultError = z.infer<typeof VaultErrorSchema>;
