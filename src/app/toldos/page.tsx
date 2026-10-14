import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { Cabecalho } from "@/components/Cabecalho";
import { TIPOS_TOLDO } from "@/lib/calc/tipos";

export default function TiposPage() {
  return (
    <>
      <Cabecalho titulo="Qual toldo?" subtitulo="Escolha o tipo e digite só as medidas" />

      <ul className="lista-tipos">
        {TIPOS_TOLDO.map((t) => {
          const conteudo = (
            <>
              <MiniToldo tipo={t.id} />
              <div className="tipo-textos">
                <strong>{t.nome}</strong>
                <span>{t.resumo}</span>
              </div>
              {t.href ? (
                <LuChevronRight className="tipo-seta" aria-hidden />
              ) : (
                <span className="selo-breve">Em breve</span>
              )}
            </>
          );
          return (
            <li key={t.id}>
              {t.href ? (
                <Link href={t.href} className="tipo">
                  {conteudo}
                </Link>
              ) : (
                <div className="tipo tipo-off" aria-disabled="true">
                  {conteudo}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Desenho simples de cada tipo de toldo */
function MiniToldo({ tipo }: { tipo: string }) {
  const listras = [0, 1, 2, 3, 4].map((i) => (
    <rect key={i} x={8 + i * 8} y={10} width={8} height={18} className={i % 2 ? "ml-b" : "ml-a"} />
  ));
  const ondas = (y: number) => (
    <path d={`M8 ${y} ${"q4 6 8 0 ".repeat(5)}Z`} className="ml-onda" />
  );
  return (
    <svg viewBox="0 0 56 48" className="mini-toldo" aria-hidden>
      <rect x={4} y={6} width={48} height={4} rx={2} className="ml-tubo" />
      {tipo.startsWith("cortina") ? (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={8 + i * 8} y={10} width={8} height={28} className={i % 2 ? "ml-b" : "ml-a"} />
          ))}
          {tipo === "cortina-visor" && <rect x={14} y={17} width={28} height={12} rx={1.5} className="ml-visor" />}
          {ondas(38)}
        </>
      ) : (
        <>
          {listras}
          {tipo !== "fixo-casca" && ondas(28)}
          {tipo === "fixo-lateral" && (
            <>
              <path d="M8 10 L4 34 L8 34 Z" className="ml-lado" />
              <path d="M48 10 L52 34 L48 34 Z" className="ml-lado" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
