"use client";

import { COLECOES, mensagemErroBanco } from "../firebase";
import { criarRepo, useConsulta } from "./repo";

/** despesa = compra (a pagar) · receita = serviço/entrada (a receber) */
export type TipoLancamento = "despesa" | "receita";

export interface Lancamento {
  id: string;
  /** lançamentos antigos sem tipo contam como despesa */
  tipo?: TipoLancamento;
  /** serviço que gerou este lançamento (receita de toldo) */
  servicoId?: string | null;
  /** opcional: em branco vira "Compra de dd/mm" na tela */
  descricao: string;
  valor: number;
  /** dia da compra, yyyy-mm-dd */
  data: string;
  pago: boolean;
  /** despesa: pago · receita: recebido */
  dataPagamento: string | null;
  criadoEm: number;
  criadoPor?: string | null;
}

export const tipoDe = (l: Pick<Lancamento, "tipo">): TipoLancamento => l.tipo ?? "despesa";

export const lancamentosRepo = criarRepo<Lancamento>(COLECOES.lancamentos, (a, b) =>
  a.data === b.data ? b.criadoEm - a.criadoEm : a.data < b.data ? 1 : -1,
);

/** lançamentos do período (campo `data`, yyyy-mm-dd); null = ainda não buscou */
export function useLancamentos(periodo: { de: string | null; ate: string | null } | null) {
  const faixa = periodo ? { campo: "data", de: periodo.de, ate: periodo.ate } : null;
  const r = useConsulta(lancamentosRepo, faixa);
  return { ...r, erro: r.erro ? mensagemErroBanco(r.erro) : null };
}
