"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastData {
  id: number;
  mensagem: string;
  acao?: { rotulo: string; executar: () => void };
}

const Ctx = createContext<(t: Omit<ToastData, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((t: Omit<ToastData, "id">) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div className="toast-area" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.mensagem}</span>
            {toast.acao && (
              <button
                type="button"
                onClick={() => {
                  toast.acao!.executar();
                  setToast(null);
                }}
              >
                {toast.acao.rotulo}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
