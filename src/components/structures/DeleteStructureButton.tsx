"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteStructureAction } from "@/app/(app)/holders/[holderId]/structures/actions";

interface Props {
  holderId: string;
  structureId: string;
}

export function DeleteStructureButton({ holderId, structureId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Excluir esta estrutura? O badge no dashboard será removido.")) return;
    startTransition(async () => {
      await deleteStructureAction(holderId, structureId);
      router.push(`/holders/${holderId}/structures`);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      style={{
        fontSize: "12px",
        padding: "5px 12px",
        borderRadius: "5px",
        border: "1px solid var(--color-crit)",
        backgroundColor: "transparent",
        color: "var(--color-crit)",
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
