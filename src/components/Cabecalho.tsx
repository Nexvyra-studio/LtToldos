import Link from "next/link";
import type { ReactNode } from "react";
import { LuArrowLeft } from "react-icons/lu";

interface Props {
  titulo: string;
  subtitulo?: string;
  voltar?: string;
  direita?: ReactNode;
  /** logo grande acima do título (tela inicial) */
  marcaGrande?: boolean;
}

/** Cabeçalho listrado como lona de toldo, com a barra recortada em ondas (bandô) */
export function Cabecalho({ titulo, subtitulo, voltar, direita, marcaGrande }: Props) {
  return (
    <header className="toldo">
      <div className="toldo-conteudo">
        {voltar && (
          <Link href={voltar} className="toldo-voltar" aria-label="Voltar">
            <LuArrowLeft />
          </Link>
        )}
        <div className="toldo-textos">
          {marcaGrande && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.webp" alt="RDN Soldas" className="toldo-marca toldo-marca-grande" />
          )}
          <h1>{titulo}</h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        <div className="toldo-direita">
          {!marcaGrande && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.webp" alt="RDN Soldas" className="toldo-marca" />
          )}
          {direita}
        </div>
      </div>
      <div className="toldo-bando" aria-hidden />
    </header>
  );
}
