"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface PrivacyCtxValue {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyCtx = createContext<PrivacyCtxValue>({ hidden: false, toggle: () => {} });

export function usePrivacy() {
  return useContext(PrivacyCtx);
}

export function PrivacyShell({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("invest_privacy") === "1";
    setHidden(stored);
    if (stored) document.documentElement.setAttribute("data-privacy-hidden", "");
  }, []);

  useEffect(() => {
    if (hidden) {
      document.documentElement.setAttribute("data-privacy-hidden", "");
    } else {
      document.documentElement.removeAttribute("data-privacy-hidden");
    }
  }, [hidden]);

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem("invest_privacy", next ? "1" : "0");
      return next;
    });
  }

  return (
    <PrivacyCtx.Provider value={{ hidden, toggle }}>
      <div style={{ display: "flex", minHeight: "100dvh", backgroundColor: "var(--color-bg)" }}>
        {children}
      </div>
    </PrivacyCtx.Provider>
  );
}
