/**
 * Cortina com visor (janela de cristal no meio).
 *
 * Regras da empresa:
 *  - Largura de corte = medida + 15 cm (10 + 2 + 3, fixos)
 *  - Cristal: altura = largura do rolo do cristal (140), uma peça só
 *  - Sobra = altura do toldo − cristal; metade = sobra ÷ 2
 *  - Faixa de cima  = metade + 7
 *  - Faixa de baixo = metade + 20 (com bandô) ou metade + 10 (sem bandô)
 *  - Altura de corte (e das 2 laterais) = igual à cortina: altura + 25 (bandô) ou + 15 (sem bandô).
 *    Os 2 cm a mais das emendas (7 + 20 = 27) só entram nas faixas, não nas laterais.
 *  - 2 laterais de lona (50 cm, editável) de cima a baixo, soldadas; as faixas e o cristal
 *    ficam entre as laterais.
 *
 * Exemplo: toldo 250 com bandô → sobra 110 → metade 55 → cima 62, cristal 140, baixo 75.
 *
 * A regra vale a partir de 200 de altura (caída). Abaixo disso a produção decide caso a caso;
 * normalmente usa meia faixa de cristal (70 cm). O sistema avisa para confirmar.
 */

export const VISOR_SOMA_LARGURA = 15;
export const VISOR_SOMA_CIMA = 7;
export const VISOR_SOMA_BAIXO = { comBando: 20, semBando: 10 };
export const VISOR_PADRAO = { lateral: 50 };
export const ROLO_CRISTAL_CM = 140;
/** abaixo desta altura (caída) é preciso confirmar com a produção */
export const VISOR_ALTURA_MINIMA = 200;
/** meia faixa de cristal, usada normalmente em cortina baixa */
export const CRISTAL_MEIA_FAIXA = 70;

export interface EntradaVisor {
  /** largura de cada lateral */
  lateral: number;
  /** largura do rolo do cristal = altura do cristal */
  roloCristal: number;
  /** serviços antigos: medidas fixas das faixas (não são mais usadas) */
  cima?: number;
  baixo?: number;
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
  /** altura do toldo − cristal */
  sobra: number;
  /** sobra ÷ 2 */
  metade: number;
  somaCima: number;
  somaBaixo: number;
  /** altura de corte = altura das laterais (altura + 25 com bandô, + 15 sem) */
  alturaTotal: number;
  /** faixa de cima + cristal + faixa de baixo (inclui as sobras das emendas) */
  alturaPecas: number;
  /** largura entre as laterais (faixas e cristal) */
  larguraMeio: number;
  metrosLaterais: number;
  metrosFaixas: number;
  /** lona por toldo */
  metrosLona: number;
  /** cristal por toldo */
  metrosCristal: number;
  /** aviso quando as medidas não fecham */
  aviso: string | null;
}

/**
 * @param larguraCorte largura já com os + 15
 * @param alturaCorte altura já com os + 25 (bandô) ou + 15 (sem bandô): altura das laterais
 * @param altura altura do toldo (a medida digitada)
 * @param comBando com bandô soma 20 embaixo; sem bandô, 10
 * @param rolo largura do rolo de lona
 */
export function calcularVisor(
  larguraCorte: number,
  alturaCorte: number,
  altura: number,
  comBando: boolean,
  rolo: number,
  v: EntradaVisor,
): ResultadoVisor {
  const lateral = Math.max(0, v.lateral);
  const hCristal = v.roloCristal > 0 ? v.roloCristal : ROLO_CRISTAL_CM;

  const sobra = r1(altura - hCristal);
  const metade = r1(sobra / 2);
  const somaCima = VISOR_SOMA_CIMA;
  const somaBaixo = comBando ? VISOR_SOMA_BAIXO.comBando : VISOR_SOMA_BAIXO.semBando;
  const hCima = r1(metade + somaCima);
  const hBaixo = r1(metade + somaBaixo);
  const alturaPecas = r1(hCima + hCristal + hBaixo);
  const alturaTotal = r1(alturaCorte);
  const larguraMeio = r1(larguraCorte - 2 * lateral);

  let aviso: string | null = null;
  if (sobra <= 0) aviso = `A altura do toldo precisa ser maior que o cristal (${formatar(hCristal)} cm).`;
  else if (larguraMeio <= 0) aviso = "As laterais são mais largas que a cortina. Diminua a largura das laterais.";

  // laterais: cabem lado a lado na largura do rolo? (ex.: 2 × 50 = 100 ≤ 140 → 1 corte)
  let metrosLaterais: number;
  if (lateral <= 0) metrosLaterais = 0;
  else if (lateral > rolo) metrosLaterais = 2 * Math.ceil(lateral / rolo) * (alturaTotal / 100);
  else {
    const porCorte = Math.max(1, Math.floor(rolo / lateral));
    metrosLaterais = Math.ceil(2 / porCorte) * (alturaTotal / 100);
  }

  // faixas de cima e de baixo: cortadas no comprimento do rolo; se as duas cabem
  // juntas na largura do rolo, saem do mesmo pedaço
  const larguraFaixas = Math.max(0, larguraMeio);
  const metrosFaixas = sobra > 0 ? (hCima + hBaixo <= rolo ? 1 : 2) * (larguraFaixas / 100) : 0;

  // cristal: a altura é a largura do rolo, então sai numa peça só, no comprimento da largura do meio
  const metrosCristal = larguraMeio > 0 && sobra > 0 ? larguraMeio / 100 : 0;

  return {
    lateral: { largura: lateral, altura: alturaTotal },
    faixaCima: { largura: larguraFaixas, altura: Math.max(0, hCima) },
    faixaBaixo: { largura: larguraFaixas, altura: Math.max(0, hBaixo) },
    cristal: { largura: larguraFaixas, altura: hCristal },
    sobra,
    metade,
    somaCima,
    somaBaixo,
    alturaTotal,
    alturaPecas,
    larguraMeio,
    metrosLaterais: r2(metrosLaterais),
    metrosFaixas: r2(metrosFaixas),
    metrosLona: r2(metrosLaterais + metrosFaixas),
    metrosCristal: r2(metrosCristal),
    aviso,
  };
}

function formatar(n: number) {
  return String(n).replace(".", ",");
}
function r1(n: number) {
  return Math.round(n * 10) / 10;
}
function r2(n: number) {
  return Math.round(n * 100) / 100;
}
