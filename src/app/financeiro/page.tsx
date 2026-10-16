"use client";

import { useCallback, useMemo, useState } from "react";
import {
  LuArrowDownLeft,
  LuArrowUpRight,
  LuCheck,
  LuLogOut,
  LuPlus,
  LuReceipt,
  LuSearch,
  LuX,
} from "react-icons/lu";
import { Cabecalho } from "@/components/Cabecalho";
import { FormLancamento, type DadosForm } from "@/components/FormLancamento";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { mensagemErroBanco } from "@/lib/firebase";
import { calculosRepo } from "@/lib/data/calculos";
import { lancamentosRepo, tipoDe, useLancamentos, type Lancamento } from "@/lib/data/lancamentos";
import { sincronizarDoFinanceiro } from "@/lib/data/servicos";
import { formatBRL, formatDataCurta, formatDataGrupo, hojeISO } from "@/lib/format";
import { PERIODOS, intervaloDoPeriodo, type PeriodoId } from "@/lib/periodos";

/** um único filtro: tudo ou um dos 4 cartões do resumo */
type Ver = "tudo" | "aReceber" | "recebido" | "aPagar" | "pago";
const NOME_VER: Record<Ver, string> = {
  tudo: "Tudo",
  aReceber: "A receber",
  recebido: "Recebido",
  aPagar: "A pagar",
  pago: "Pago",
};
function passa(l: Lancamento, ver: Ver) {
  if (ver === "tudo") return true;
  const r = tipoDe(l) === "receita";
  if (ver === "aReceber") return r && !l.pago;
  if (ver === "recebido") return r && l.pago;
  if (ver === "aPagar") return !r && !l.pago;
  return !r && l.pago;
}
type Ordem = "recentes" | "antigos" | "maior" | "menor";

const ehReceita = (l: Lancamento) => tipoDe(l) === "receita";

const nomeLancamento = (l: Lancamento) =>
  l.descricao || (ehReceita(l) ? `Entrada de ${formatDataCurta(l.data)}` : `Compra de ${formatDataCurta(l.data)}`);

function textoSituacao(l: Lancamento) {
  const r = ehReceita(l);
  if (!l.pago) return r ? "A receber" : "A pagar";
  const quando = l.dataPagamento ? ` em ${formatDataCurta(l.dataPagamento)}` : "";
  return (r ? "Recebido" : "Pago") + quando;
}

const ORDENS: { id: Ordem; nome: string }[] = [
  { id: "recentes", nome: "Mais recentes" },
  { id: "antigos", nome: "Mais antigos" },
  { id: "maior", nome: "Maior valor" },
  { id: "menor", nome: "Menor valor" },
];

export default function FinanceiroPage() {
  const toast = useToast();
  const { sair, usuario } = useAuth();
  const { itens, carregando, erro } = useLancamentos();

  const [periodo, setPeriodo] = useState<PeriodoId>("mes");
  const [datas, setDatas] = useState({ de: "", ate: "" });
  const [ver, setVer] = useState<Ver>("tudo");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [busca, setBusca] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const intervalo = useMemo(() => intervaloDoPeriodo(periodo, datas), [periodo, datas]);

  // período + busca: base dos totais
  const doPeriodo = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return itens.filter(
      (l) =>
        (!intervalo.de || l.data >= intervalo.de) &&
        (!intervalo.ate || l.data <= intervalo.ate) &&
        (!t || nomeLancamento(l).toLowerCase().includes(t)),
    );
  }, [itens, intervalo, busca]);

  const totais = useMemo(() => {
    const t = { aReceber: 0, recebido: 0, aPagar: 0, pago: 0, nReceber: 0, nPagar: 0 };
    for (const l of doPeriodo) {
      if (ehReceita(l)) {
        if (l.pago) t.recebido += l.valor;
        else {
          t.aReceber += l.valor;
          t.nReceber++;
        }
      } else if (l.pago) t.pago += l.valor;
      else {
        t.aPagar += l.valor;
        t.nPagar++;
      }
    }
    return { ...t, saldo: t.recebido - t.pago, previsto: t.recebido + t.aReceber - t.pago - t.aPagar };
  }, [doPeriodo]);

  const visiveis = useMemo(() => {
    const lista = doPeriodo.filter((l) => passa(l, ver));
    const porData = (a: Lancamento, b: Lancamento) =>
      a.data === b.data ? b.criadoEm - a.criadoEm : a.data < b.data ? 1 : -1;
    switch (ordem) {
      case "antigos":
        return [...lista].sort((a, b) => -porData(a, b));
      case "maior":
        return [...lista].sort((a, b) => b.valor - a.valor);
      case "menor":
        return [...lista].sort((a, b) => a.valor - b.valor);
      default:
        return [...lista].sort(porData);
    }
  }, [doPeriodo, ver, ordem]);

  const agrupar = ordem === "recentes" || ordem === "antigos";
  const grupos = useMemo(() => {
    if (!agrupar) return [["", visiveis] as [string, Lancamento[]]];
    const mapa = new Map<string, Lancamento[]>();
    for (const l of visiveis) {
      const lista = mapa.get(l.data) ?? [];
      lista.push(l);
      mapa.set(l.data, lista);
    }
    return [...mapa.entries()];
  }, [visiveis, agrupar]);

  const sugestoes = useMemo(() => {
    const vistos = new Set<string>();
    const lista: string[] = [];
    for (const l of itens) {
      if (l.servicoId) continue;
      const d = l.descricao.trim();
      if (d && !vistos.has(d.toLowerCase())) {
        vistos.add(d.toLowerCase());
        lista.push(d);
      }
    }
    return lista.slice(0, 30);
  }, [itens]);

  const filtrosAtivos =
    (ver !== "tudo" ? 1 : 0) + (busca.trim() ? 1 : 0) + (ordem !== "recentes" ? 1 : 0);
  /** toca no cartão: filtra; toca de novo: mostra tudo */
  const alternarVer = (v: Ver) => setVer((atual) => (atual === v ? "tudo" : v));
  const cartao = (v: Ver, extra: string) => ({
    type: "button" as const,
    className: `mini ${extra}${ver === v ? " ativo" : ""}`,
    "aria-pressed": ver === v,
    onClick: () => alternarVer(v),
  });
  function limparFiltros() {
    setVer("tudo");
    setBusca("");
    setOrdem("recentes");
  }

  const definirPago = useCallback(async (l: Lancamento, pago: boolean, dataPagamento: string | null) => {
    await lancamentosRepo.atualizar(l.id, { pago, dataPagamento });
    if (l.servicoId) await sincronizarDoFinanceiro(l, pago);
  }, []);

  const alternarPago = useCallback(
    async (l: Lancamento) => {
      const pago = !l.pago;
      try {
        await definirPago(l, pago, pago ? hojeISO() : null);
      } catch (e) {
        toast({ mensagem: `Não foi possível atualizar. ${mensagemErroBanco(e)}` });
        return;
      }
      const r = ehReceita(l);
      toast({
        mensagem: pago
          ? r
            ? l.servicoId
              ? "Recebido. Serviço finalizado"
              : "Marcado como recebido"
            : "Marcado como pago"
          : r
            ? "Voltou para a receber"
            : "Voltou para a pagar",
        acao: { rotulo: "Desfazer", executar: () => definirPago({ ...l, pago }, l.pago, l.dataPagamento) },
      });
    },
    [toast, definirPago],
  );

  async function criar(d: DadosForm) {
    try {
      const id = await lancamentosRepo.criar({
        ...d,
        servicoId: null,
        dataPagamento: d.pago ? hojeISO() : null,
        criadoEm: Date.now(),
      });
      setNovoAberto(false);
      toast({
        mensagem: `${d.tipo === "receita" ? "Entrada" : "Compra"} de ${formatBRL(d.valor)} salva`,
        acao: { rotulo: "Desfazer", executar: () => lancamentosRepo.excluir(id) },
      });
    } catch (e) {
      toast({ mensagem: `Não foi possível salvar. ${mensagemErroBanco(e)}` });
    }
  }

  async function salvarEdicao(d: DadosForm) {
    if (!editando) return;
    const l = editando;
    const mudouPago = d.pago !== l.pago;
    try {
      if (l.servicoId) {
        // serviço: só valor, data e recebido mudam aqui
        await lancamentosRepo.atualizar(l.id, {
          valor: d.valor,
          data: d.data,
          pago: d.pago,
          dataPagamento: mudouPago ? (d.pago ? hojeISO() : null) : l.dataPagamento,
        });
        if (d.valor !== l.valor) await calculosRepo.atualizar(l.servicoId, { valor: d.valor }).catch(() => {});
        if (mudouPago) await sincronizarDoFinanceiro(l, d.pago);
      } else {
        await lancamentosRepo.atualizar(l.id, {
          ...d,
          dataPagamento: mudouPago ? (d.pago ? hojeISO() : null) : l.dataPagamento,
        });
      }
      setEditando(null);
      toast({ mensagem: "Alterações salvas" });
    } catch (e) {
      toast({ mensagem: `Não foi possível salvar. ${mensagemErroBanco(e)}` });
    }
  }

  async function excluir() {
    if (!editando || editando.servicoId) return;
    const copia = editando;
    await lancamentosRepo.excluir(copia.id);
    setEditando(null);
    toast({
      mensagem: "Lançamento excluído",
      acao: { rotulo: "Desfazer", executar: () => lancamentosRepo.restaurar(copia) },
    });
  }

  const fecharNovo = useCallback(() => setNovoAberto(false), []);
  const fecharEdicao = useCallback(() => setEditando(null), []);
  const totalMov = totais.recebido + totais.pago;
  const pctEntrada = totalMov > 0 ? (totais.recebido / totalMov) * 100 : 50;

  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        subtitulo="Entradas, compras e saldo"
        direita={
          <button type="button" className="icone-btn claro" onClick={sair} aria-label={`Sair (${usuario?.email})`} title="Sair">
            <LuLogOut />
          </button>
        }
      />

      <section className="resumo resumo-fin" aria-label="Resumo do período">
        <div className="resumo-principal">
          <span>Saldo do período</span>
          <strong className={totais.saldo < 0 ? "negativo" : undefined}>{formatBRL(totais.saldo)}</strong>
          <small>
            Recebido menos pago. Previsto com pendências: <b>{formatBRL(totais.previsto)}</b>
          </small>
        </div>
        <div className="barra-saldo" aria-hidden>
          <span className="b-entrada" style={{ width: `${pctEntrada}%` }} />
          <span className="b-saida" style={{ width: `${100 - pctEntrada}%` }} />
        </div>
        <p className="dica-cartoes">Toque num cartão para ver só aqueles lançamentos</p>
        <div className="resumo-grade">
          <button {...cartao("aReceber", "entrada")}>
            <span><LuArrowDownLeft aria-hidden /> A receber</span>
            <strong>{formatBRL(totais.aReceber)}</strong>
            <small>{totais.nReceber} {totais.nReceber === 1 ? "pendente" : "pendentes"}</small>
          </button>
          <button {...cartao("recebido", "entrada")}>
            <span><LuCheck aria-hidden /> Recebido</span>
            <strong>{formatBRL(totais.recebido)}</strong>
          </button>
          <button {...cartao("aPagar", "saida")}>
            <span><LuArrowUpRight aria-hidden /> A pagar</span>
            <strong>{formatBRL(totais.aPagar)}</strong>
            <small>{totais.nPagar} {totais.nPagar === 1 ? "pendente" : "pendentes"}</small>
          </button>
          <button {...cartao("pago", "saida")}>
            <span><LuCheck aria-hidden /> Pago</span>
            <strong>{formatBRL(totais.pago)}</strong>
          </button>
        </div>
      </section>

      <section className="filtros" aria-label="Filtros">
        <div className="chips" role="radiogroup" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={periodo === p.id}
              className={periodo === p.id ? "ativo" : undefined}
              onClick={() => setPeriodo(p.id)}
            >
              {p.nome}
            </button>
          ))}
        </div>
        {periodo === "personalizado" && (
          <div className="datas">
            <label className="campo">
              <span>De</span>
              <input type="date" value={datas.de} onChange={(e) => setDatas((d) => ({ ...d, de: e.target.value }))} />
            </label>
            <label className="campo">
              <span>Até</span>
              <input type="date" value={datas.ate} onChange={(e) => setDatas((d) => ({ ...d, ate: e.target.value }))} />
            </label>
          </div>
        )}

        <div className="linha-filtros">
          <label className="busca busca-larga">
            <LuSearch aria-hidden />
            <input
              type="search"
              placeholder="Buscar"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar pela descrição"
            />
          </label>
          <label className="ordenar">
            <span className="sr-only">Ordenar</span>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
              {ORDENS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtrosAtivos > 0 && (
          <button type="button" className="limpar-filtros" onClick={limparFiltros}>
            <LuX aria-hidden /> Limpar filtros ({filtrosAtivos})
          </button>
        )}
      </section>

      {erro && <p className="erro caixa" role="alert">{erro}</p>}

      {carregando ? (
        <div className="lista-esqueleto" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} />)}
        </div>
      ) : visiveis.length === 0 ? (
        <section className="vazio">
          <LuReceipt aria-hidden />
          <p>{itens.length === 0 ? "Nenhum lançamento ainda." : "Nada com esses filtros."}</p>
          <small>Toque em + para lançar uma compra ou entrada. Serviços salvos entram sozinhos.</small>
        </section>
      ) : (
        <div className="lancamentos">
          <p className="contagem">
            {visiveis.length} {visiveis.length === 1 ? "lançamento" : "lançamentos"}
            {ver !== "tudo" && <> · {NOME_VER[ver]}</>}
          </p>
          {grupos.map(([data, lista]) => {
            const liquido = lista.reduce((s, l) => s + (ehReceita(l) ? l.valor : -l.valor), 0);
            return (
              <section key={data || "todos"} className="grupo-dia">
                {data && (
                  <h3>
                    <span>{formatDataGrupo(data)}</span>
                    <span className={liquido >= 0 ? "pos" : "neg"}>
                      {liquido >= 0 ? "+" : "−"}
                      {formatBRL(Math.abs(liquido))}
                    </span>
                  </h3>
                )}
                <ul>
                  {lista.map((l) => {
                    const r = ehReceita(l);
                    return (
                      <li key={l.id} className={`item${l.pago ? " pago" : ""}${r ? " receita" : " despesa"}`}>
                        <button
                          type="button"
                          className="marcar"
                          onClick={() => alternarPago(l)}
                          aria-label={`${l.pago ? "Desmarcar" : r ? "Marcar como recebido" : "Marcar como pago"}: ${nomeLancamento(l)}`}
                          aria-pressed={l.pago}
                        >
                          <LuCheck />
                        </button>
                        <button type="button" className="item-corpo" onClick={() => setEditando(l)}>
                          <span className={l.descricao ? "item-nome" : "item-nome sem-descricao"}>
                            {nomeLancamento(l)}
                          </span>
                          <span className="item-status">
                            {r ? <LuArrowDownLeft aria-hidden /> : <LuArrowUpRight aria-hidden />}
                            {textoSituacao(l)}
                            {l.servicoId && <i className="selo-mini">Serviço</i>}
                            {!agrupar && <small className="item-data">{formatDataCurta(l.data)}</small>}
                          </span>
                          <span className="item-valor">
                            {r ? "+" : "−"}
                            {formatBRL(l.valor)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <button type="button" className="fab" onClick={() => setNovoAberto(true)} aria-label="Novo lançamento">
        <LuPlus />
      </button>

      <Sheet aberto={novoAberto} titulo="Novo lançamento" onFechar={fecharNovo}>
        <FormLancamento
          sugestoes={sugestoes}
          onSalvar={criar}
          tipoInicial={ver === "aReceber" || ver === "recebido" ? "receita" : "despesa"}
        />
      </Sheet>

      <Sheet aberto={!!editando} titulo={editando?.servicoId ? "Recebimento do serviço" : "Editar lançamento"} onFechar={fecharEdicao}>
        {editando && (
          <FormLancamento
            key={editando.id}
            inicial={editando}
            sugestoes={sugestoes}
            onSalvar={salvarEdicao}
            onExcluir={editando.servicoId ? undefined : excluir}
          />
        )}
      </Sheet>
    </>
  );
}
