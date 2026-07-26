import { baseTemplate } from "./base";

interface WelcomeTemplateOptions {
  fullName: string;
  email: string;
  appUrl?: string;
}

export async function welcomeTemplate({ fullName, email, appUrl }: WelcomeTemplateOptions) {
  const title = "Welcome aboard!";
  const preheader = `Your account has been verified. Welcome to the team!`;

  const body = `
    <p class="message">Hi <strong>${fullName}</strong>,</p>
    <p class="message">
      Your email <strong>${email}</strong> has been verified and your account is now active. You're all set!
    </p>

    <div style="text-align:center;margin:32px 0">
      ${appUrl ? `<a href="${appUrl}" class="btn">Go to Dashboard</a>` : ""}
    </div>

    <div class="divider"></div>

    <p class="message" style="color:#78716c;font-size:13px">
      Here are a few things you can do to get started:
    </p>

    <div style="padding:0;margin:0 0 16px">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
        <div style="min-width:24px;height:24px;background:linear-gradient(135deg,#f59e0b,#f97316);border-radius:6px;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:800">1</div>
        <div>
          <p style="margin:0;font-size:14px;font-weight:600;color:#1c1917">Complete your profile</p>
          <p style="margin:2px 0 0;font-size:13px;color:#78716c">Add your avatar and personal information.</p>
        </div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
        <div style="min-width:24px;height:24px;background:linear-gradient(135deg,#f59e0b,#f97316);border-radius:6px;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:800">2</div>
        <div>
          <p style="margin:0;font-size:14px;font-weight:600;color:#1c1917">Explore the dashboard</p>
          <p style="margin:2px 0 0;font-size:13px;color:#78716c">Familiarize yourself with the available features.</p>
        </div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="min-width:24px;height:24px;background:linear-gradient(135deg,#f59e0b,#f97316);border-radius:6px;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:800">3</div>
        <div>
          <p style="margin:0;font-size:14px;font-weight:600;color:#1c1917">Start creating</p>
          <p style="margin:2px 0 0;font-size:13px;color:#78716c">Create your first post, page, or ad campaign.</p>
        </div>
      </div>
    </div>
  `;

  return baseTemplate({ title, preheader, body });
}
