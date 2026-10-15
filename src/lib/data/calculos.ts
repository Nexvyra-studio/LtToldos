"use client";

import { useEffect, useState } from "react";
import type { EntradaCortina, Modelo, ResultadoCortina } from "../calc/cortina";
import { criarRepo } from "./repo";

export interface CalculoSalvo {
  id: string;
  tipo: Modelo;
  cliente: string;
  entrada: EntradaCortina;
  resultado: ResultadoCortina;
  criadoEm: number;
  criadoPor?: string | null;
}

export const calculosRepo = criarRepo<CalculoSalvo>(
  "calculos",
  (a, b) => b.criadoEm - a.criadoEm,
);

export function useCalculos() {
  const [itens, setItens] = useState<CalculoSalvo[]>([]);
  useEffect(() => calculosRepo.subscribe(setItens), []);
  return itens;
}
