import { timingSafeEqual } from "crypto";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@/lib/db/schema";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toResponse(): Response {
    return jsonError(this.code, this.message, this.status);
  }
}

export function jsonError(code: string, message: string, status: number): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status });
}

function getAllowedEmails(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function requireUser(): Promise<User> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue");
  }

  const allowed = getAllowedEmails();
  if (!allowed.has(email)) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your Google account is not authorized to use gastar",
    );
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "User profile not found — sign in again");
  }

  return user;
}

export function requireHarness(request: Request): void {
  const header = request.headers.get("authorization");
  const token = process.env.HARNESS_TOKEN;

  if (!token) {
    throw new ApiError(500, "CONFIG_ERROR", "Harness token is not configured");
  }

  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Harness token required");
  }

  const provided = header.slice("Bearer ".length);
  if (!constantTimeEqual(provided, token)) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid harness token");
  }
}

export async function requireUserOrHarness(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    requireHarness(request);
    return null;
  }
  return requireUser();
}

export function handleApiError(err: unknown): Response {
  if (err instanceof ApiError) {
    return err.toResponse();
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((issue) => issue.message).join("; ");
    return jsonError("VALIDATION_ERROR", message, 400);
  }
  console.error(err);
  return jsonError("INTERNAL_ERROR", "Something went wrong", 500);
}
