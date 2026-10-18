"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CalculoSalvo, ItemServico } from "./data/calculos";
import { itensDe } from "./data/calculos";

/**
 * Serviço em montagem: os toldos vão sendo adicionados (de qualquer tipo, cada um
 * com suas medidas) e no fim salva tudo junto, com cliente e valor.
 * Fica guardado no aparelho para não perder se fechar a página.
 */
export interface Rascunho {
  /** id do serviço quando está editando um serviço já salvo */
  servicoId: string | null;
  cliente: string;
  itens: ItemServico[];
}

const VAZIO: Rascunho = { servicoId: null, cliente: "", itens: [] };
const CHAVE = "toldos:montagem";

interface Ctx {
  rascunho: Rascunho;
  /** toldo do rascunho aberto na calculadora para alterar */
  editandoItem: string | null;
  painelAberto: boolean;
  ativo: boolean;
  adicionar(i: Omit<ItemServico, "id">): number;
  atualizarItem(i: ItemServico): void;
  removerItem(id: string): void;
  editarItem(id: string | null): void;
  definir(d: Partial<Pick<Rascunho, "cliente">>): void;
  /** troca o valor (R$) de um toldo */
  definirValorItem(id: string, valor: number): void;
  carregarServico(c: CalculoSalvo): void;
  limpar(): void;
  abrirPainel(): void;
  fecharPainel(): void;
}

const Contexto = createContext<Ctx | null>(null);

function novoId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ler(): { r: Rascunho; editando: string | null } {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (salvo && Array.isArray(salvo.itens)) return { r: { ...VAZIO, ...salvo.r, itens: salvo.itens }, editando: salvo.editando ?? null };
  } catch {
    /* sem armazenamento */
  }
  return { r: VAZIO, editando: null };
}

export function MontagemProvider({ children }: { children: ReactNode }) {
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [editandoItem, setEditandoItem] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const { r, editando } = ler();
    setRascunho(r);
    setEditandoItem(editando);
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      const { itens, ...r } = rascunho;
      localStorage.setItem(CHAVE, JSON.stringify({ r, itens, editando: editandoItem }));
    } catch {
      /* sem armazenamento */
    }
  }, [rascunho, editandoItem, pronto]);

  const qtdItens = useRef(0);
  qtdItens.current = rascunho.itens.length;
  const adicionar = useCallback((i: Omit<ItemServico, "id">) => {
    const item = { ...i, id: novoId() };
    setRascunho((r) => ({ ...r, itens: [...r.itens, item] }));
    return qtdItens.current + 1;
  }, []);

  const atualizarItem = useCallback((i: ItemServico) => {
    setRascunho((r) => ({ ...r, itens: r.itens.map((x) => (x.id === i.id ? i : x)) }));
    setEditandoItem(null);
  }, []);

  const removerItem = useCallback((id: string) => {
    setRascunho((r) => ({ ...r, itens: r.itens.filter((x) => x.id !== id) }));
    setEditandoItem((e) => (e === id ? null : e));
  }, []);

  const definir = useCallback((d: Partial<Pick<Rascunho, "cliente">>) => {
    setRascunho((r) => ({ ...r, ...d }));
  }, []);

  const definirValorItem = useCallback((id: string, valor: number) => {
    setRascunho((r) => ({ ...r, itens: r.itens.map((x) => (x.id === id ? { ...x, valor } : x)) }));
  }, []);

  const carregarServico = useCallback((c: CalculoSalvo) => {
    const itens = itensDe(c).map((i) => ({ ...i, id: novoId() }));
    // serviços salvos antes do valor por toldo: o valor todo fica no 1º toldo
    if (itens.every((i) => i.valor == null) && c.valor) itens[0] = { ...itens[0], valor: c.valor };
    setRascunho({ servicoId: c.id, cliente: c.cliente, itens });
    setEditandoItem(null);
  }, []);

  const limpar = useCallback(() => {
    setRascunho(VAZIO);
    setEditandoItem(null);
    setPainelAberto(false);
  }, []);

  const valor = useMemo<Ctx>(
    () => ({
      rascunho,
      editandoItem,
      painelAberto,
      ativo: rascunho.itens.length > 0 || !!rascunho.servicoId,
      adicionar,
      atualizarItem,
      removerItem,
      editarItem: setEditandoItem,
      definir,
      definirValorItem,
      carregarServico,
      limpar,
      abrirPainel: () => setPainelAberto(true),
      fecharPainel: () => setPainelAberto(false),
    }),
    [rascunho, editandoItem, painelAberto, adicionar, atualizarItem, removerItem, definir, definirValorItem, carregarServico, limpar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useMontagem() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useMontagem fora do MontagemProvider");
  return c;
}
