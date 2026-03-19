import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ recipeId: string }> };

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_TYPES_LABEL = "image/jpeg, image/png, image/webp";

function parseRecipeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId } = await params;
  const rId = parseRecipeId(recipeId);

  if (rId === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: rId },
    select: { author_id: true, is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (recipe.author_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to modify this recipe." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Failed to parse form data." }, { status: 400 });
    }

    const file = formData.get("file");

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

    // Delete old image from Cloudinary if one exists
    if (recipe) {
      const existing = await prisma.recipe.findUnique({
        where: { id: rId },
        select: { image_url: true },
      });
      if (existing?.image_url) {
        await deleteFromCloudinary(existing.image_url);
      }
    }

    let image_url: string;
    try {
      const result = await uploadToCloudinary(buffer, "forkfeed/recipes");
      image_url = result.url;
    } catch (err) {
      console.error("[recipe/image] Cloudinary error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: "Image upload failed.", detail: message }, { status: 500 });
    }

    const updated = await prisma.recipe.update({
      where: { id: rId },
      data: { image_url, updated_at: new Date() },
      select: { id: true, image_url: true },
    });

    return NextResponse.json({ recipe: updated }, { status: 200 });
  }

  if (contentType.includes("application/json")) {
    let payload: { image_url?: string | null };

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (payload.image_url === undefined) {
      return NextResponse.json({ error: "image_url is required." }, { status: 400 });
    }

    const updated = await prisma.recipe.update({
      where: { id: rId },
      data: { image_url: payload.image_url, updated_at: new Date() },
      select: { id: true, image_url: true },
    });

    return NextResponse.json({ recipe: updated }, { status: 200 });
  }

  return NextResponse.json(
    { error: "Content-Type must be multipart/form-data or application/json." },
    { status: 400 },
  );
}
