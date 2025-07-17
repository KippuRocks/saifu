import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  (await cookies()).set("accountId", searchParams.get("accountId")!);

  return Response.redirect(request.nextUrl.origin);
}
