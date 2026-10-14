"use client";

import { useMemo, useState, type FormEvent } from "react";
import { LuCalendar, LuCheck, LuTrash2 } from "react-icons/lu";
import type { Lancamento } from "@/lib/data/lancamentos";
import { centavosParaTexto, formatDataCurta, hojeISO } from "@/lib/format";

export interface DadosForm {
  valor: number;
  data: string;
  descricao: string;
  pago: boolean;
}

interface Props {
  inicial?: Lancamento;
  sugestoes: string[];
  onSalvar(d: DadosForm): Promise<void> | void;
  onExcluir?(): void;
}

/** Formulário curto: só o valor é obrigatório */
export function FormLancamento({ inicial, sugestoes, onSalvar, onExcluir }: Props) {
  const [centavos, setCentavos] = useState(inicial ? Math.round(inicial.valor * 100) : 0);
  const [data, setData] = useState(inicial?.data ?? hojeISO());
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [pago, setPago] = useState(inicial?.pago ?? false);
  const [enviando, setEnviando] = useState(false);
  const [tentou, setTentou] = useState(false);

  const filtradas = useMemo(() => {
    const t = descricao.trim().toLowerCase();
    return sugestoes
      .filter((s) => s.toLowerCase() !== t && (!t || s.toLowerCase().includes(t)))
      .slice(0, 6);
  }, [descricao, sugestoes]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (centavos <= 0) return;
    setEnviando(true);
    try {
      await onSalvar({ valor: centavos / 100, data, descricao: descricao.trim(), pago });
    } finally {
      setEnviando(false);
    }
  }

  const hoje = hojeISO();

  return (
    <form className="form-lanc" onSubmit={enviar}>
      <label className="valor-grande">
        <span className="sr-only">Valor</span>
        <em>R$</em>
        <input
          data-autofocus
          inputMode="numeric"
          enterKeyHint="done"
          value={centavosParaTexto(centavos)}
          aria-invalid={tentou && centavos <= 0}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, "").slice(0, 11);
            setCentavos(Number(digitos || 0));
          }}
          onFocus={(e) => {
            const el = e.target;
            requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
          }}
        />
      </label>
      {tentou && centavos <= 0 && (
        <p className="erro" role="alert">Digite o valor da compra.</p>
      )}

      <div className="linha-data">
        <label className="chip-data">
          <LuCalendar aria-hidden />
          <span>{data === hoje ? "Hoje" : formatDataCurta(data)}</span>
          <input
            type="date"
            value={data}
            max={hoje}
            onChange={(e) => e.target.value && setData(e.target.value)}
            aria-label="Data da compra"
          />
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={pago}
          className={`chave-pago${pago ? " ligada" : ""}`}
          onClick={() => setPago((p) => !p)}
        >
          <span className="chave-trilho" aria-hidden><span /></span>
          {pago ? "Já está pago" : "A pagar"}
        </button>
      </div>

      <label className="campo">
        <span>Descrição</span>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={`Opcional, ex.: Compra de ${formatDataCurta(data)}`}
          maxLength={80}
          autoComplete="off"
        />
      </label>
      {filtradas.length > 0 && (
        <div className="sugestoes" aria-label="Sugestões">
          {filtradas.map((s) => (
            <button key={s} type="button" onClick={() => setDescricao(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <button className="botao-principal" disabled={enviando}>
        <LuCheck aria-hidden />
        {enviando ? "Salvando…" : inicial ? "Salvar alterações" : "Salvar compra"}
      </button>

      {onExcluir && (
        <button type="button" className="botao-perigo" onClick={onExcluir}>
          <LuTrash2 aria-hidden /> Excluir compra
        </button>
      )}
    </form>
  );
}
