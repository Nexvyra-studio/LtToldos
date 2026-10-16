"use client";

import { useEffect, useState } from "react";
import type { EntradaCortina, Modelo, ResultadoCortina } from "../calc/cortina";
import { COLECOES } from "../firebase";
import { criarRepo } from "./repo";

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

export function useCalculos() {
  const [itens, setItens] = useState<CalculoSalvo[]>([]);
  useEffect(() => calculosRepo.subscribe(setItens, (e) => console.error("[Firestore] calculos", e)), []);
  return itens;
}
