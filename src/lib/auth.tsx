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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(
    firebaseAtivo ? null : { email: "modo local" },
  );
  const [carregando, setCarregando] = useState(firebaseAtivo);

  useEffect(() => {
    if (!auth) return;
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
      if (!auth) return;
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    },
    async sair() {
      if (auth) await signOut(auth);
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
    return "E-mail ou senha incorretos.";
  if (codigo.includes("invalid-email")) return "Esse e-mail não é válido.";
  if (codigo.includes("too-many-requests"))
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  if (codigo.includes("network")) return "Sem conexão com a internet.";
  return "Não foi possível entrar. Confira os dados e tente de novo.";
}
