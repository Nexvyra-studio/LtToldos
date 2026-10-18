/**
 * Cortina com visor (janela de cristal no meio).
 *
 * Confirmado pela empresa:
 *  - Largura de corte = medida + 15 cm (10 + 2 + 3, fixos)
 *  - Altura de corte  = igual à cortina padrão: + 25 (bandô) ou + 15 (canhão)
 *
 * PROVISÓRIO (do desenho do colega, ainda a confirmar; dá para mudar na tela):
 *  - Moldura de lona: faixa de cima 30 cm + 3 de emenda no cristal,
 *    faixa de baixo 20 cm + 4 de emenda no cristal, laterais de 50 cm.
 *  - As laterais vão de cima a baixo e são soldadas; as faixas de cima e de baixo
 *    e o cristal ficam entre as laterais.
 *  - Cristal = largura entre as laterais × (altura de corte − faixa de cima − faixa de baixo).
 */

export const VISOR_SOMA_LARGURA = 15;
export const VISOR_EMENDA_CIMA = 3;
export const VISOR_EMENDA_BAIXO = 4;
export const VISOR_PADRAO = { cima: 30, baixo: 20, lateral: 50 };
export const ROLO_CRISTAL_CM = 140;

export interface EntradaVisor {
  /** altura da faixa de cima, sem a emenda */
  cima: number;
  /** altura da faixa de baixo, sem a emenda */
  baixo: number;
  /** largura de cada lateral */
  lateral: number;
  /** largura do rolo do cristal */
  roloCristal: number;
}

export interface Peca {
  largura: number;
  altura: number;
}

export interface ResultadoVisor {
  /** 2 laterais, de cima a baixo */
  lateral: Peca;
  faixaCima: Peca;
  faixaBaixo: Peca;
  cristal: Peca;
  /** largura entre as laterais (faixas e cristal) */
  larguraMeio: number;
  metrosLaterais: number;
  metrosFaixas: number;
  /** lona por toldo */
  metrosLona: number;
  /** cristal por toldo */
  metrosCristal: number;
  /** emendas no cristal (quando ele é maior que o rolo) */
  emendasCristal: number;
  /** aviso quando as medidas não fecham */
  aviso: string | null;
}

/** calcula as peças a partir da largura e da altura de corte */
export function calcularVisor(
  larguraCorte: number,
  alturaCorte: number,
  rolo: number,
  v: EntradaVisor,
): ResultadoVisor {
  const lateral = Math.max(0, v.lateral);
  const cima = Math.max(0, v.cima);
  const baixo = Math.max(0, v.baixo);
  const rc = v.roloCristal > 0 ? v.roloCristal : ROLO_CRISTAL_CM;

  const larguraMeio = r1(larguraCorte - 2 * lateral);
  const hCima = r1(cima + VISOR_EMENDA_CIMA);
  const hBaixo = r1(baixo + VISOR_EMENDA_BAIXO);
  const hCristal = r1(alturaCorte - cima - baixo);

  let aviso: string | null = null;
  if (larguraMeio <= 0) aviso = "As laterais são mais largas que a cortina. Diminua a largura das laterais.";
  else if (hCristal <= 0) aviso = "As faixas de cima e de baixo passam da altura. Diminua as faixas.";

  // laterais: cabem lado a lado na largura do rolo? (ex.: 2 × 50 = 100 ≤ 140 → 1 corte)
  let metrosLaterais: number;
  if (lateral <= 0) metrosLaterais = 0;
  else if (lateral > rolo) metrosLaterais = 2 * Math.ceil(lateral / rolo) * (alturaCorte / 100);
  else {
    const porCorte = Math.max(1, Math.floor(rolo / lateral));
    metrosLaterais = Math.ceil(2 / porCorte) * (alturaCorte / 100);
  }

  // faixas de cima e de baixo: cortadas no comprimento do rolo; se as duas cabem
  // juntas na largura do rolo, saem do mesmo pedaço
  const larguraFaixas = Math.max(0, larguraMeio);
  const metrosFaixas = (hCima + hBaixo <= rolo ? 1 : 2) * (larguraFaixas / 100);

  // cristal: deitado no rolo quando a altura cabe; senão em pé; senão com emendas
  let metrosCristal = 0;
  let emendasCristal = 0;
  if (larguraMeio > 0 && hCristal > 0) {
    if (hCristal <= rc) metrosCristal = larguraMeio / 100;
    else if (larguraMeio <= rc) metrosCristal = hCristal / 100;
    else {
      const pedacos = Math.ceil(hCristal / rc);
      emendasCristal = pedacos - 1;
      metrosCristal = (pedacos * larguraMeio) / 100;
    }
  }

  return {
    lateral: { largura: lateral, altura: r1(alturaCorte) },
    faixaCima: { largura: larguraFaixas, altura: hCima },
    faixaBaixo: { largura: larguraFaixas, altura: hBaixo },
    cristal: { largura: Math.max(0, larguraMeio), altura: Math.max(0, hCristal) },
    larguraMeio,
    metrosLaterais: r2(metrosLaterais),
    metrosFaixas: r2(metrosFaixas),
    metrosLona: r2(metrosLaterais + metrosFaixas),
    metrosCristal: r2(metrosCristal),
    emendasCristal,
    aviso,
  };
}

function r1(n: number) {
  return Math.round(n * 10) / 10;
}
function r2(n: number) {
  return Math.round(n * 100) / 100;
}
