import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

// As variáveis precisam ser lidas uma a uma para o Next.js incluí-las no navegador.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** true quando o .env.local está preenchido. Sem ele, o app usa o modo local. */
export const firebaseAtivo = Boolean(config.apiKey && config.projectId);

/** Nomes das coleções do Firestore (as "tabelas") */
export const COLECOES = {
  lancamentos: "lancamentos",
  calculos: "calculos",
} as const;

const noNavegador = typeof window !== "undefined";

export const app: FirebaseApp | null = firebaseAtivo ? (getApps()[0] ?? initializeApp(config)) : null;

export const auth: Auth | null = app ? getAuth(app) : null;
if (auth && noNavegador) {
  // mantém o login ao fechar e abrir o navegador
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

function criarDb(a: FirebaseApp): Firestore {
  try {
    return initializeFirestore(a, {
      // campos "undefined" são ignorados em vez de dar erro ao gravar
      ignoreUndefinedProperties: true,
      // no celular: guarda uma cópia local, funciona com internet fraca
      // e sincroniza quando a conexão volta
      localCache: noNavegador
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache(),
    });
  } catch {
    // já foi iniciado (ex.: recarregamento do npm run dev)
    return getFirestore(a);
  }
}

export const db: Firestore | null = app ? criarDb(app) : null;

/** Mensagem clara para erros do Firestore */
export function mensagemErroBanco(e: unknown) {
  const code = String((e as { code?: string })?.code ?? "");
  if (code.includes("permission-denied"))
    return "Sem permissão no banco. Confira se você está logado e se as regras do Firestore foram publicadas.";
  if (code.includes("unavailable")) return "Sem conexão com o banco. Os dados aparecem quando a internet voltar.";
  if (code.includes("failed-precondition")) return "O banco ainda não está pronto. Confira se o Firestore foi criado.";
  return "Não foi possível acessar o banco de dados.";
}
