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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="RDN Soldas" className="logo-carregando" />
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
