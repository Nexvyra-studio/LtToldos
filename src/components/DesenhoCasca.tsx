import { ACRESCIMO_CASCA } from "@/lib/calc/cortina";
import { formatNum } from "@/lib/format";

interface Props {
  largura: number; // NaN se ainda não digitado
  altura: number; // medida da ferragem por cima da curva
  larguraCorte?: number;
  /** desenha o bandô caindo na frente (a medida já inclui ele) */
  bando?: boolean;
  /** Fixo com lateral: medidas da lateral (avanço e altura na parede) */
  lateral?: { largura: number; altura: number };
}

/**
 * Toldo fixo (casca) visto de lado, no estilo do caderno:
 * parede, ferragem curva e a medida tirada por cima da curvatura.
 */
export function DesenhoCasca({ largura, altura, larguraCorte, bando, lateral }: Props) {
  const temL = largura > 0;
  const temA = altura > 0;
  const acrescimo = ACRESCIMO_CASCA;
  const alturaFinal = altura + acrescimo;

  // curva da parede até a frente
  const curva = "M48 58 Q 190 30 262 128";

  return (
    <figure className="caderno">
      <svg viewBox="0 0 300 200" role="img" aria-label="Desenho do toldo fixo visto de lado, com as medidas">
        <defs>
          <path id="curva-casca" d={bando ? "M48 46 Q 190 18 274 132" : "M48 46 Q 190 18 266 118"} />
        </defs>

        {/* parede */}
        <line x1={44} y1={20} x2={44} y2={186} className="cd-linha" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={44} y1={30 + i * 24} x2={34} y2={40 + i * 24} className="cd-traco cd-parede" />
        ))}

        {lateral ? (
          <>
            {/* lateral: a peça que fecha o lado, no formato da ferragem */}
            <path
              d={bando ? "M48 58 Q 190 30 262 128 L262 162 L44 162 L44 58 Z" : "M48 58 Q 190 30 262 128 L44 128 L44 58 Z"}
              className="cd-lateral"
            />
            <text x={110} y={bando ? 136 : 112} className="cd-bando">lateral</text>
            {/* cotas da lateral */}
            <text x={150} y={bando ? 158 : 124} textAnchor="middle" className={`cd-num cd-menor${lateral.largura > 0 ? " cd-pronto" : ""}`}>
              {lateral.largura > 0 ? `${formatNum(lateral.largura)} → ${formatNum(lateral.largura + 5)}` : "avanço"}
            </text>
            <text
              x={58}
              y={bando ? 112 : 96}
              className={`cd-num cd-menor${lateral.altura > 0 ? " cd-pronto" : ""}`}
            >
              {lateral.altura > 0 ? `${formatNum(lateral.altura)}↓${formatNum(lateral.altura + (bando ? 30 : 5))}` : "alt."}
            </text>
          </>
        ) : (
          /* mão-francesa */
          <path d="M44 120 Q 70 88 118 60" className="cd-linha cd-fina" />
        )}

        {/* ferragem / lona curva */}
        <path d={curva} className="cd-linha cd-grossa" pathLength={100} key={`c${temA}`} />

        {/* bandô: a lona passa da frente e cai */}
        {bando && (
          <>
            <path d="M262 128 L262 162" className="cd-linha cd-grossa" />
            <path d="M262 162 q3 5 6 0 q3 5 6 0" className="cd-linha cd-fina" />
            <text x={254} y={156} textAnchor="end" className="cd-bando">bandô</text>
          </>
        )}

        {/* medida por cima da curva */}
        <text className={`cd-num${temA ? " cd-pronto" : ""}`}>
          <textPath href="#curva-casca" startOffset="50%" textAnchor="middle">
            {temA ? formatNum(altura) : "altura"}
            {temA && <tspan className="cd-final">{` → ${formatNum(alturaFinal)}`}</tspan>}
          </textPath>
        </text>

        {/* largura (de frente) */}
        <g className={temL ? "cd-pronto" : undefined}>
          <text x={150} y={182} textAnchor="middle" className="cd-num">
            <tspan className="cd-rotulo">largura </tspan>
            {temL ? formatNum(largura) : "—"}
            {temL && larguraCorte ? <tspan className="cd-final">{` → ${formatNum(larguraCorte)}`}</tspan> : null}
          </text>
        </g>
      </svg>
      <figcaption>
        {temL && temA
          ? `${formatNum(largura)} × ${formatNum(altura)} (por cima da curva${bando ? ", com o bandô" : ""}), altura +${acrescimo}`
          : bando
            ? "Altura é a medida por cima da curva, já contando o bandô que cai na frente"
            : "Altura é a medida da ferragem por cima, acompanhando a curva"}
      </figcaption>
    </figure>
  );
}
