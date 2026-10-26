import type { ResultadoVisor } from "@/lib/calc/visor";
import { formatNum } from "@/lib/format";

interface Props {
  larguraCorte: number;
  alturaCorte: number;
  v: ResultadoVisor;
  acabamento: string;
}

/**
 * Cortina com visor vista de frente, com as peças de corte:
 * 2 laterais (soldadas) de cima a baixo, faixa de cima e faixa de baixo
 * emendadas no cristal (linhas amarelas).
 */
export function DesenhoVisor({ larguraCorte, alturaCorte, v, acabamento }: Props) {
  const W = 250;
  const ratio = Math.min(2.2, Math.max(0.8, larguraCorte / alturaCorte));
  const H = Math.round(W / ratio);
  const x0 = 34;
  const y0 = 26;
  const sx = W / larguraCorte;
  const sy = H / alturaCorte;

  const wLat = Math.max(10, v.lateral.largura * sx);
  const hCima = Math.max(14, v.faixaCima.altura * sy);
  const hBaixo = Math.max(14, v.faixaBaixo.altura * sy);
  const xMeio = x0 + wLat;
  const wMeio = W - 2 * wLat;
  const yCristal = y0 + hCima;
  const hCristal = Math.max(10, H - hCima - hBaixo);

  return (
    <figure className="caderno desenho-visor">
      <svg
        viewBox={`0 0 ${x0 + W + 30} ${y0 + H + 34}`}
        role="img"
        aria-label={`Cortina com visor ${formatNum(larguraCorte)} por ${formatNum(alturaCorte)} centímetros`}
      >
        {/* laterais (soldadas) */}
        <rect x={x0} y={y0} width={wLat} height={H} className="d-gomo-a" />
        <rect x={x0 + W - wLat} y={y0} width={wLat} height={H} className="d-gomo-a" />
        {/* faixas de cima e de baixo */}
        <rect x={xMeio} y={y0} width={wMeio} height={hCima} className="d-gomo-b" />
        <rect x={xMeio} y={y0 + H - hBaixo} width={wMeio} height={hBaixo} className="d-gomo-b" />
        {/* cristal */}
        <rect x={xMeio} y={yCristal} width={wMeio} height={hCristal} className="dv-cristal" />
        <path
          d={`M${xMeio + 10} ${yCristal + hCristal - 10} l18 -18 M${xMeio + 22} ${yCristal + hCristal - 8} l12 -12`}
          className="dv-brilho"
        />

        {/* solda nas laterais */}
        <line x1={xMeio} y1={y0} x2={xMeio} y2={y0 + H} className="dv-solda" />
        <line x1={x0 + W - wLat} y1={y0} x2={x0 + W - wLat} y2={y0 + H} className="dv-solda" />
        {/* emendas no cristal */}
        <line x1={xMeio} y1={yCristal} x2={xMeio + wMeio} y2={yCristal} className="d-emenda" />
        <line x1={xMeio} y1={yCristal + hCristal} x2={xMeio + wMeio} y2={yCristal + hCristal} className="d-emenda" />
        <rect x={x0} y={y0} width={W} height={H} className="d-contorno" />

        {/* textos das peças */}
        <text x={x0 + wLat / 2} y={y0 + H / 2} textAnchor="middle" className="d-texto-gomo dv-vertical"
          transform={`rotate(-90 ${x0 + wLat / 2} ${y0 + H / 2})`}>
          {formatNum(v.lateral.largura)}
        </text>
        <text x={x0 + W - wLat / 2} y={y0 + H / 2} textAnchor="middle" className="d-texto-gomo"
          transform={`rotate(-90 ${x0 + W - wLat / 2} ${y0 + H / 2})`}>
          {formatNum(v.lateral.largura)}
        </text>
        <text x={xMeio + wMeio / 2} y={y0 + hCima / 2 + 4} textAnchor="middle" className="d-texto-gomo">
          {formatNum(v.metade)} + {v.somaCima} = {formatNum(v.faixaCima.altura)}
        </text>
        <text x={xMeio + wMeio / 2} y={y0 + H - hBaixo / 2 + 4} textAnchor="middle" className="d-texto-gomo">
          {formatNum(v.metade)} + {v.somaBaixo} = {formatNum(v.faixaBaixo.altura)} · {acabamento.toLowerCase()}
        </text>
        <text x={xMeio + wMeio / 2} y={yCristal + hCristal / 2} textAnchor="middle" className="dv-texto-cristal">
          Cristal
        </text>
        <text x={xMeio + wMeio / 2} y={yCristal + hCristal / 2 + 13} textAnchor="middle" className="dv-texto-cristal dv-menor">
          {formatNum(v.cristal.largura)} × {formatNum(v.cristal.altura)}
        </text>

        {/* cotas */}
        <g className="d-cota">
          <line x1={x0} y1={y0 - 10} x2={x0 + W} y2={y0 - 10} />
          <text x={x0 + W / 2} y={y0 - 14} textAnchor="middle">
            {formatNum(larguraCorte)}
          </text>
          <line x1={x0 + W + 12} y1={y0} x2={x0 + W + 12} y2={y0 + H} />
          <text x={x0 + W + 16} y={y0 + H / 2} transform={`rotate(90 ${x0 + W + 16} ${y0 + H / 2})`} textAnchor="middle">
            {formatNum(alturaCorte)}
          </text>
          <line x1={xMeio} y1={y0 + H + 12} x2={xMeio + wMeio} y2={y0 + H + 12} />
          <text x={xMeio + wMeio / 2} y={y0 + H + 26} textAnchor="middle">
            meio {formatNum(v.larguraMeio)}
          </text>
        </g>
      </svg>
      <figcaption>
        Laterais soldadas (azul escuro) · faixas de cima e de baixo emendadas no cristal (linhas amarelas)
      </figcaption>
    </figure>
  );
}
