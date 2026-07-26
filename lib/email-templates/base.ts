import { getSetting } from "@/lib/settings";

interface BaseTemplateOptions {
  title: string;
  preheader?: string;
  body: string;
}

export async function baseTemplate({ title, preheader, body }: BaseTemplateOptions): Promise<{ html: string; text: string; title: string }> {
  const appName = await getSetting("app_name") || "Application";
  const appUrl = await getSetting("app_url") || "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${preheader ? `<meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>.preheader{display:none!important;max-height:0;overflow:hidden;mso-hide:all}</style>
  <div style="display:none" class="preheader">${preheader}</div>` : ""}
  <style>
    body{margin:0;padding:0;background-color:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
    .wrapper{background-color:#faf9f7;padding:40px 20px}
    .container{max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e7e5e4;overflow:hidden}
    .header{background:linear-gradient(135deg,#f59e0b,#f97316);padding:32px 40px;text-align:center}
    .header h1{margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em}
    .header .subtitle{color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px}
    .body{padding:40px}
    .otp-box{background-color:#fffbeb;border:2px solid #fbbf24;border-radius:12px;padding:24px;text-align:center;margin:24px 0}
    .otp-code{font-size:36px;font-weight:900;color:#b45309;letter-spacing:8px;font-family:'Courier New',monospace;margin:0}
    .otp-label{font-size:12px;color:#92400e;margin-top:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
    .message{color:#44403c;font-size:15px;line-height:1.6;margin:0 0 16px}
    .message strong{color:#1c1917}
    .btn{display:inline-block;background:linear-gradient(135deg,#f59e0b,#f97316);color:#ffffff!important;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:-0.01em;margin:8px 0}
    .divider{border:none;border-top:1px solid #e7e5e4;margin:24px 0}
    .footer{padding:24px 40px;background-color:#faf9f7;border-top:1px solid #e7e5e4}
    .footer p{margin:0;color:#a8a29e;font-size:12px;line-height:1.6}
    .footer a{color:#d97706;text-decoration:none}
    .warning{background-color:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0}
    .warning p{margin:0;color:#92400e;font-size:13px;line-height:1.5}
    .warning strong{color:#78350f}
    .feature-grid{display:flex;gap:16px;margin:24px 0}
    .feature-card{flex:1;background-color:#faf9f7;border:1px solid #e7e5e4;border-radius:12px;padding:20px 16px;text-align:center}
    .feature-card .icon{font-size:24px;margin-bottom:8px}
    .feature-card h3{margin:0 0 4px;font-size:13px;font-weight:700;color:#1c1917}
    .feature-card p{margin:0;font-size:12px;color:#78716c;line-height:1.4}
    @media(max-width:480px){
      .wrapper{padding:16px 8px}
      .container{border-radius:12px}
      .header{padding:24px 20px}
      .body{padding:24px 20px}
      .footer{padding:20px}
      .otp-code{font-size:28px;letter-spacing:6px}
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${appName}</h1>
      </div>
      <div class="body">
        ${body}
      </div>
      <div class="footer">
        <p>This email was sent by <strong>${appName}</strong>${appUrl ? ` &middot; <a href="${appUrl}">${appUrl}</a>` : ""}</p>
        <p style="margin-top:8px">If you didn't request this email, you can safely ignore it.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  // Plain text fallback
  const text = [
    `${appName} - ${title}`,
    "",
    preheader || "",
    "",
    stripHtml(body),
    "",
    "---",
    `This email was sent by ${appName}${appUrl ? ` (${appUrl})` : ""}`,
    "If you didn't request this email, you can safely ignore it.",
  ].filter(Boolean).join("\n");

  return { html, text, title };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
