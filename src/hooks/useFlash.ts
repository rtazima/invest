"use client";

import { useEffect, useRef, useState } from "react";

export function useFlash(value: number): "up" | "down" | null {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevRef.current === null) {
      prevRef.current = value;
      return;
    }
    if (prevRef.current === value) return;
    const direction = value > prevRef.current ? "up" : "down";
    prevRef.current = value;
    setFlash(direction);
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [value]);

  return flash;
}
