"use client";

import type { Modelo } from "../calc/cortina";
import { formatNum, hojeISO } from "../format";
import { calculosRepo, itensDe, type CalculoSalvo, type ItemServico } from "./calculos";
import { lancamentosRepo, type Lancamento } from "./lancamentos";

/**
 * Serviço = um ou mais toldos calculados, com cliente e valor.
 * Ao salvar, cria no financeiro um lançamento "a receber".
 * Ao finalizar o serviço, o lançamento passa a "recebido" (e vice-versa).
 */

export const NOME_TIPO: Record<Modelo, string> = {
  cortina: "Cortina",
  "cortina-visor": "Cortina com visor",
  casca: "Casca",
  "casca-bando": "Casca com bandô",
  "fixo-lateral": "Fixo com lateral",
};

export const ROTA_TIPO: Record<Modelo, string> = {
  cortina: "/toldos/cortina",
  "cortina-visor": "/toldos/cortina-visor",
  casca: "/toldos/casca",
  "casca-bando": "/toldos/casca-bando",
  "fixo-lateral": "/toldos/fixo-lateral",
};

/** "Cortina 300×200" (+ "× 2" quando são vários iguais) */
export function nomeItem(i: Pick<ItemServico, "tipo" | "entrada">) {
  const q = i.entrada.quantidade > 1 ? ` × ${i.entrada.quantidade}` : "";
  return `${NOME_TIPO[i.tipo] ?? "Toldo"} ${formatNum(i.entrada.largura)}×${formatNum(i.entrada.altura)}${q}`;
}

/** quantidade de toldos somando o "+" de cada item */
export const totalToldos = (itens: ItemServico[]) => itens.reduce((s, i) => s + Math.max(1, i.entrada.quantidade || 1), 0);

export function descricaoServico(cliente: string, itens: ItemServico[]) {
  const quem = cliente.trim() || "Sem referência";
  const texto = itens.length === 1 ? nomeItem(itens[0]) : `${totalToldos(itens)} toldos (${itens.map(nomeItem).join(", ")})`;
  const d = `${quem}: ${texto}`;
  return d.length > 80 ? `${d.slice(0, 79)}…` : d;
}

/** campos do documento: o 1º toldo fica também em tipo/entrada/resultado (compatível com os antigos) */
function camposItens(itens: ItemServico[]) {
  const p = itens[0];
  return { tipo: p.tipo, entrada: p.entrada, resultado: p.resultado, itens };
}

export async function salvarServico(d: { cliente: string; itens: ItemServico[]; valor: number }) {
  if (d.itens.length === 0) throw new Error("Serviço sem toldos");
  const servicoId = calculosRepo.novoId();
  const lancamentoId = lancamentosRepo.novoId();
  const agora = Date.now();
  await lancamentosRepo.criar(
    {
      tipo: "receita",
      servicoId,
      descricao: descricaoServico(d.cliente, d.itens),
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
      ...camposItens(d.itens),
      cliente: d.cliente.trim(),
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
      .atualizar(c.lancamentoId, { valor: dados.valor, descricao: descricaoServico(dados.cliente, itensDe(c)) })
      .catch(() => {});
  }
}

/** troca os toldos, o cliente e o valor de um serviço já salvo */
export async function atualizarServico(id: string, d: { cliente: string; itens: ItemServico[]; valor: number }) {
  if (d.itens.length === 0) throw new Error("Serviço sem toldos");
  const atual = await calculosRepo.obter(id);
  if (!atual) throw new Error("Serviço não encontrado");
  await calculosRepo.atualizar(id, { ...camposItens(d.itens), cliente: d.cliente.trim(), valor: d.valor });
  if (atual.lancamentoId) {
    await lancamentosRepo
      .atualizar(atual.lancamentoId, { valor: d.valor, descricao: descricaoServico(d.cliente, d.itens) })
      .catch(() => {});
  }
}

/** exclui o serviço e o lançamento ligado; devolve uma função para desfazer */
export async function excluirServico(c: CalculoSalvo) {
  // guarda uma cópia do lançamento para o "Desfazer"
  const lancamento = c.lancamentoId ? await lancamentosRepo.obter(c.lancamentoId).catch(() => null) : null;
  await calculosRepo.excluir(c.id);
  if (c.lancamentoId) await lancamentosRepo.excluir(c.lancamentoId).catch(() => {});
  return async () => {
    await calculosRepo.restaurar(c);
    if (lancamento) await lancamentosRepo.restaurar(lancamento);
  };
}

/** exclui pelo financeiro um lançamento de serviço: apaga o serviço junto */
export async function excluirServicoDoLancamento(l: Lancamento) {
  const c = l.servicoId ? await calculosRepo.obter(l.servicoId).catch(() => null) : null;
  if (c) return excluirServico({ ...c, lancamentoId: l.id });
  await lancamentosRepo.excluir(l.id);
  return async () => {
    await lancamentosRepo.restaurar(l);
  };
}
