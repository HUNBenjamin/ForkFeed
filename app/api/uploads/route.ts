import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { uploadToCloudinary, UploadFolder } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_TYPES_LABEL = "image/jpeg, image/png, image/webp";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data." },
      { status: 400 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data." }, { status: 400 });
  }

  const file = formData.get("file");
  // Optional: "recipe" | "avatar" — defaults to recipe
  const type = (formData.get("type") as string | null) ?? "recipe";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "A file field is required." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type: "${file.type}". Allowed: ${ALLOWED_TYPES_LABEL}` },
      { status: 415 },
    );
  }

  const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large: ${fileSizeMB} MB. Maximum allowed size is 5 MB.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder: UploadFolder = type === "avatar" ? "forkfeed/avatars" : "forkfeed/recipes";

  try {
    const { url, public_id } = await uploadToCloudinary(buffer, folder);
    return NextResponse.json({ url, public_id }, { status: 201 });
  } catch (err) {
    console.error("[upload] Cloudinary error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Image upload failed.", detail: message }, { status: 500 });
  }
}
