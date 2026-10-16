"use client";

import type { EntradaCortina, Modelo, ResultadoCortina } from "../calc/cortina";
import { formatNum, hojeISO } from "../format";
import { calculosRepo, type CalculoSalvo } from "./calculos";
import { lancamentosRepo, type Lancamento } from "./lancamentos";

/**
 * Serviço = cálculo de toldo salvo com cliente e valor.
 * Ao salvar, cria no financeiro um lançamento "a receber".
 * Ao finalizar o serviço, o lançamento passa a "recebido" (e vice-versa).
 */

export const NOME_TIPO: Record<Modelo, string> = {
  cortina: "Cortina",
  casca: "Casca",
  "casca-bando": "Casca com bandô",
  "fixo-lateral": "Fixo com lateral",
};

export const ROTA_TIPO: Record<Modelo, string> = {
  cortina: "/toldos/cortina",
  casca: "/toldos/casca",
  "casca-bando": "/toldos/casca-bando",
  "fixo-lateral": "/toldos/fixo-lateral",
};

/** chave usada para abrir um serviço salvo na calculadora */
export const CHAVE_ABRIR = "toldos:abrir-servico";

export function descricaoServico(cliente: string, tipo: Modelo, entrada: Pick<EntradaCortina, "largura" | "altura">) {
  const quem = cliente.trim() || "Sem referência";
  return `${quem}: ${NOME_TIPO[tipo]} ${formatNum(entrada.largura)}×${formatNum(entrada.altura)}`.slice(0, 80);
}

export async function salvarServico(d: {
  tipo: Modelo;
  cliente: string;
  entrada: EntradaCortina;
  resultado: ResultadoCortina;
  valor: number;
}) {
  const servicoId = calculosRepo.novoId();
  const lancamentoId = lancamentosRepo.novoId();
  const agora = Date.now();
  await lancamentosRepo.criar(
    {
      tipo: "receita",
      servicoId,
      descricao: descricaoServico(d.cliente, d.tipo, d.entrada),
      valor: d.valor,
      data: hojeISO(),
      pago: false,
      dataPagamento: null,
      criadoEm: agora,
    },
    lancamentoId,
  );
  await calculosRepo.criar(
    {
      tipo: d.tipo,
      cliente: d.cliente.trim(),
      entrada: d.entrada,
      resultado: d.resultado,
      criadoEm: agora,
      valor: d.valor,
      status: "aberto",
      finalizadoEm: null,
      lancamentoId,
    },
    servicoId,
  );
  return { servicoId, lancamentoId };
}

/** finaliza (true) ou reabre (false) o serviço e acompanha o recebimento no financeiro */
export async function definirFinalizado(c: CalculoSalvo, finalizado: boolean) {
  const dia = finalizado ? hojeISO() : null;
  await calculosRepo.atualizar(c.id, { status: finalizado ? "finalizado" : "aberto", finalizadoEm: dia });
  if (c.lancamentoId) {
    await lancamentosRepo.atualizar(c.lancamentoId, { pago: finalizado, dataPagamento: dia }).catch(() => {});
  }
}

/** usado pelo financeiro: marcar recebido também finaliza o serviço ligado */
export async function sincronizarDoFinanceiro(l: Lancamento, recebido: boolean) {
  if (!l.servicoId) return;
  await calculosRepo
    .atualizar(l.servicoId, { status: recebido ? "finalizado" : "aberto", finalizadoEm: recebido ? hojeISO() : null })
    .catch(() => {});
}

export async function editarServico(c: CalculoSalvo, dados: { cliente: string; valor: number }) {
  await calculosRepo.atualizar(c.id, { cliente: dados.cliente.trim(), valor: dados.valor });
  if (c.lancamentoId) {
    await lancamentosRepo
      .atualizar(c.lancamentoId, { valor: dados.valor, descricao: descricaoServico(dados.cliente, c.tipo, c.entrada) })
      .catch(() => {});
  }
}

/** exclui o serviço e o lançamento ligado; devolve uma função para desfazer */
export async function excluirServico(c: CalculoSalvo, lancamento?: Lancamento | null) {
  await calculosRepo.excluir(c.id);
  if (c.lancamentoId) await lancamentosRepo.excluir(c.lancamentoId).catch(() => {});
  return async () => {
    await calculosRepo.restaurar(c);
    if (lancamento) await lancamentosRepo.restaurar(lancamento);
  };
}
