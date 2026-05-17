"use client";

import { useState } from "react";
import { ChatPanel } from "./ChatPanel";

interface HolderOption {
  id: string;
  name: string;
}

interface Props {
  isOwner: boolean;
  holders: HolderOption[];
  myHolderId?: string;
}

export function ChatTrigger({ isOwner, holders, myHolderId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <ChatPanel
          onClose={() => setOpen(false)}
          isOwner={isOwner}
          holders={holders}
          defaultHolderId={myHolderId}
        />
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir assistente"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "var(--color-brand)",
          border: "none",
          color: "white",
          fontSize: "1.25rem",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? "✕" : "✦"}
      </button>
    </>
  );
}
