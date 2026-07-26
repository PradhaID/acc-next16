import { baseTemplate } from "./base";

interface PasswordChangedTemplateOptions {
  fullName: string;
  email: string;
  timestamp?: Date;
}

export async function passwordChangedTemplate({ fullName, email, timestamp }: PasswordChangedTemplateOptions) {
  const title = "Password Changed";
  const preheader = "Your password has been successfully changed.";
  const time = timestamp
    ? timestamp.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "just now";

  const body = `
    <p class="message">Hi <strong>${fullName}</strong>,</p>
    <p class="message">
      The password for your account <strong>${email}</strong> was successfully changed at <strong>${time}</strong>.
    </p>

    <div class="warning">
      <p><strong>Didn't make this change?</strong> If you did not change your password, please contact support immediately &mdash; your account may be compromised.</p>
    </div>

    <hr class="divider" />

    <p class="message" style="color:#78716c;font-size:13px">
      For your security, all active sessions will remain signed in. If you suspect unauthorized access, sign out from all devices immediately.
    </p>
  `;

  return baseTemplate({ title, preheader, body });
}
