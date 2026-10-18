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
      "Altura + 25 cm com bandô, ou + 15 cm com canhão",
      "Moldura de lona e cristal (medidas provisórias)",
    ],
    href: "/toldos/cortina-visor",
  },
  {
    id: "fixo-casca",
    nome: "Fixo (casca)",
    resumo: "Estrutura fixa curva, sem bandô",
    regras: [
      "Largura + 10 cm + 1 cm por emenda",
      "Altura (ferragem por cima da curva) + 10 cm",
    ],
    href: "/toldos/casca",
  },
  {
    id: "fixo-casca-bando",
    nome: "Fixo (casca) com bandô",
    resumo: "Estrutura fixa curva, bandô na frente",
    regras: ["Largura + 10 cm + 1 cm por emenda", "Altura (ferragem + bandô) + 10 cm"],
    href: "/toldos/casca-bando",
  },
  {
    id: "fixo-lateral",
    nome: "Fixo com lateral",
    resumo: "Casca com ou sem bandô e laterais",
    regras: [
      "Mesmo cálculo da casca",
      "Lateral: altura + 5 cm (sem bandô) ou + 30 cm (com bandô)",
      "Lateral: largura + 5 cm + 1 cm por emenda",
    ],
    href: "/toldos/fixo-lateral",
  },
];
