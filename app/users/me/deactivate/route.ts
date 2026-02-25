import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { is_active: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.is_active) {
    return NextResponse.json({ error: "Account is already deactivated." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.sub },
    data: { is_active: false, updated_at: new Date() },
  });

  return NextResponse.json({ message: "Account deactivated successfully." }, { status: 200 });
}
