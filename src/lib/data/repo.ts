"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
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
export interface Repo<T extends { id: string }> {
  subscribe(cb: (itens: T[]) => void, onError?: (e: Error) => void): () => void;
  criar(dados: Omit<T, "id">): Promise<string>;
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
    subscribe(cb, onError) {
      return onSnapshot(
        col(),
        (snap) => {
          const itens = snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T);
          cb(itens.sort(ordenar));
        },
        (e) => onError?.(e),
      );
    },
    async criar(dados) {
      const ref = doc(col()); // id gerado no aparelho, funciona offline
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
    subscribe(cb) {
      const emitir = () => cb([...atual()].sort(ordenar));
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
    async criar(dados) {
      const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
