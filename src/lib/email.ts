import { Resend } from "resend";

const resend = new Resend(process.env["RESEND_API_KEY"]);

const FROM = "Invest <noreply@tazima.com.br>";

export async function sendAdvisorInviteEmail({
  toEmail,
  inviterName,
  role,
  inviteUrl,
}: {
  toEmail: string;
  inviterName: string;
  role: "advisor_read" | "advisor_write";
  inviteUrl: string;
}) {
  const roleLabel = role === "advisor_write" ? "Assessor com acesso de leitura e escrita" : "Assessor com acesso de leitura";
  const roleDesc =
    role === "advisor_write"
      ? "Você poderá visualizar e interagir com o portfólio, incluindo sessões de conselho e importação de posições."
      : "Você poderá visualizar o portfólio, posições e sessões de conselho, sem permissão para fazer alterações.";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite para a plataforma Invest</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0a0a0a;padding:32px 40px;">
              <p style="margin:0;font-size:20px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">Invest</p>
              <p style="margin:6px 0 0;font-size:12px;color:#888888;letter-spacing:0.5px;text-transform:uppercase;">Gestão de patrimônio familiar</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 24px;font-size:22px;font-weight:600;color:#0a0a0a;letter-spacing:-0.3px;">Você foi convidado como assessor</p>

              <p style="margin:0 0 20px;font-size:15px;color:#444444;line-height:1.6;">
                <strong>${escapeHtml(inviterName)}</strong> convidou você para acompanhar o portfólio familiar dele na plataforma Invest.
              </p>

              <!-- Role badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#f0f0f0;border-radius:6px;padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#888888;text-transform:uppercase;letter-spacing:0.8px;">Nível de acesso</p>
                    <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#0a0a0a;">${roleLabel}</p>
                    <p style="margin:0;font-size:13px;color:#666666;line-height:1.5;">${roleDesc}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:14px;color:#666666;line-height:1.6;">
                Para aceitar o convite, clique no botão abaixo. Você precisará criar uma conta com este endereço de email ou fazer login caso já tenha uma.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0a0a0a;border-radius:6px;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
                      Aceitar convite
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #eeeeee;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0 0 8px;font-size:12px;color:#999999;line-height:1.6;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="margin:0 0 20px;font-size:12px;color:#666666;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#0a0a0a;">${inviteUrl}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#bbbbbb;line-height:1.6;">
                Este convite foi enviado por solicitação de ${escapeHtml(inviterName)}. Se você não esperava receber este email, pode ignorá-lo com segurança.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${escapeHtml(inviterName)} convidou você para o Invest`,
    html,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
