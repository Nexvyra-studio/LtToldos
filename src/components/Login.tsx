"use client";

import { useState, type FormEvent } from "react";
import { LuEye, LuEyeOff, LuLock, LuLogIn, LuMail, LuUser } from "react-icons/lu";
import { mensagemErroLogin, useAuth } from "@/lib/auth";

export function Login() {
  const { entrar, modoLocal } = useAuth();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(login, senha);
    } catch (err) {
      setErro(mensagemErroLogin(String((err as { code?: string }).code ?? err)));
      setTentativa((t) => t + 1);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <div className="login-fundo" aria-hidden />

      <main className="login-caixa">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="RDN Soldas" className="login-logo" />
        <p className="login-sub">Cálculo de lona e controle de compras</p>

        <form
          className={`login-form${erro ? " com-erro" : ""}`}
          onSubmit={enviar}
          key={tentativa}
          noValidate
        >
          <label className="login-campo">
            <span className="sr-only">{modoLocal ? "Usuário" : "E-mail"}</span>
            {modoLocal ? <LuUser aria-hidden /> : <LuMail aria-hidden />}
            <input
              type={modoLocal ? "text" : "email"}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={modoLocal ? "Usuário" : "E-mail"}
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoFocus
            />
          </label>

          <label className="login-campo">
            <span className="sr-only">Senha</span>
            <LuLock aria-hidden />
            <input
              type={verSenha ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Senha"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <button
              type="button"
              className="login-olho"
              onClick={() => setVerSenha((v) => !v)}
              aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
            >
              {verSenha ? <LuEyeOff /> : <LuEye />}
            </button>
          </label>

          {erro && (
            <p className="login-erro" role="alert">
              {erro}
            </p>
          )}

          <button className="login-botao" disabled={enviando || !login || !senha}>
            {enviando ? <span className="login-girando" aria-hidden /> : <LuLogIn aria-hidden />}
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="login-rodape">Acesso exclusivo</p>
      </main>
    </div>
  );
}
