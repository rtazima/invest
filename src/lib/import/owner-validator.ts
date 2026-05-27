import type { DocumentOwner } from "@/lib/csv/types";

interface HolderInfo {
  name: string;
  full_name: string | null;
  cpf: string | null;
}

const STOP_WORDS = new Set(["de", "da", "do", "dos", "das", "e", "el", "la"]);

function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function nameWords(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

// Retorna mensagem de erro se o owner do documento não bater com o holder, null se ok.
export function validateDocumentOwner(
  doc: DocumentOwner,
  holder: HolderInfo,
): string | null {
  // CPF bate → confiança máxima
  if (doc.cpf && holder.cpf) {
    const docCpf = normalizeCPF(doc.cpf);
    const holderCpf = normalizeCPF(holder.cpf);
    if (docCpf && holderCpf && docCpf !== holderCpf) {
      return `CPF do arquivo (${doc.cpf}) não corresponde ao titular "${holder.name}" selecionado.`;
    }
    return null;
  }

  // Valida pelo nome quando CPF não está disponível
  if (doc.name) {
    const docWords = nameWords(doc.name);
    if (docWords.length === 0) return null;

    const holderWords = nameWords(
      [holder.name, holder.full_name].filter(Boolean).join(" "),
    );

    // Aceita match exato ou por prefixo (min 4 chars): "grasi" bate com "grasiele"
    const hasMatch = docWords.some((dw) =>
      holderWords.some(
        (hw) =>
          hw === dw ||
          (hw.length >= 4 && dw.startsWith(hw)) ||
          (dw.length >= 4 && hw.startsWith(dw)),
      ),
    );

    if (!hasMatch) {
      return `Nome no arquivo ("${doc.name}") não corresponde ao titular "${holder.name}" selecionado. Verifique se escolheu o titular correto.`;
    }
  }

  return null;
}
