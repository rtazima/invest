"use client";

import { deleteFamilyMember } from "@/app/(app)/familia/actions";

interface Props {
  holderId: string;
  holderName: string;
}

export function DeleteMemberButton({ holderId, holderName }: Props) {
  return (
    <form action={deleteFamilyMember}>
      <input type="hidden" name="holder_id" value={holderId} />
      <button
        type="submit"
        title="Excluir"
        onClick={(e) => {
          if (!confirm(`Excluir ${holderName}? Esta ação não pode ser desfeita.`)) {
            e.preventDefault();
          }
        }}
        style={{
          display: "grid",
          placeItems: "center",
          width: "28px",
          height: "28px",
          borderRadius: "6px",
          color: "var(--color-text-muted)",
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
        </svg>
      </button>
    </form>
  );
}
