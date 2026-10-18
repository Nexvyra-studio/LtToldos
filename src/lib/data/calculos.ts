"use client";

import type { EntradaCortina, Modelo, ResultadoCortina } from "../calc/cortina";
import { COLECOES, mensagemErroBanco } from "../firebase";
import { criarRepo, useConsulta } from "./repo";

/** um toldo dentro do serviço (tipo + medidas + resultado do cálculo) */
export interface ItemServico {
  id: string;
  tipo: Modelo;
  entrada: EntradaCortina;
  resultado: ResultadoCortina;
}

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
  /**
   * Todos os toldos do serviço. Serviços antigos não têm este campo: o toldo único
   * fica em tipo/entrada/resultado. Nos novos, tipo/entrada/resultado repetem o 1º toldo.
   */
  itens?: ItemServico[];
}

/** toldos do serviço (funciona com serviços antigos, de um toldo só) */
export function itensDe(c: Pick<CalculoSalvo, "id" | "tipo" | "entrada" | "resultado" | "itens">): ItemServico[] {
  if (c.itens && c.itens.length > 0) return c.itens;
  return [{ id: `${c.id}-1`, tipo: c.tipo ?? "cortina", entrada: c.entrada, resultado: c.resultado }];
}

/** metros de lona de um toldo (já com quantidade e laterais) */
export const metrosItem = (i: Pick<ItemServico, "resultado">) =>
  i.resultado.metrosGeral ?? i.resultado.metrosRolo ?? i.resultado.metrosTotal ?? 0;

/** metros de cristal de um toldo (cortina com visor) */
export const cristalItem = (i: Pick<ItemServico, "resultado">) => i.resultado.metrosCristalTotal ?? 0;

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
