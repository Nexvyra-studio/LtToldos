"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, firebaseAtivo } from "./firebase";

interface Usuario {
  email: string;
}

interface AuthCtx {
  usuario: Usuario | null;
  carregando: boolean;
  modoLocal: boolean;
  entrar(email: string, senha: string): Promise<void>;
  sair(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

/**
 * Acesso provisório enquanto o Firebase não está configurado.
 * ATENÇÃO: fica no código do navegador, serve só para visualizar o sistema.
 * Com o Firebase ligado, o login passa a usar a conta real (e-mail e senha).
 */
const ACESSO_LOCAL = { usuario: "adm", senha: "123" };
const CHAVE_SESSAO = "toldos:sessao";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!auth) {
      // modo local: lembra a sessão neste aparelho
      try {
        const salvo = localStorage.getItem(CHAVE_SESSAO);
        if (salvo) setUsuario({ email: salvo });
      } catch {
        /* sem armazenamento */
      }
      setCarregando(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u ? { email: u.email ?? "" } : null);
      setCarregando(false);
    });
  }, []);

  const valor: AuthCtx = {
    usuario,
    carregando,
    modoLocal: !firebaseAtivo,
    async entrar(email, senha) {
      if (!auth) {
        const ok = email.trim().toLowerCase() === ACESSO_LOCAL.usuario && senha === ACESSO_LOCAL.senha;
        await new Promise((r) => setTimeout(r, 350));
        if (!ok) throw { code: "invalid-credential" };
        try {
          localStorage.setItem(CHAVE_SESSAO, ACESSO_LOCAL.usuario);
        } catch {
          /* sem armazenamento: vale só até fechar */
        }
        setUsuario({ email: ACESSO_LOCAL.usuario });
        return;
      }
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    },
    async sair() {
      if (auth) {
        await signOut(auth);
        return;
      }
      try {
        localStorage.removeItem(CHAVE_SESSAO);
      } catch {
        /* nada */
      }
      setUsuario(null);
    },
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return c;
}

export function mensagemErroLogin(codigo: string) {
  if (codigo.includes("invalid-credential") || codigo.includes("wrong-password") || codigo.includes("user-not-found"))
    return firebaseAtivo ? "E-mail ou senha incorretos." : "Usuário ou senha incorretos.";
  if (codigo.includes("invalid-email")) return "Esse e-mail não é válido.";
  if (codigo.includes("too-many-requests"))
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  if (codigo.includes("network")) return "Sem conexão com a internet.";
  return "Não foi possível entrar. Confira os dados e tente de novo.";
}
