"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuCalculator, LuWallet } from "react-icons/lu";

const ITENS = [
  { href: "/toldos", rotulo: "Toldos", Icone: LuCalculator },
  { href: "/financeiro", rotulo: "Financeiro", Icone: LuWallet },
];

export function NavInferior() {
  const caminho = usePathname() || "";
  return (
    <nav className="nav-inferior" aria-label="Seções">
      {ITENS.map(({ href, rotulo, Icone }) => {
        const ativo = caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={ativo ? "ativo" : undefined}
            aria-current={ativo ? "page" : undefined}
          >
            <Icone aria-hidden />
            <span>{rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
