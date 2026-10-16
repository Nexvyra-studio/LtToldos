"use client";

import type { EntradaCortina, Modelo, ResultadoCortina } from "../calc/cortina";
import { COLECOES, mensagemErroBanco } from "../firebase";
import { criarRepo, useConsulta } from "./repo";

export interface CalculoSalvo {
  id: string;
  tipo: Modelo;
  cliente: string;
  entrada: EntradaCortina;
  resultado: ResultadoCortina;
  criadoEm: number;
  criadoPor?: string | null;
  /** valor cobrado do cliente pelo serviço (R$) */
  valor?: number;
  /** aberto = em produção · finalizado = entregue (e recebido) */
  status?: "aberto" | "finalizado";
  /** dia em que foi finalizado, yyyy-mm-dd */
  finalizadoEm?: string | null;
  /** lançamento "a receber" criado no financeiro */
  lancamentoId?: string | null;
}

export const statusDe = (c: Pick<CalculoSalvo, "status">) => c.status ?? "aberto";

export const calculosRepo = criarRepo<CalculoSalvo>(
  COLECOES.calculos,
  (a, b) => b.criadoEm - a.criadoEm,
);

/** serviços salvos no período (dias yyyy-mm-dd, pelo `criadoEm`); null = ainda não buscou */
export function useCalculos(periodo: { de: string | null; ate: string | null } | null) {
  const faixa = periodo
    ? {
        campo: "criadoEm",
        de: periodo.de ? new Date(`${periodo.de}T00:00:00`).getTime() : null,
        ate: periodo.ate ? new Date(`${periodo.ate}T23:59:59.999`).getTime() : null,
      }
    : null;
  const r = useConsulta(calculosRepo, faixa);
  return { ...r, erro: r.erro ? mensagemErroBanco(r.erro) : null };
}
