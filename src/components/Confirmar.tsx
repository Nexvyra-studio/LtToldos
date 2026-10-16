"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LuCheck, LuTrash2, LuTriangleAlert } from "react-icons/lu";

export interface OpcoesConfirmar {
  titulo: string;
  mensagem?: ReactNode;
  /** texto do botão de confirmar */
  confirmar: string;
  /** ok = verde (marcar pago/finalizar) · perigo = vermelho (excluir) */
  tom?: "ok" | "perigo" | "neutro";
}

type Pedido = OpcoesConfirmar & { responder: (sim: boolean) => void };

const Ctx = createContext<(o: OpcoesConfirmar) => Promise<boolean>>(async () => true);

/** Janela de confirmação para evitar toque errado. Uso: `if (await confirmar({...})) ...` */
export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const botaoSim = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback(
    (o: OpcoesConfirmar) =>
      new Promise<boolean>((resolve) => {
        setPedido({ ...o, responder: resolve });
      }),
    [],
  );

  const responder = useCallback(
    (sim: boolean) => {
      pedido?.responder(sim);
      setPedido(null);
    },
    [pedido],
  );

  useEffect(() => {
    if (!pedido) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && responder(false);
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => botaoSim.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [pedido, responder]);

  const tom = pedido?.tom ?? "ok";
  const Icone = tom === "perigo" ? LuTrash2 : tom === "ok" ? LuCheck : LuTriangleAlert;

  return (
    <Ctx.Provider value={confirmar}>
      {children}
      {pedido && (
        <div className="confirmar-raiz" role="presentation">
          <div className="confirmar-fundo" onClick={() => responder(false)} />
          <div
            className={`confirmar confirmar-${tom}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmar-titulo"
          >
            <span className="confirmar-icone" aria-hidden>
              <Icone />
            </span>
            <h2 id="confirmar-titulo">{pedido.titulo}</h2>
            {pedido.mensagem && <div className="confirmar-msg">{pedido.mensagem}</div>}
            <div className="confirmar-botoes">
              <button type="button" className="botao-secundario" onClick={() => responder(false)}>
                Cancelar
              </button>
              <button
                type="button"
                ref={botaoSim}
                className={tom === "perigo" ? "botao-perigo-cheio" : "botao-principal botao-ok"}
                onClick={() => responder(true)}
              >
                {pedido.confirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useConfirmar = () => useContext(Ctx);
