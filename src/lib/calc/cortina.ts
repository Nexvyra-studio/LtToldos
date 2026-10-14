/**
 * Toldo Cortina
 *
 * Regras da empresa:
 *  - Largura de corte = medida + 10 cm (5 cm de cada lado) + 1 cm por emenda
 *  - Altura de corte  = medida + 25 cm (bandô) ou + 15 cm (canhão)
 *  - Lona em rolo de 1,40 m: os gomos são emendados lado a lado na largura
 */

export type Acabamento = "bando" | "canhao";

export const ROLO_LONA_CM = 140;
export const SOBRA_LATERAL_CM = 10;
export const CM_POR_EMENDA = 1;
export const ACRESCIMO_ALTURA: Record<Acabamento, number> = {
  bando: 25,
  canhao: 15,
};
export const NOME_ACABAMENTO: Record<Acabamento, string> = {
  bando: "Bandô",
  canhao: "Canhão",
};

export interface EntradaCortina {
  largura: number; // cm
  altura: number; // cm
  acabamento: Acabamento;
  quantidade: number;
  rolo?: number; // cm, padrão 140
  /** pedaço de lona que sobrou de outro serviço (opcional), em cm */
  retalho?: { largura: number; comprimento?: number } | null;
}

export type UsoRetalho =
  | { usado: true; gomo: number; larguraGomo: number; sobraLargura: number }
  | { usado: false; motivo: string; precisaLargura: number; precisaComprimento: number };

export interface ResultadoCortina {
  /** largura do rolo usada, em cm */
  rolo: number;
  larguraCorte: number;
  alturaCorte: number;
  gomos: number;
  emendas: number;
  /** largura de cada gomo, da esquerda para a direita; o gomo cortado fica no meio */
  larguraGomos: number[];
  /** quanto do último gomo sobra do rolo (retalho), em cm */
  retalho: number;
  /** metros lineares de lona para 1 toldo */
  metrosPorToldo: number;
  /** metros lineares de lona considerando a quantidade */
  metrosTotal: number;
  /** metros de lona saindo do rolo novo (já descontando o retalho, se usado) */
  metrosRolo: number;
  /** resultado do uso do retalho, quando informado */
  usoRetalho: UsoRetalho | null;
  /** área do toldo pronto (m²), para 1 toldo */
  areaCorte: number;
}

export function calcularCortina(e: EntradaCortina): ResultadoCortina | null {
  const rolo = e.rolo ?? ROLO_LONA_CM;
  if (!(e.largura > 0) || !(e.altura > 0) || !(rolo > 0)) return null;
  const quantidade = Math.max(1, Math.floor(e.quantidade || 1));

  const base = e.largura + SOBRA_LATERAL_CM;

  // Cada emenda acrescenta 1 cm, o que pode exigir mais um gomo.
  let gomos = Math.max(1, Math.ceil(base / rolo));
  let larguraCorte = base + (gomos - 1) * CM_POR_EMENDA;
  while (larguraCorte > gomos * rolo) {
    gomos += 1;
    larguraCorte = base + (gomos - 1) * CM_POR_EMENDA;
  }
  const emendas = gomos - 1;

  const larguraGomos: number[] = [];
  for (let i = 0; i < gomos; i++) {
    const usado = i * rolo;
    larguraGomos.push(Math.min(rolo, round1(larguraCorte - usado)));
  }
  // O gomo cortado (mais estreito) vai no meio do toldo, não no canto
  if (gomos > 2) {
    const estreito = larguraGomos.pop()!;
    larguraGomos.splice(Math.floor(gomos / 2), 0, estreito);
  }
  const retalho = round1(gomos * rolo - larguraCorte);

  const alturaCorte = e.altura + ACRESCIMO_ALTURA[e.acabamento];
  const metrosPorToldo = round2((gomos * alturaCorte) / 100);
  const metrosTotal = round2(metrosPorToldo * quantidade);

  // Retalho de outro serviço: cobre o gomo mais estreito, se couber
  let usoRetalho: UsoRetalho | null = null;
  const rt = e.retalho;
  if (rt && rt.largura > 0) {
    const comprimento = rt.comprimento ?? Infinity;
    let idx = 0;
    larguraGomos.forEach((g, i) => {
      if (g < larguraGomos[idx]) idx = i;
    });
    const precisa = larguraGomos[idx];
    if (rt.largura >= precisa && comprimento >= alturaCorte) {
      usoRetalho = { usado: true, gomo: idx, larguraGomo: precisa, sobraLargura: round1(rt.largura - precisa) };
    } else {
      const faltas: string[] = [];
      if (rt.largura < precisa) faltas.push(`largura de pelo menos ${precisa} cm`);
      if (comprimento < alturaCorte) faltas.push(`comprimento de pelo menos ${alturaCorte} cm`);
      usoRetalho = {
        usado: false,
        motivo: `O retalho precisa ter ${faltas.join(" e ")}.`,
        precisaLargura: precisa,
        precisaComprimento: alturaCorte,
      };
    }
  }
  // um retalho atende só um toldo
  const metrosRolo = usoRetalho?.usado ? round2(metrosTotal - alturaCorte / 100) : metrosTotal;

  return {
    rolo,
    larguraCorte: round1(larguraCorte),
    alturaCorte: round1(alturaCorte),
    gomos,
    emendas,
    larguraGomos,
    retalho,
    metrosPorToldo,
    metrosTotal,
    metrosRolo,
    usoRetalho,
    areaCorte: round2((larguraCorte * alturaCorte) / 10000),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
