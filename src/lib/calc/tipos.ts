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
    regras: ["Regras em definição"],
  },
  {
    id: "fixo-casca",
    nome: "Fixo (casca)",
    resumo: "Estrutura fixa, sem bandô",
    regras: [
      "Largura + 10 cm + 1 cm por emenda",
      "Altura + 10 cm",
    ],
  },
  {
    id: "fixo-casca-bando",
    nome: "Fixo (casca) com bandô",
    resumo: "Estrutura fixa com bandô",
    regras: ["Largura + 10 cm + 1 cm por emenda", "Altura + 10 cm"],
  },
  {
    id: "fixo-lateral",
    nome: "Fixo com lateral",
    resumo: "Casca com ou sem bandô e laterais",
    regras: [
      "Mesmo cálculo da casca",
      "Lateral: altura + 5 cm (sem bandô) ou + 30 cm (com bandô)",
      "Lateral: largura sempre + 5 cm",
    ],
  },
];
