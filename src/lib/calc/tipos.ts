export interface TipoToldo {
  id: string;
  nome: string;
  resumo: string;
  regras: string[];
  href?: string; // sem href = ainda não disponível
}

export const TIPOS_TOLDO: TipoToldo[] = [
  {
    id: "cortina",
    nome: "Toldo Cortina",
    resumo: "Enrola no tubo, com bandô ou canhão",
    regras: [
      "Largura + 10 cm (5 de cada lado) + 1 cm por emenda",
      "Altura + 25 cm com bandô, ou + 15 cm com canhão",
    ],
    href: "/toldos/cortina",
  },
  {
    id: "cortina-visor",
    nome: "Cortina com visor",
    resumo: "Cortina com janela de cristal",
    regras: [
      "Largura + 15 cm (10 + 2 + 3, fixos)",
      "Altura + 25 cm com bandô, ou + 15 cm sem bandô",
      "Faixas: (altura − cristal) ÷ 2, + 7 em cima e + 20 ou + 10 embaixo",
    ],
    href: "/toldos/cortina-visor",
  },
  {
    id: "fixo-casca",
    nome: "Fixo (casca)",
    resumo: "Estrutura fixa curva, com ou sem bandô",
    regras: [
      "Largura + 10 cm + 1 cm por emenda",
      "Altura (ferragem por cima da curva) + 30 cm",
      "Com bandô: a medida já inclui o bandô",
    ],
    href: "/toldos/casca",
  },
  {
    id: "fixo-lateral",
    nome: "Fixo com lateral",
    resumo: "Casca com ou sem bandô e laterais",
    regras: [
      "Casca: mesmo cálculo (altura + 30 cm)",
      "Lateral: altura + 5 cm (sem bandô) ou + 30 cm (com bandô)",
      "Lateral: largura + 5 cm + 1 cm por emenda",
    ],
    href: "/toldos/fixo-lateral",
  },
];
