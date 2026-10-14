import { ACRESCIMO_ALTURA, NOME_ACABAMENTO, type Acabamento } from "@/lib/calc/cortina";
import { formatNum } from "@/lib/format";

interface Props {
  largura: number; // NaN se ainda não digitado
  altura: number;
  larguraCorte?: number;
  acabamento: Acabamento;
}

/**
 * Desenho no estilo do caderno da oficina: o toldo de frente,
 * largura em cima, altura "225 ↓ 250" ao lado e o bandô embaixo.
 * Vai aparecendo conforme as medidas são digitadas.
 */
export function DesenhoCaderno({ largura, altura, larguraCorte, acabamento }: Props) {
  const temL = largura > 0;
  const temA = altura > 0;

  // proporção do desenho segue as medidas, com limites para caber na tela
  const ratio = temL && temA ? Math.min(2.4, Math.max(0.7, largura / altura)) : 1.6;
  const H = 120;
  const W = Math.min(210, H * ratio);
  const x0 = 24;
  const y0 = 40;
  const hBando = Math.max(24, H * (ACRESCIMO_ALTURA[acabamento] / Math.max(altura || 200, 100)));
  const xLado = x0 + W + 14;
  const vbW = xLado + 64;
  const vbH = y0 + H + 22;

  const alturaFinal = temA ? altura + ACRESCIMO_ALTURA[acabamento] : NaN;

  return (
    <figure className="caderno">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} role="img" aria-label="Desenho do toldo com as medidas">
        {/* largura */}
        <text x={x0 + W / 2} y={y0 - 12} textAnchor="middle" className={`cd-num${temL ? " cd-pronto" : ""}`}>
          {temL ? formatNum(largura) : "largura"}
          {temL && larguraCorte ? (
            <tspan className="cd-final">{` → ${formatNum(larguraCorte)}`}</tspan>
          ) : null}
        </text>
        <line x1={x0} y1={y0 - 6} x2={x0 + W} y2={y0 - 6} className="cd-traco" />

        {/* toldo */}
        <rect x={x0} y={y0} width={W} height={H} className="cd-linha" pathLength={100} key={`r${W}`} />
        <line x1={x0} y1={y0 + H - hBando} x2={x0 + W} y2={y0 + H - hBando} className="cd-linha" />
        <text x={x0 + 8} y={y0 + H - 7} className="cd-bando">
          {NOME_ACABAMENTO[acabamento]}
        </text>

        {/* altura: medida ↓ final, como no caderno */}
        <line x1={xLado - 6} y1={y0} x2={xLado - 6} y2={y0 + H} className="cd-traco" />
        <g className={temA ? "cd-pronto" : undefined}>
          <text x={xLado} y={y0 + H / 2 - 14} className="cd-num">
            {temA ? formatNum(altura) : "altura"}
          </text>
          {temA && (
            <>
              <text x={xLado + 10} y={y0 + H / 2 + 4} className="cd-seta">↓</text>
              <text x={xLado} y={y0 + H / 2 + 24} className="cd-num cd-final">
                {formatNum(alturaFinal)}
              </text>
            </>
          )}
        </g>
      </svg>
      <figcaption>
        {temL && temA
          ? `${formatNum(largura)} × ${formatNum(altura)} com ${NOME_ACABAMENTO[acabamento].toLowerCase()} (+${ACRESCIMO_ALTURA[acabamento]} na altura)`
          : "Digite as medidas e o desenho se completa"}
      </figcaption>
    </figure>
  );
}
