"use client";

import { useEffect, useState } from "react";
import { COLECOES, mensagemErroBanco } from "../firebase";
import { criarRepo } from "./repo";

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

export function useLancamentos() {
  const [itens, setItens] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(
    () =>
      lancamentosRepo.subscribe(
        (lista) => {
          setItens(lista);
          setCarregando(false);
        },
        (e) => {
          setErro(mensagemErroBanco(e));
          setCarregando(false);
        },
      ),
    [],
  );

  return { itens, carregando, erro };
}
