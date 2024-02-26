import { cookies } from "next/headers";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  cookies().set("accountId", searchParams.get("accountId")!);

  return Response.redirect(request.nextUrl.origin);
}
