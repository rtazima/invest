// Formata data para pt-BR. Ex: "2024-01-15" → "15/01/2024"
export function formatDateBR(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

// Formata datetime para pt-BR. Ex: "2024-01-15T10:30:00Z" → "15/01/2024 07:30"
export function formatDatetimeBR(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

// Retorna true se a cota do fundo está desatualizada (D+1 ou D+2)
// quota_date null ou anterior a ontem → stale
export function isStaleQuota(quotaDate: string | null | undefined): boolean {
  if (!quotaDate) return true;
  const qd = new Date(quotaDate + "T00:00:00");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return qd < yesterday;
}

// Dias até a data de vencimento (negativo = já venceu)
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Retorna label amigável para proximidade de vencimento
export function maturityLabel(date: string | null | undefined): string | null {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return "Vencido";
  if (days === 0) return "Vence hoje";
  if (days <= 7) return `${days}d`;
  if (days <= 30) return `${days}d`;
  return null;
}
