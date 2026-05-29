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

function applyPrivacy(hidden: boolean) {
  document.documentElement.style.setProperty("--privacy-blur", hidden ? "8px" : "0px");
  document.documentElement.style.setProperty("--privacy-select", hidden ? "none" : "auto");
}

export function PrivacyShell({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("invest_privacy") === "1";
    setHidden(stored);
    applyPrivacy(stored);
  }, []);

  useEffect(() => {
    applyPrivacy(hidden);
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
