import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction } from "@/lib/log";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (session) {
    await logAction({
      userId: session.userId,
      username: session.username,
      action: "LOGOUT",
      category: "AUTH",
      target: `user:${session.username}`,
      detail: "Signed out",
    });
  }

  return Response.json(
    { message: "Logged out successfully." },
    {
      headers: [
        ["Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Path=/; Max-Age=0`],
        ["Set-Cookie", `session_active=; SameSite=Lax; Path=/; Max-Age=0`],
      ],
    }
  );
}
