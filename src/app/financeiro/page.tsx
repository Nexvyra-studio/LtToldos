"use client";

import { useCallback, useMemo, useState } from "react";
import { LuCheck, LuLogOut, LuPlus, LuReceipt, LuSearch } from "react-icons/lu";
import { Cabecalho } from "@/components/Cabecalho";
import { FormLancamento, type DadosForm } from "@/components/FormLancamento";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { lancamentosRepo, useLancamentos, type Lancamento } from "@/lib/data/lancamentos";
import { formatBRL, formatDataCurta, formatDataGrupo, hojeISO } from "@/lib/format";
import { PERIODOS, intervaloDoPeriodo, type PeriodoId } from "@/lib/periodos";

type Status = "todos" | "pendentes" | "pagos";

const nomeLancamento = (l: Lancamento) => l.descricao || `Compra de ${formatDataCurta(l.data)}`;

export default function FinanceiroPage() {
  const toast = useToast();
  const { sair, usuario } = useAuth();
  const { itens, carregando, erro } = useLancamentos();

  const [periodo, setPeriodo] = useState<PeriodoId>("mes");
  const [datas, setDatas] = useState({ de: "", ate: "" });
  const [status, setStatus] = useState<Status>("todos");
  const [busca, setBusca] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);

  const intervalo = useMemo(() => intervaloDoPeriodo(periodo, datas), [periodo, datas]);

  // Filtra só por período e busca: os totais respeitam isso
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
    let pago = 0;
    let aPagar = 0;
    let nPendentes = 0;
    for (const l of doPeriodo) {
      if (l.pago) pago += l.valor;
      else {
        aPagar += l.valor;
        nPendentes++;
      }
    }
    return { pago, aPagar, total: pago + aPagar, nPendentes };
  }, [doPeriodo]);

  const visiveis = useMemo(
    () =>
      doPeriodo.filter((l) => (status === "todos" ? true : status === "pagos" ? l.pago : !l.pago)),
    [doPeriodo, status],
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, Lancamento[]>();
    for (const l of visiveis) {
      const lista = mapa.get(l.data) ?? [];
      lista.push(l);
      mapa.set(l.data, lista);
    }
    return [...mapa.entries()];
  }, [visiveis]);

  const sugestoes = useMemo(() => {
    const vistos = new Set<string>();
    const lista: string[] = [];
    for (const l of itens) {
      const d = l.descricao.trim();
      if (d && !vistos.has(d.toLowerCase())) {
        vistos.add(d.toLowerCase());
        lista.push(d);
      }
    }
    return lista.slice(0, 30);
  }, [itens]);

  const alternarPago = useCallback(
    async (l: Lancamento) => {
      const pago = !l.pago;
      await lancamentosRepo.atualizar(l.id, { pago, dataPagamento: pago ? hojeISO() : null });
      toast({
        mensagem: pago ? "Marcado como pago" : "Voltou para a pagar",
        acao: {
          rotulo: "Desfazer",
          executar: () =>
            lancamentosRepo.atualizar(l.id, { pago: l.pago, dataPagamento: l.dataPagamento }),
        },
      });
    },
    [toast],
  );

  async function criar(d: DadosForm) {
    try {
      const id = await lancamentosRepo.criar({
        ...d,
        dataPagamento: d.pago ? hojeISO() : null,
        criadoEm: Date.now(),
      });
      setNovoAberto(false);
      toast({
        mensagem: `Compra de ${formatBRL(d.valor)} salva`,
        acao: { rotulo: "Desfazer", executar: () => lancamentosRepo.excluir(id) },
      });
    } catch {
      toast({ mensagem: "Não foi possível salvar. Confira a conexão." });
    }
  }

  async function salvarEdicao(d: DadosForm) {
    if (!editando) return;
    const mudouPago = d.pago !== editando.pago;
    await lancamentosRepo.atualizar(editando.id, {
      ...d,
      dataPagamento: mudouPago ? (d.pago ? hojeISO() : null) : editando.dataPagamento,
    });
    setEditando(null);
    toast({ mensagem: "Alterações salvas" });
  }

  async function excluir() {
    if (!editando) return;
    const copia = editando;
    await lancamentosRepo.excluir(copia.id);
    setEditando(null);
    toast({
      mensagem: "Compra excluída",
      acao: { rotulo: "Desfazer", executar: () => lancamentosRepo.restaurar(copia) },
    });
  }

  const fecharNovo = useCallback(() => setNovoAberto(false), []);
  const fecharEdicao = useCallback(() => setEditando(null), []);
  const percentPago = totais.total > 0 ? (totais.pago / totais.total) * 100 : 0;

  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        subtitulo="Compras e pagamentos"
        direita={
          <button type="button" className="icone-btn claro" onClick={sair} aria-label={`Sair (${usuario?.email})`} title="Sair">
            <LuLogOut />
          </button>
        }
      />

      <section className="resumo" aria-label="Resumo do período">
        <div className="resumo-principal">
          <span>A pagar</span>
          <strong>{formatBRL(totais.aPagar)}</strong>
          <small>
            {totais.nPendentes === 0
              ? "Nada pendente no período"
              : `${totais.nPendentes} ${totais.nPendentes === 1 ? "compra pendente" : "compras pendentes"}`}
          </small>
        </div>
        <div className="barra-pago" role="progressbar" aria-valuenow={Math.round(percentPago)} aria-valuemin={0} aria-valuemax={100} aria-label="Quanto já foi pago">
          <span style={{ width: `${percentPago}%` }} />
        </div>
        <dl className="resumo-linha">
          <div>
            <dt><i className="ponto pago" aria-hidden />Pago</dt>
            <dd>{formatBRL(totais.pago)}</dd>
          </div>
          <div>
            <dt>Total de compras</dt>
            <dd>{formatBRL(totais.total)}</dd>
          </div>
        </dl>
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
          <div className="segmentado compacto" role="radiogroup" aria-label="Situação">
            {(
              [
                ["todos", "Todos"],
                ["pendentes", "A pagar"],
                ["pagos", "Pagos"],
              ] as [Status, string][]
            ).map(([id, nome]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={status === id}
                className={status === id ? "ativo" : undefined}
                onClick={() => setStatus(id)}
              >
                {nome}
              </button>
            ))}
          </div>
          <label className="busca">
            <LuSearch aria-hidden />
            <input
              type="search"
              placeholder="Buscar"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar pela descrição"
            />
          </label>
        </div>
      </section>

      {erro && <p className="erro caixa" role="alert">Não foi possível carregar as compras: {erro}</p>}

      {carregando ? (
        <div className="lista-esqueleto" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} />)}
        </div>
      ) : grupos.length === 0 ? (
        <section className="vazio">
          <LuReceipt aria-hidden />
          <p>
            {itens.length === 0
              ? "Nenhuma compra lançada ainda."
              : "Nenhuma compra com esses filtros."}
          </p>
          <small>Toque em + para lançar uma compra.</small>
        </section>
      ) : (
        <div className="lancamentos">
          {grupos.map(([data, lista]) => (
            <section key={data} className="grupo-dia">
              <h3>
                <span>{formatDataGrupo(data)}</span>
                <span>{formatBRL(lista.reduce((s, l) => s + l.valor, 0))}</span>
              </h3>
              <ul>
                {lista.map((l) => (
                  <li key={l.id} className={l.pago ? "item pago" : "item"}>
                    <button
                      type="button"
                      className="marcar"
                      onClick={() => alternarPago(l)}
                      aria-label={l.pago ? `Desmarcar ${nomeLancamento(l)} como pago` : `Marcar ${nomeLancamento(l)} como pago`}
                      aria-pressed={l.pago}
                    >
                      <LuCheck />
                    </button>
                    <button type="button" className="item-corpo" onClick={() => setEditando(l)}>
                      <span className={l.descricao ? "item-nome" : "item-nome sem-descricao"}>
                        {nomeLancamento(l)}
                      </span>
                      <span className="item-status">
                        {l.pago
                          ? `Pago${l.dataPagamento ? ` em ${formatDataCurta(l.dataPagamento)}` : ""}`
                          : "A pagar"}
                      </span>
                      <span className="item-valor">{formatBRL(l.valor)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => setNovoAberto(true)} aria-label="Lançar compra">
        <LuPlus />
      </button>

      <Sheet aberto={novoAberto} titulo="Nova compra" onFechar={fecharNovo}>
        <FormLancamento sugestoes={sugestoes} onSalvar={criar} />
      </Sheet>

      <Sheet aberto={!!editando} titulo="Editar compra" onFechar={fecharEdicao}>
        {editando && (
          <FormLancamento
            key={editando.id}
            inicial={editando}
            sugestoes={sugestoes}
            onSalvar={salvarEdicao}
            onExcluir={excluir}
          />
        )}
      </Sheet>
    </>
  );
}
