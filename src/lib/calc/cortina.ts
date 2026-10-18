/**
 * Toldo Cortina e Toldo Fixo (Casca)
 *
 * Regras da empresa:
 *  - Largura de corte = medida + 10 cm (5 cm de cada lado) + 1 cm por emenda
 *  - Altura de corte  = Cortina: medida + 25 cm (bandô) ou + 15 cm (canhão)
 *                       Casca (com ou sem bandô, e a casca do Fixo com lateral):
 *                       medida da ferragem por cima da curva + 30 cm (correção da fábrica; antes + 10)
 *  - Lona em rolo de 1,40 m: os gomos são emendados lado a lado na largura
 */

import { VISOR_PADRAO, ROLO_CRISTAL_CM, VISOR_SOMA_LARGURA, calcularVisor, type EntradaVisor, type ResultadoVisor } from "./visor";

export type Acabamento = "bando" | "canhao";
export type Modelo = "cortina" | "cortina-visor" | "casca" | "casca-bando" | "fixo-lateral";
/** Laterais do Fixo com lateral: largura + 5 + 1 cm por emenda; altura + 5 (sem bandô) ou + 30 (com bandô) */
export const LATERAL_LARGURA = 5;
export const LATERAL_ALTURA = { semBando: 5, comBando: 30 };
/** casca: altura + 30, com ou sem bandô (correção da fábrica; antes estava + 10) */
export const ACRESCIMO_CASCA = 30;

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
  /** padrão: cortina */
  modelo?: Modelo;
  quantidade: number;
  rolo?: number; // cm, padrão 140
  /** pedaço de lona que sobrou de outro serviço (opcional), em cm */
  retalho?: { largura: number; comprimento?: number } | null;
  /** Fixo com lateral: com ou sem bandô */
  comBando?: boolean;
  /** Fixo com lateral: medidas da ferragem da lateral (avanço e altura na parede), em cm */
  lateral?: { largura: number; altura: number } | null;
  /** Cortina com visor: moldura de lona e rolo do cristal */
  visor?: EntradaVisor | null;
}

export interface ResultadoLateral {
  larguraCorte: number;
  alturaCorte: number;
  gomos: number;
  emendas: number;
  larguraGomos: number[];
  retalho: number;
  /** metros de lona de UMA lateral */
  metrosPorLateral: number;
  /** metros das 2 laterais × quantidade de toldos */
  metrosTotal: number;
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
  /** Fixo com lateral: as 2 laterais (null nos outros tipos) */
  laterais?: ResultadoLateral | null;
  /** lona total do rolo novo: casca + laterais */
  metrosGeral?: number;
  /** Cortina com visor: peças da moldura e do cristal (por toldo) */
  visor?: ResultadoVisor | null;
  /** Cortina com visor: metros de cristal × quantidade */
  metrosCristalTotal?: number;
}

export function calcularCortina(e: EntradaCortina): ResultadoCortina | null {
  const rolo = e.rolo ?? ROLO_LONA_CM;
  if (!(e.largura > 0) || !(e.altura > 0) || !(rolo > 0)) return null;
  const quantidade = Math.max(1, Math.floor(e.quantidade || 1));

  if (e.modelo === "cortina-visor") return calcularCortinaVisor(e, rolo, quantidade);

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

  const alturaCorte = e.altura + acrescimoAltura(e);
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

  // Fixo com lateral: 2 laterais em gomos, recortadas depois no formato da ferragem
  let laterais: ResultadoLateral | null = null;
  if (e.modelo === "fixo-lateral" && e.lateral && e.lateral.largura > 0 && e.lateral.altura > 0) {
    // largura + 5 + 1 cm por emenda (igual à casca); altura + 5 sem bandô ou + 30 com bandô
    const baseLat = e.lateral.largura + LATERAL_LARGURA;
    let g = Math.max(1, Math.ceil(baseLat / rolo));
    let lc = round1(baseLat + (g - 1) * CM_POR_EMENDA);
    while (lc > g * rolo) {
      g += 1;
      lc = round1(baseLat + (g - 1) * CM_POR_EMENDA);
    }
    const ac = round1(e.lateral.altura + (e.comBando ? LATERAL_ALTURA.comBando : LATERAL_ALTURA.semBando));
    const lgs: number[] = [];
    for (let i = 0; i < g; i++) lgs.push(Math.min(rolo, round1(lc - i * rolo)));
    // a faixa cortada vai no meio, como na casca
    if (g > 2) lgs.splice(Math.floor(g / 2), 0, lgs.pop()!);
    const porLateral = round2((g * ac) / 100);
    laterais = {
      larguraCorte: lc,
      alturaCorte: ac,
      gomos: g,
      emendas: g - 1,
      larguraGomos: lgs,
      retalho: round1(g * rolo - lc),
      metrosPorLateral: porLateral,
      metrosTotal: round2(porLateral * 2 * quantidade),
    };
  }

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
    laterais,
    metrosGeral: round2(metrosRolo + (laterais?.metrosTotal ?? 0)),
  };
}

/** quanto soma na altura: bandô/canhão no Cortina; + 30 na Casca (com ou sem bandô) */
export function acrescimoAltura(e: Pick<EntradaCortina, "modelo" | "acabamento">) {
  if (!e.modelo || e.modelo === "cortina" || e.modelo === "cortina-visor") return ACRESCIMO_ALTURA[e.acabamento];
  return ACRESCIMO_CASCA;
}

/** Cortina com visor: largura + 15 fixos, altura igual à cortina, moldura de lona + cristal */
function calcularCortinaVisor(e: EntradaCortina, rolo: number, quantidade: number): ResultadoCortina {
  const larguraCorte = round1(e.largura + VISOR_SOMA_LARGURA);
  const alturaCorte = round1(e.altura + ACRESCIMO_ALTURA[e.acabamento]);
  const v = calcularVisor(larguraCorte, alturaCorte, rolo, e.visor ?? { ...VISOR_PADRAO, roloCristal: ROLO_CRISTAL_CM });
  const metrosTotal = round2(v.metrosLona * quantidade);
  return {
    rolo,
    larguraCorte,
    alturaCorte,
    // peças de lona: 2 laterais + faixa de cima + faixa de baixo
    gomos: 4,
    emendas: 2,
    larguraGomos: [],
    retalho: 0,
    metrosPorToldo: v.metrosLona,
    metrosTotal,
    metrosRolo: metrosTotal,
    usoRetalho: null,
    areaCorte: round2((larguraCorte * alturaCorte) / 10000),
    laterais: null,
    metrosGeral: metrosTotal,
    visor: v,
    metrosCristalTotal: round2(v.metrosCristal * quantidade),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
