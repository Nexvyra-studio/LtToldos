"use client";

import { useState, type FormEvent } from "react";
import { LuLock } from "react-icons/lu";
import { mensagemErroLogin, useAuth } from "@/lib/auth";

export function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (err) {
      setErro(mensagemErroLogin(String((err as { code?: string }).code ?? err)));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <header className="toldo toldo-login">
        <div className="toldo-conteudo">
          <div className="toldo-textos">
            <h1>Toldos</h1>
            <p>Cálculo de lona e controle de compras</p>
          </div>
        </div>
        <div className="toldo-bando" aria-hidden />
      </header>

      <form className="cartao login-form" onSubmit={enviar}>
        <label className="campo">
          <span>E-mail</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao-principal" disabled={enviando}>
          <LuLock aria-hidden /> {enviando ? "Entrando…" : "Entrar"}
        </button>
        <p className="dica">
          Os acessos são criados pelo administrador no Firebase.
        </p>
      </form>
    </div>
  );
}
