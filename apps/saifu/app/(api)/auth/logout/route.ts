import { cookies } from "next/headers";

export async function GET(request: Request) {
  cookies().delete("accountId");
  return Response.redirect(new URL("/", request.url));
}
