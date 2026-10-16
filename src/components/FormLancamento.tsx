"use client";

import { useMemo, useState, type FormEvent } from "react";
import { LuArrowDownLeft, LuArrowUpRight, LuCalendar, LuCheck, LuTrash2 } from "react-icons/lu";
import { tipoDe, type Lancamento, type TipoLancamento } from "@/lib/data/lancamentos";
import { centavosParaTexto, formatDataCurta, hojeISO } from "@/lib/format";

export interface DadosForm {
  tipo: TipoLancamento;
  valor: number;
  data: string;
  descricao: string;
  pago: boolean;
}

interface Props {
  inicial?: Lancamento;
  tipoInicial?: TipoLancamento;
  sugestoes: string[];
  onSalvar(d: DadosForm): Promise<void> | void;
  onExcluir?(): void;
}

/** Formulário curto: só o valor é obrigatório */
export function FormLancamento({ inicial, tipoInicial = "despesa", sugestoes, onSalvar, onExcluir }: Props) {
  const [tipo, setTipo] = useState<TipoLancamento>(inicial ? tipoDe(inicial) : tipoInicial);
  const [centavos, setCentavos] = useState(inicial ? Math.round(inicial.valor * 100) : 0);
  const [data, setData] = useState(inicial?.data ?? hojeISO());
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [pago, setPago] = useState(inicial?.pago ?? false);
  const [enviando, setEnviando] = useState(false);
  const [tentou, setTentou] = useState(false);

  const deServico = !!inicial?.servicoId;
  const receita = tipo === "receita";

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
      await onSalvar({ tipo, valor: centavos / 100, data, descricao: descricao.trim(), pago });
    } finally {
      setEnviando(false);
    }
  }

  const hoje = hojeISO();

  return (
    <form className="form-lanc" onSubmit={enviar}>
      {!deServico && (
        <div className="segmentado tipo-lanc" role="radiogroup" aria-label="Tipo de lançamento">
          <button
            type="button"
            role="radio"
            aria-checked={!receita}
            className={!receita ? "ativo saida" : undefined}
            onClick={() => setTipo("despesa")}
          >
            <LuArrowUpRight aria-hidden /> Compra
            <small>sai dinheiro</small>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={receita}
            className={receita ? "ativo entrada" : undefined}
            onClick={() => setTipo("receita")}
          >
            <LuArrowDownLeft aria-hidden /> Entrada
            <small>entra dinheiro</small>
          </button>
        </div>
      )}
      {deServico && (
        <p className="aviso-servico">
          Lançamento de um serviço de toldo. O cliente e a exclusão ficam na página <b>Serviços</b>; marcar como
          recebido aqui também finaliza o serviço.
        </p>
      )}

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
        <p className="erro" role="alert">Digite o valor.</p>
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
            aria-label="Data"
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
          {receita ? (pago ? "Já recebido" : "A receber") : pago ? "Já está pago" : "A pagar"}
        </button>
      </div>

      {!deServico && (
        <>
          <label className="campo">
            <span>Descrição</span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={receita ? "Opcional, ex.: Conserto de toldo" : `Opcional, ex.: Compra de ${formatDataCurta(data)}`}
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
        </>
      )}

      <button className="botao-principal" disabled={enviando}>
        <LuCheck aria-hidden />
        {enviando ? "Salvando…" : inicial ? "Salvar alterações" : receita ? "Salvar entrada" : "Salvar compra"}
      </button>

      {onExcluir && !deServico && (
        <button type="button" className="botao-perigo" onClick={onExcluir}>
          <LuTrash2 aria-hidden /> Excluir lançamento
        </button>
      )}
    </form>
  );
}
