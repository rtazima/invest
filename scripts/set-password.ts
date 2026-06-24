// Define a senha de um usuário existente via admin do Supabase.
// Uso pontual para migrar do magic link para login por senha.
//
// 1. No .env.local, adicione:
//      OWNER_EMAIL=seu@email.com
//      OWNER_PASSWORD=uma-senha-forte
// 2. Rode: pnpm tsx scripts/set-password.ts
// 3. Remova OWNER_PASSWORD do .env.local depois.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const service = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const email = process.env["OWNER_EMAIL"];
const password = process.env["OWNER_PASSWORD"];

async function main() {
  if (!url || !service) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  if (!email || !password) throw new Error("Defina OWNER_EMAIL e OWNER_PASSWORD no .env.local");
  if (password.length < 8) throw new Error("Senha muito curta (mínimo 8 caracteres)");

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // localiza o usuário pelo e-mail
  let user: { id: string; email?: string } | undefined;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user || data.users.length < 200) break;
  }
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`updateUserById: ${error.message}`);

  console.log(`Senha definida para ${email}. Já dá pra logar com e-mail + senha.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
