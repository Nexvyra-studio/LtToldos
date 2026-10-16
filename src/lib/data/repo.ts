"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db, firebaseAtivo } from "../firebase";

/**
 * O Firestore grava primeiro no aparelho e depois confirma no servidor.
 * Sem internet, a confirmação demora; então esperamos no máximo 1,5 s:
 * se der erro rápido (ex.: sem permissão) o erro aparece; se só estiver
 * lento/offline, seguimos e ele sincroniza sozinho quando a conexão voltar.
 */
async function gravar(p: Promise<unknown>) {
  let erro: unknown = null;
  p.catch((e) => {
    erro = e;
    console.error("[Firestore]", e);
  });
  await Promise.race([p, new Promise((r) => setTimeout(r, 1500))]);
  if (erro) throw erro;
}

/**
 * Repositório simples: usa o Firestore quando configurado e,
 * sem configuração, salva no localStorage do aparelho (modo local).
 */
/**
 * Faixa de busca: o banco só devolve os documentos com `campo` entre `de` e `ate`.
 * Assim cada consulta lê só o período escolhido (economiza leituras do Firebase).
 */
export interface Faixa {
  campo: string;
  de: string | number | null;
  ate: string | number | null;
}

export interface Repo<T extends { id: string }> {
  /** acompanha os documentos da faixa (ou todos, sem faixa) e avisa quando mudam */
  subscribe(cb: (itens: T[]) => void, onError?: (e: Error) => void, faixa?: Faixa | null): () => void;
  /** lê um documento só (1 leitura) */
  obter(id: string): Promise<T | null>;
  /** gera um id novo (para ligar documentos antes de gravar) */
  novoId(): string;
  criar(dados: Omit<T, "id">, id?: string): Promise<string>;
  atualizar(id: string, dados: Partial<Omit<T, "id">>): Promise<void>;
  excluir(id: string): Promise<void>;
  /** grava com o mesmo id (usado para desfazer uma exclusão) */
  restaurar(item: T): Promise<void>;
}

export function criarRepo<T extends { id: string }>(
  nome: string,
  ordenar: (a: T, b: T) => number,
): Repo<T> {
  return firebaseAtivo ? repoFirestore<T>(nome, ordenar) : repoLocal<T>(nome, ordenar);
}

function idLocal() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function semId<T extends { id: string }>(item: T) {
  const { id: _id, ...resto } = item;
  return resto;
}

function limparUndefined(obj: object): DocumentData {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

function repoFirestore<T extends { id: string }>(
  nome: string,
  ordenar: (a: T, b: T) => number,
): Repo<T> {
  const col = () => collection(db!, nome);
  return {
    subscribe(cb, onError, faixa) {
      const filtros: ReturnType<typeof where>[] = [];
      if (faixa?.de != null) filtros.push(where(faixa.campo, ">=", faixa.de));
      if (faixa?.ate != null) filtros.push(where(faixa.campo, "<=", faixa.ate));
      return onSnapshot(
        filtros.length ? query(col(), ...filtros) : col(),
        (snap) => {
          const itens = snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T);
          cb(itens.sort(ordenar));
        },
        (e) => onError?.(e),
      );
    },
    async obter(id) {
      const snap = await getDoc(doc(db!, nome, id));
      return snap.exists() ? ({ ...(snap.data() as object), id: snap.id } as T) : null;
    },
    novoId() {
      return doc(col()).id;
    },
    async criar(dados, id) {
      const ref = id ? doc(db!, nome, id) : doc(col()); // id gerado no aparelho, funciona offline
      await gravar(
        setDoc(ref, limparUndefined({ ...dados, criadoPor: auth?.currentUser?.email ?? null })),
      );
      return ref.id;
    },
    async atualizar(id, dados) {
      await gravar(updateDoc(doc(db!, nome, id), limparUndefined(dados as object)));
    },
    async excluir(id) {
      await gravar(deleteDoc(doc(db!, nome, id)));
    },
    async restaurar(item) {
      await gravar(setDoc(doc(db!, nome, item.id), limparUndefined(semId(item))));
    },
  };
}

function repoLocal<T extends { id: string }>(
  nome: string,
  ordenar: (a: T, b: T) => number,
): Repo<T> {
  const chave = `toldos:${nome}`;
  const evento = `toldos-change:${nome}`;

  const ler = (): T[] => {
    try {
      return JSON.parse(localStorage.getItem(chave) || "[]") as T[];
    } catch {
      return [];
    }
  };
  const gravar = (itens: T[]) => {
    try {
      localStorage.setItem(chave, JSON.stringify(itens));
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
    memoria = itens;
    window.dispatchEvent(new Event(evento));
  };
  let memoria: T[] | null = null;
  const atual = () => memoria ?? (memoria = ler());

  return {
    subscribe(cb, _onError, faixa) {
      const dentro = (i: T) => {
        if (!faixa) return true;
        // datas são texto aaaa-mm-dd e criadoEm é número: os dois comparam em ordem
        const v = (i as unknown as Record<string, unknown>)[faixa.campo] as number;
        return (faixa.de == null || v >= (faixa.de as number)) && (faixa.ate == null || v <= (faixa.ate as number));
      };
      const emitir = () => cb(atual().filter(dentro).sort(ordenar));
      const aoMudarOutraAba = (e: StorageEvent) => {
        if (e.key === chave) {
          memoria = ler();
          emitir();
        }
      };
      window.addEventListener(evento, emitir);
      window.addEventListener("storage", aoMudarOutraAba);
      emitir();
      return () => {
        window.removeEventListener(evento, emitir);
        window.removeEventListener("storage", aoMudarOutraAba);
      };
    },
    async obter(id) {
      return atual().find((i) => i.id === id) ?? null;
    },
    novoId: idLocal,
    async criar(dados, idDado) {
      const id = idDado ?? idLocal();
      gravar([...atual(), { ...(dados as object), id } as T]);
      return id;
    },
    async atualizar(id, dados) {
      gravar(atual().map((i) => (i.id === id ? ({ ...i, ...dados } as T) : i)));
    },
    async excluir(id) {
      gravar(atual().filter((i) => i.id !== id));
    },
    async restaurar(item) {
      gravar([...atual().filter((i) => i.id !== item.id), item]);
    },
  };
}

/**
 * Consulta sob demanda: só busca no banco quando recebe uma faixa (botão Buscar).
 * Sem faixa (null) não lê nada. Repetir a mesma faixa não gasta leituras de novo.
 */
export function useConsulta<T extends { id: string }>(repo: Repo<T>, faixa: Faixa | null) {
  const [itens, setItens] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const chave = faixa ? JSON.stringify(faixa) : null;

  useEffect(() => {
    if (!chave) return;
    setCarregando(true);
    setErro(null);
    return repo.subscribe(
      (lista) => {
        setItens(lista);
        setCarregando(false);
      },
      (e) => {
        setErro(e);
        setCarregando(false);
      },
      JSON.parse(chave) as Faixa,
    );
  }, [repo, chave]);

  return { itens, carregando, erro, buscou: !!chave };
}
