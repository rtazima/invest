export function normalizeCPF(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCPF(value: string): string {
  const d = normalizeCPF(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function validateCPF(value: string): boolean {
  const cpf = normalizeCPF(value);
  if (cpf.length !== 11) return false;
  if (/^(.)\1+$/.test(cpf)) return false; // todos os dígitos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i] ?? "0") * (10 - i);
  }
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(cpf[9] ?? "0")) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i] ?? "0") * (11 - i);
  }
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(cpf[10] ?? "0")) return false;

  return true;
}
