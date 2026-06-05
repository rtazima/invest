/**
 * Servidor local para conectar BTG via Pluggy Connect widget.
 * Abre uma página no browser, você autoriza o BTG, e captura o Item ID.
 *
 * Uso: pnpm tsx scripts/pluggy-connect-local.ts
 */

import { config } from "dotenv";
import { createServer } from "http";
import { exec } from "child_process";
config({ path: ".env.local" });

const BASE = "https://api.pluggy.ai";
const PORT = 4242;

async function getApiKey(): Promise<string> {
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });
  const { apiKey } = await res.json() as { apiKey: string };
  return apiKey;
}

async function getConnectToken(apiKey: string): Promise<string> {
  const res = await fetch(`${BASE}/connect_token`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ webhookUrl: `http://localhost:${PORT}/webhook` }),
  });
  if (!res.ok) {
    throw new Error(`connect_token falhou: ${res.status} ${await res.text()}`);
  }
  const { accessToken } = await res.json() as { accessToken: string };
  return accessToken;
}

const html = (connectToken: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Conectar BTG — Pluggy</title>
  <style>
    body { font-family: system-ui; background: #0f1117; color: #e2e8f0;
           display: flex; flex-direction: column; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; gap: 1.5rem; }
    h1  { font-size: 1.25rem; font-weight: 600; margin: 0; }
    p   { font-size: 0.875rem; color: #94a3b8; margin: 0; text-align: center; }
    button {
      padding: 0.625rem 1.5rem; background: #3b82f6; color: white;
      border: none; border-radius: 0.5rem; font-size: 0.875rem;
      font-weight: 500; cursor: pointer;
    }
    button:hover { background: #2563eb; }
    #status { font-size: 0.8rem; color: #64748b; }
    #result { display: none; padding: 1rem 1.5rem; background: #1e293b;
              border: 1px solid #334155; border-radius: 0.5rem;
              font-family: monospace; font-size: 0.8125rem; max-width: 480px;
              white-space: pre-wrap; }
    #result.ok  { border-color: #22c55e; color: #86efac; }
    #result.err { border-color: #ef4444; color: #fca5a5; }
  </style>
</head>
<body>
  <h1>Conectar BTG Pactual via Pluggy</h1>
  <p>Clique abaixo, procure por BTG e autorize com CPF + senha.</p>
  <button id="btn" onclick="openWidget()">Conectar BTG</button>
  <div id="status">aguardando...</div>
  <div id="result"></div>

  <script>
    const CONNECT_TOKEN = "${connectToken}";

    function setStatus(msg) {
      document.getElementById("status").textContent = msg;
    }

    function openWidget() {
      document.getElementById("btn").disabled = true;
      setStatus("carregando widget...");

      // carrega o script do Pluggy Connect dinamicamente
      const script = document.createElement("script");
      script.src = "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js";
      script.onerror = () => setStatus("❌ falhou ao carregar pluggy-connect.js — verifique console");
      script.onload = () => {
        setStatus("widget carregado, abrindo...");
        try {
          const widget = new PluggyConnect({
            connectToken: CONNECT_TOKEN,
            includeSandbox: true,
            onSuccess: async ({ item }) => {
              document.getElementById("result").className = "ok";
              document.getElementById("result").style.display = "block";
              document.getElementById("result").textContent =
                "✅  Item ID: " + item.id +
                "\\n\\nAdicione no .env.local:\\nPLUGGY_ITEM_ID_BTG=" + item.id;
              setStatus("conectado!");
              await fetch("/item-connected?id=" + item.id).catch(() => {});
            },
            onError: (err) => {
              document.getElementById("result").className = "err";
              document.getElementById("result").style.display = "block";
              document.getElementById("result").textContent = "❌  " + JSON.stringify(err, null, 2);
              document.getElementById("btn").disabled = false;
              setStatus("erro — veja acima");
            },
            onClose: () => {
              document.getElementById("btn").disabled = false;
              setStatus("widget fechado");
            },
          });
          widget.init();
        } catch(e) {
          setStatus("❌ erro ao iniciar widget: " + e.message);
          document.getElementById("btn").disabled = false;
        }
      };
      document.head.appendChild(script);
    }
  </script>
</body>
</html>`;

async function main() {
  console.log("\n🔑  Obtendo credenciais Pluggy...");
  const apiKey = await getApiKey();
  const connectToken = await getConnectToken(apiKey);
  console.log("✅  Connect token gerado\n");

  let resolveItemId: (id: string) => void;
  const itemIdPromise = new Promise<string>((res) => { resolveItemId = res; });

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html(connectToken));
      return;
    }

    if (url.pathname === "/item-connected") {
      const itemId = url.searchParams.get("id") ?? "";
      res.writeHead(200);
      res.end("ok");
      resolveItemId(itemId);
      return;
    }

    if (url.pathname === "/webhook") {
      let body = "";
      req.on("data", (d) => { body += d; });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body) as { event?: string; itemId?: string };
          if (payload.event === "item/updated" && payload.itemId) {
            resolveItemId(payload.itemId);
          }
        } catch { /* ignora */ }
        res.writeHead(200); res.end("ok");
      });
      return;
    }

    res.writeHead(404); res.end();
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`🌐  Servidor local em ${url}`);
    console.log("   Abrindo no browser...\n");
    exec(`open "${url}"`);
    console.log("👆  Selecione BTG Pactual Investimentos e faça login com CPF + senha BTG\n");
  });

  const itemId = await itemIdPromise;
  console.log(`\n✅  BTG conectado!`);
  console.log(`   Item ID: ${itemId}`);
  console.log(`\n   Adicione no .env.local:`);
  console.log(`   PLUGGY_ITEM_ID_BTG=${itemId}`);
  console.log(`\n   Depois rode:`);
  console.log(`   pnpm tsx scripts/pluggy-quality-check.ts\n`);

  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ ", err instanceof Error ? err.message : err);
  process.exit(1);
});
