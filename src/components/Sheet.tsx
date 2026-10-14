"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LuX } from "react-icons/lu";

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar(): void;
  children: ReactNode;
}

/** Painel que sobe da parte de baixo da tela (bottom sheet) */
export function Sheet({ aberto, titulo, onFechar, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="sheet-raiz" role="presentation">
      <div className="sheet-fundo" onClick={onFechar} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="sheet-alca" aria-hidden />
        <div className="sheet-topo">
          <h2>{titulo}</h2>
          <button type="button" className="icone-btn" onClick={onFechar} aria-label="Fechar">
            <LuX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
