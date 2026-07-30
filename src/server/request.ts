import { AppError } from "@/server/errors";

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    throw new AppError(
      "INVALID_REQUEST",
      "This endpoint accepts application/json.",
      415,
    );
  }

  try {
    return await request.json();
  } catch {
    throw new AppError("INVALID_REQUEST", "The request body is not valid JSON.", 400);
  }
}
