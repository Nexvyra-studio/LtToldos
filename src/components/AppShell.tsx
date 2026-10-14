"use client";

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Login } from "./Login";
import { NavInferior } from "./NavInferior";
import { ToastProvider } from "./Toast";

function Conteudo({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="tela-carregando" aria-busy="true">
        <div className="toldo-bando giro" aria-hidden />
        <span>Abrindo…</span>
      </div>
    );
  }

  if (!usuario) return <Login />;

  return (
    <>
      <main className="conteudo">{children}</main>
      <NavInferior />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Conteudo>{children}</Conteudo>
      </ToastProvider>
    </AuthProvider>
  );
}
