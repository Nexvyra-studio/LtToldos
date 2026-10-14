import { hojeISO } from "./format";

export type PeriodoId = "hoje" | "7dias" | "mes" | "mesPassado" | "tudo" | "personalizado";

export const PERIODOS: { id: PeriodoId; nome: string }[] = [
  { id: "mes", nome: "Este mês" },
  { id: "7dias", nome: "7 dias" },
  { id: "hoje", nome: "Hoje" },
  { id: "mesPassado", nome: "Mês passado" },
  { id: "tudo", nome: "Tudo" },
  { id: "personalizado", nome: "Escolher datas" },
];

/** Intervalo inclusivo em ISO (yyyy-mm-dd). null = sem limite */
export function intervaloDoPeriodo(
  id: PeriodoId,
  personalizado?: { de: string; ate: string },
): { de: string | null; ate: string | null } {
  const hoje = new Date();
  switch (id) {
    case "hoje":
      return { de: hojeISO(hoje), ate: hojeISO(hoje) };
    case "7dias": {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { de: hojeISO(d), ate: hojeISO(hoje) };
    }
    case "mes": {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      return { de: hojeISO(ini), ate: hojeISO(fim) };
    }
    case "mesPassado": {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { de: hojeISO(ini), ate: hojeISO(fim) };
    }
    case "personalizado":
      return {
        de: personalizado?.de || null,
        ate: personalizado?.ate || null,
      };
    default:
      return { de: null, ate: null };
  }
}
