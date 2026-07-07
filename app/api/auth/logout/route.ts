import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  return Response.json(
    { message: "Logged out successfully." },
    {
      headers: {
        "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Path=/; Max-Age=0`,
      },
    }
  );
}
