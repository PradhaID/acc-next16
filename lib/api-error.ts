import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNBALANCED_JOURNAL: "UNBALANCED_JOURNAL",
  NOT_PENDING: "NOT_PENDING",
  ALREADY_CONFIRMED: "ALREADY_CONFIRMED",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  IDEMPOTENCY_REPLAY: "IDEMPOTENCY_REPLAY",
} as const;

function apiError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export const errors = {
  unauthorized: (msg = "Unauthorized") => apiError(ERROR_CODES.UNAUTHORIZED, msg, 401),
  notFound: (msg = "Resource not found") => apiError(ERROR_CODES.NOT_FOUND, msg, 404),
  validation: (msg: string) => apiError(ERROR_CODES.VALIDATION_ERROR, msg, 400),
  conflict: (msg: string) => apiError(ERROR_CODES.CONFLICT, msg, 409),
  internal: (msg = "Internal server error") => apiError(ERROR_CODES.INTERNAL_ERROR, msg, 500),
  unbalancedJournal: () => apiError(ERROR_CODES.UNBALANCED_JOURNAL, "Debits must equal credits.", 400),
  notPending: (action: string) => apiError(ERROR_CODES.NOT_PENDING, `Only pending transactions can be ${action}.`, 400),
  accountNotFound: (id: string) => apiError(ERROR_CODES.ACCOUNT_NOT_FOUND, `Account not found: ${id}`, 404),
  idempotencyReplay: () => apiError(ERROR_CODES.IDEMPOTENCY_REPLAY, "Idempotency key conflict.", 409),
};

export async function checkIdempotency(key: string): Promise<{ exists: boolean; response?: unknown }> {
  const db = await getDb();
  const existing = await db.collection("idempotencyKeys").findOne({ key });
  if (existing) return { exists: true, response: existing.response };
  return { exists: false };
}

export async function storeIdempotency(key: string, response: unknown): Promise<void> {
  const db = await getDb();
  await db.collection("idempotencyKeys").insertOne({
    key,
    response,
    createdAt: new Date(),
  });
}
