import type { ResultadoCortina } from "@/lib/calc/cortina";
import { formatNum } from "@/lib/format";

interface Props {
  r: ResultadoCortina;
  /** faixa do bandô/canhão desenhada embaixo; null = sem faixa (Casca) */
  faixa: { nome: string; cm: number } | null;
}

const LARG_MAX = 270;
const ALT_MAX = 190;
const MARGEM_ESQ = 40;
const MARGEM_TOPO = 30;

/** Plano de corte: gomos de 1,40 m lado a lado, emendas, sobra do rolo e faixa do acabamento */
export function DesenhoCortina({ r, faixa }: Props) {
  const larguraRolos = r.gomos * (r.rolo ?? 140);
  const escala = Math.min(LARG_MAX / larguraRolos, ALT_MAX / r.alturaCorte);
  const W = r.larguraCorte * escala;
  const H = r.alturaCorte * escala;
  const Wtotal = larguraRolos * escala;
  const hAcab = faixa ? faixa.cm * escala : 0;
  const uso = r.usoRetalho;
  const doRetalho = (i: number) => !!uso?.usado && uso.gomo === i;
  // com retalho usado, a sobra mostrada é a do retalho (não do rolo novo)
  const sobraCm = uso?.usado ? uso.sobraLargura : r.retalho;
  const sobraW = sobraCm * escala;
  const mostrarSobra = sobraCm > 0;
  const vbW = MARGEM_ESQ + Math.max(Wtotal, W + sobraW) + 12;
  const vbH = MARGEM_TOPO + H + 20;

  let x = MARGEM_ESQ;
  const gomos = r.larguraGomos.map((lg, i) => {
    const w = lg * escala;
    const g = { x, w, lg, i };
    x += w;
    return g;
  });

  return (
    <svg
      className="desenho"
      viewBox={`0 0 ${vbW} ${vbH}`}
      role="img"
      aria-label={`Plano de corte: ${r.gomos} gomos, ${formatNum(r.larguraCorte)} por ${formatNum(r.alturaCorte)} centímetros`}
    >
      <defs>
        <pattern id="hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" className="d-hachura" />
        </pattern>
      </defs>

      {/* cota da largura */}
      <g className="d-cota">
        <line x1={MARGEM_ESQ} y1={12} x2={MARGEM_ESQ + W} y2={12} />
        <line x1={MARGEM_ESQ} y1={7} x2={MARGEM_ESQ} y2={17} />
        <line x1={MARGEM_ESQ + W} y1={7} x2={MARGEM_ESQ + W} y2={17} />
        <text x={MARGEM_ESQ + W / 2} y={8} textAnchor="middle">
          {formatNum(r.larguraCorte)} cm
        </text>
      </g>

      {/* cota da altura */}
      <g className="d-cota">
        <line x1={20} y1={MARGEM_TOPO} x2={20} y2={MARGEM_TOPO + H} />
        <line x1={15} y1={MARGEM_TOPO} x2={25} y2={MARGEM_TOPO} />
        <line x1={15} y1={MARGEM_TOPO + H} x2={25} y2={MARGEM_TOPO + H} />
        <text
          x={12}
          y={MARGEM_TOPO + H / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${MARGEM_TOPO + H / 2})`}
        >
          {formatNum(r.alturaCorte)} cm
        </text>
      </g>

      {/* sobra do último gomo */}
      {mostrarSobra && (
        <g>
          <rect
            x={MARGEM_ESQ + W}
            y={MARGEM_TOPO}
            width={sobraW}
            height={H}
            fill="url(#hachura)"
            className={uso?.usado ? "d-sobra d-sobra-retalho" : "d-sobra"}
          />
          {sobraW > 26 && (
            <text x={MARGEM_ESQ + W + sobraW / 2} y={MARGEM_TOPO + H / 2 - (uso?.usado ? 6 : 0)} textAnchor="middle" className="d-texto-sobra">
              sobra
            </text>
          )}
          {sobraW > 26 && uso?.usado && (
            <text x={MARGEM_ESQ + W + sobraW / 2} y={MARGEM_TOPO + H / 2 + 6} textAnchor="middle" className="d-texto-sobra">
              do retalho
            </text>
          )}
          {sobraW > 26 && (
            <text x={MARGEM_ESQ + W + sobraW / 2} y={MARGEM_TOPO + H / 2 + (uso?.usado ? 18 : 12)} textAnchor="middle" className="d-texto-sobra">
              {formatNum(sobraCm)} cm
            </text>
          )}
        </g>
      )}

      {/* gomos */}
      {gomos.map((g) => (
        <g key={g.i}>
          <rect
            x={g.x}
            y={MARGEM_TOPO}
            width={g.w}
            height={H}
            className={doRetalho(g.i) ? "d-gomo-retalho" : g.i % 2 ? "d-gomo-b" : "d-gomo-a"}
          />
          {g.w > 24 ? (
            <text x={g.x + g.w / 2} y={MARGEM_TOPO + (H - hAcab) / 2 + 4} textAnchor="middle" className={doRetalho(g.i) ? "d-texto-gomo d-escuro" : "d-texto-gomo"}>
              {formatNum(g.lg)}
            </text>
          ) : (
            // gomo estreito: a medida vai embaixo do desenho
            <text x={g.x + g.w / 2} y={MARGEM_TOPO + H + 13} textAnchor="middle" className="d-texto-fora">
              {formatNum(g.lg)}
            </text>
          )}
        </g>
      ))}

      {/* faixa do bandô / canhão */}
      {faixa && <rect x={MARGEM_ESQ} y={MARGEM_TOPO + H - hAcab} width={W} height={hAcab} className="d-acab" />}
      {faixa && hAcab > 11 && (
        <text x={MARGEM_ESQ + W / 2} y={MARGEM_TOPO + H - hAcab / 2 + 4} textAnchor="middle" className="d-texto-acab">
          {faixa.nome} +{faixa.cm}
        </text>
      )}

      {/* emendas */}
      {gomos.slice(1).map((g) => (
        <line key={g.i} x1={g.x} y1={MARGEM_TOPO - 3} x2={g.x} y2={MARGEM_TOPO + H + 3} className="d-emenda" />
      ))}

      <rect x={MARGEM_ESQ} y={MARGEM_TOPO} width={W} height={H} className="d-contorno" />
    </svg>
  );
}
