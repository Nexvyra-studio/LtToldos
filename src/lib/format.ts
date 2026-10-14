const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export const formatBRL = (v: number) => brl.format(v);
export const formatNum = (v: number) => num.format(v);
export const formatCm = (v: number) => `${num.format(v)} cm`;
const metros = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatMetros = (v: number) => metros.format(v);
export const formatM = (v: number) => `${metros.format(v)} m`;

/** "2026-10-13" no fuso local */
export function hojeISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDataCurta(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const diaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });

/** "Hoje", "Ontem" ou "segunda, 12 de outubro" */
export function formatDataGrupo(iso: string) {
  const hoje = hojeISO();
  const ontemD = new Date();
  ontemD.setDate(ontemD.getDate() - 1);
  if (iso === hoje) return "Hoje";
  if (iso === hojeISO(ontemD)) return "Ontem";
  const d = parseISO(iso);
  const sem = diaSemana.format(d).replace("-feira", "");
  return `${sem.charAt(0).toUpperCase()}${sem.slice(1)}, ${diaMes.format(d)}`;
}

/** Converte "1.234,56" / "1234.56" / "1234" para número */
export function parseValor(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  if (!limpo) return NaN;
  const temVirgula = limpo.includes(",");
  const normal = temVirgula ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  return Number(normal);
}

/** Converte centavos digitados em "1.234,56" (estilo caixa eletrônico) */
export function centavosParaTexto(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
