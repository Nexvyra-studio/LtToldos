import Link from "next/link";
import type { ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

interface Props {
  titulo: string;
  subtitulo?: string;
  voltar?: string;
  direita?: ReactNode;
}

/** Cabeçalho listrado como lona de toldo, com a barra recortada em ondas (bandô) */
export function Cabecalho({ titulo, subtitulo, voltar, direita }: Props) {
  return (
    <header className="toldo">
      <div className="toldo-conteudo">
        {voltar && (
          <Link href={voltar} className="toldo-voltar" aria-label="Voltar">
            <LuArrowLeft />
          </Link>
        )}
        <div className="toldo-textos">
          <h1>{titulo}</h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        {direita && <div className="toldo-direita">{direita}</div>}
      </div>
      <div className="toldo-bando" aria-hidden />
    </header>
  );
}
