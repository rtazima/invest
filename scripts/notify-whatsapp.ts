interface NotifyPayload {
  status: "passed";
  deployUrl?: string;
  commitMsg?: string;
  passed?: number;
  failed?: number;
  failedTests?: string[];
  error?: string;
}

export async function notifyWhatsApp(payload: NotifyPayload): Promise<void> {
  const apiUrl = process.env["EVOLUTION_API_URL"];
  const apiKey = process.env["EVOLUTION_API_KEY"];
  const instance = process.env["EVOLUTION_INSTANCE"];
  const to = process.env["WHATSAPP_NOTIFY_TO"]; // ex: "5511999999999@s.whatsapp.net"

  if (!apiUrl || !apiKey || !instance || !to) {
    console.warn(
      "WhatsApp não configurado (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, WHATSAPP_NOTIFY_TO).",
    );
    return;
  }

  const lines = [`✅ Deploy OK — ${payload.passed ?? "todos"} testes passando`];

  if (payload.commitMsg) lines.push(`📝 ${payload.commitMsg}`);
  if (payload.deployUrl) lines.push(`🔗 ${payload.deployUrl}`);

  const text = lines.join("\n");

  const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: to,
      options: { delay: 0 },
      textMessage: { text },
    }),
  });

  if (!res.ok) {
    console.error(`WhatsApp notify falhou: ${res.status} ${await res.text()}`);
  } else {
    console.log("WhatsApp enviado ✅");
  }
}

// Permite rodar direto: tsx scripts/notify-whatsapp.ts
if (process.argv[2]) {
  notifyWhatsApp({ status: "passed", deployUrl: "https://example.com", commitMsg: "teste" });
}
