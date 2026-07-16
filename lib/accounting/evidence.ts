import fs from "fs/promises";

export async function downloadAndStore(url: string): Promise<string> {
  if (url.startsWith("/")) return url;

  try {
    const res = await fetch(url);
    if (!res.ok) return url;

    const buffer = Buffer.from(await res.arrayBuffer());
    const name = url.split("/").pop()?.split("?")[0] || "file";
    const safeName = `${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = `public/uploads/evidence/${safeName}`;

    await fs.mkdir("public/uploads/evidence", { recursive: true });
    await fs.writeFile(filePath, buffer);

    return `/uploads/evidence/${encodeURIComponent(safeName)}`;
  } catch {
    return url;
  }
}
