"use client";

import { useCallback, useMemo, useState } from "react";
import {
  LuCheck,
  LuClipboardList,
  LuChevronRight,
  LuPencil,
  LuRotateCcw,
  LuSearch,
  LuListFilter,
  LuTrash2,
} from "react-icons/lu";
import { Cabecalho } from "@/components/Cabecalho";
import { CalculadoraToldo } from "@/components/CalculadoraToldo";
import { useConfirmar } from "@/components/Confirmar";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import type { Modelo } from "@/lib/calc/cortina";
import { cristalItem, itensDe, metrosItem, statusDe, useCalculos, type CalculoSalvo } from "@/lib/data/calculos";
import { useMontagem } from "@/lib/montagem";
import {
  NOME_TIPO,
  nomeItem,
  totalToldos,
  definirFinalizado,
  editarServico,
  excluirServico,
} from "@/lib/data/servicos";
import { formatBRL, formatDataCurta, formatM, formatNum, hojeISO } from "@/lib/format";
import { mensagemErroBanco } from "@/lib/firebase";
import { datasInvertidas, datasPadrao, intervaloDasDatas } from "@/lib/periodos";

type Situacao = "abertos" | "finalizados" | "todos";

interface Filtros {
  situacao: Situacao;
  tipo: Modelo | "todos";
  datas: { de: string; ate: string };
  busca: string;
}

const filtrosIniciais = (): Filtros => ({
  situacao: "abertos",
  tipo: "todos",
  datas: datasPadrao(),
  busca: "",
});

/** lona de todos os toldos do serviço */
const metrosDe = (c: CalculoSalvo) => itensDe(c).reduce((s, i) => s + metrosItem(i), 0);
const diaDe = (c: CalculoSalvo) => hojeISO(new Date(c.criadoEm));

export default function ServicosPage() {
  const toast = useToast();
  const confirmar = useConfirmar();
  const montagem = useMontagem();

  // rascunho dos filtros: só vai ao banco quando toca em Buscar
  const [f, setF] = useState<Filtros>(filtrosIniciais);
  const [aplicado, setAplicado] = useState<Filtros | null>(null);
  const muda = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setF((x) => ({ ...x, [k]: v }));
  const { situacao, tipo, datas, busca } = f;

  const intervaloAplicado = useMemo(
    () => (aplicado ? intervaloDasDatas(aplicado.datas) : null),
    [aplicado],
  );
  const { itens: servicos, carregando, erro, buscou } = useCalculos(intervaloAplicado);
  const pendente = !aplicado || JSON.stringify(aplicado) !== JSON.stringify(f);
  const buscar = () => setAplicado({ ...f, datas: { ...f.datas } });

  const [aberto, setAberto] = useState<CalculoSalvo | null>(null);

  const filtrados = useMemo(() => {
    if (!aplicado) return [];
    const t = aplicado.busca.trim().toLowerCase();
    return servicos.filter(
      (c) =>
        (aplicado.situacao === "todos" ||
          (aplicado.situacao === "abertos" ? statusDe(c) === "aberto" : statusDe(c) === "finalizado")) &&
        (aplicado.tipo === "todos" || itensDe(c).some((i) => i.tipo === aplicado.tipo)) &&
        (!t || (c.cliente || "sem referência").toLowerCase().includes(t)),
    );
  }, [servicos, aplicado]);

  const resumo = useMemo(() => {
    let abertos = 0, aReceber = 0, finalizados = 0, recebido = 0;
    for (const c of servicos) {
      if (statusDe(c) === "aberto") {
        abertos++;
        aReceber += c.valor ?? 0;
      } else {
        finalizados++;
        recebido += c.valor ?? 0;
      }
    }
    return { abertos, aReceber, finalizados, recebido };
  }, [servicos]);

  const alternar = useCallback(
    async (c: CalculoSalvo) => {
      const finalizar = statusDe(c) === "aberto";
      const quem = c.cliente || "Sem referência";
      const ok = await confirmar(
        finalizar
          ? {
              titulo: "Finalizar serviço?",
              mensagem: (
                <>
                  <b>{quem}</b>
                  {c.valor ? <> · {formatBRL(c.valor)}</> : null}
                  <br />O valor vai para <b>recebido</b> no Financeiro.
                </>
              ),
              confirmar: "Finalizar",
              tom: "ok",
            }
          : {
              titulo: "Reabrir serviço?",
              mensagem: (
                <>
                  <b>{quem}</b> volta para em aberto e o valor volta para <b>a receber</b>.
                </>
              ),
              confirmar: "Reabrir",
              tom: "neutro",
            },
      );
      if (!ok) return;
      try {
        await definirFinalizado(c, finalizar);
      } catch (e) {
        toast({ mensagem: `Não foi possível atualizar. ${mensagemErroBanco(e)}` });
        return;
      }
      setAberto(null);
      toast({
        mensagem: finalizar
          ? `Serviço finalizado${c.valor ? `. ${formatBRL(c.valor)} recebido` : ""}`
          : "Serviço reaberto. Voltou para a receber",
        acao: { rotulo: "Desfazer", executar: () => definirFinalizado({ ...c }, !finalizar) },
      });
    },
    [toast, confirmar],
  );

  /** leva o serviço para a montagem: dá para alterar, tirar ou juntar toldos */
  async function editarToldos(c: CalculoSalvo) {
    if (montagem.ativo && montagem.rascunho.servicoId !== c.id) {
      const ok = await confirmar({
        titulo: "Trocar o serviço em montagem?",
        mensagem: "Já tem um serviço em montagem que ainda não foi salvo. Ele será descartado.",
        confirmar: "Trocar",
        tom: "neutro",
      });
      if (!ok) return;
    }
    if (montagem.rascunho.servicoId !== c.id) montagem.carregarServico(c);
    setAberto(null);
    montagem.abrirPainel();
  }

  async function excluir(c: CalculoSalvo) {
    const ok = await confirmar({
      titulo: "Excluir serviço?",
      mensagem: (
        <>
          <b>{c.cliente || "Sem referência"}</b>
          {c.valor ? <> · {formatBRL(c.valor)}</> : null}
          <br />O lançamento dele no Financeiro também será apagado.
        </>
      ),
      confirmar: "Excluir",
      tom: "perigo",
    });
    if (!ok) return;
    let desfazer: () => Promise<void>;
    try {
      desfazer = await excluirServico(c);
    } catch (e) {
      toast({ mensagem: `Não foi possível excluir. ${mensagemErroBanco(e)}` });
      return;
    }
    setAberto(null);
    toast({ mensagem: "Serviço excluído", acao: { rotulo: "Desfazer", executar: desfazer } });
  }

  const fechar = useCallback(() => setAberto(null), []);

  // toldo de um serviço aberto na tela de cálculo (só consulta), sem sair da página
  const [vendo, setVendo] = useState<{ c: CalculoSalvo; idx: number } | null>(null);
  if (vendo) {
    const lista = itensDe(vendo.c);
    const item = lista[vendo.idx];
    const voltar = () => {
      const atual = servicos.find((x) => x.id === vendo.c.id) ?? vendo.c;
      setVendo(null);
      setAberto(atual);
    };
    return (
      <CalculadoraToldo
        key={item.id}
        modelo={item.tipo}
        visualizar={{
          item,
          numero: vendo.idx + 1,
          total: lista.length,
          cliente: vendo.c.cliente,
          onVoltar: voltar,
          onAnterior: vendo.idx > 0 ? () => setVendo({ c: vendo.c, idx: vendo.idx - 1 }) : undefined,
          onProximo: vendo.idx < lista.length - 1 ? () => setVendo({ c: vendo.c, idx: vendo.idx + 1 }) : undefined,
        }}
      />
    );
  }

  return (
    <>
      <Cabecalho titulo="Serviços" subtitulo="Toldos salvos e entregas" />

      {buscou && (
      <section className="resumo resumo-servicos" aria-label="Resumo dos serviços">
        <div>
          <span>Em aberto</span>
          <strong>{resumo.abertos}</strong>
          <small>{formatBRL(resumo.aReceber)} a receber</small>
        </div>
        <div>
          <span>Finalizados</span>
          <strong>{resumo.finalizados}</strong>
          <small>{formatBRL(resumo.recebido)} recebido</small>
        </div>
      </section>
      )}

      <section className="filtros" aria-label="Filtros">
        <div className="linha-filtros">
          <div className="segmentado compacto" role="radiogroup" aria-label="Situação">
            {(
              [
                ["abertos", "Em aberto"],
                ["finalizados", "Finalizados"],
                ["todos", "Todos"],
              ] as [Situacao, string][]
            ).map(([id, nome]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={situacao === id}
                className={situacao === id ? "ativo" : undefined}
                onClick={() => muda("situacao", id)}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>

        <div className="chips" role="radiogroup" aria-label="Tipo de toldo">
          {(["todos", "cortina", "cortina-visor", "casca", "casca-bando", "fixo-lateral"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              className={tipo === t ? "ativo" : undefined}
              onClick={() => muda("tipo", t)}
            >
              {t === "todos" ? "Todos os tipos" : NOME_TIPO[t]}
            </button>
          ))}
        </div>

        <div className="datas datas-busca">
          <label className="campo">
            <span>De</span>
            <input type="date" value={datas.de} max={datas.ate || undefined} onChange={(e) => muda("datas", { ...datas, de: e.target.value })} />
          </label>
          <label className="campo">
            <span>Até</span>
            <input type="date" value={datas.ate} min={datas.de || undefined} onChange={(e) => muda("datas", { ...datas, ate: e.target.value })} />
          </label>
        </div>
        {datasInvertidas(datas) && <p className="erro aviso-datas">A data "De" está depois da data "Até".</p>}

        <div className="linha-filtros">
          <label className="busca busca-larga">
            <LuSearch aria-hidden />
            <input
              type="search"
              placeholder="Buscar cliente"
              value={busca}
              onChange={(e) => muda("busca", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              enterKeyHint="search"
              aria-label="Buscar pelo cliente"
            />
          </label>
        </div>
      </section>

      <button
        type="button"
        className={`botao-principal botao-buscar${buscou && pendente ? " pendente" : ""}`}
        onClick={buscar}
        disabled={carregando || datasInvertidas(datas)}
      >
        <LuSearch aria-hidden /> {carregando ? "Buscando…" : "Buscar"}
      </button>
      {buscou && pendente && <p className="aviso-buscar">Filtros mudaram. Toque em Buscar para atualizar.</p>}

      {erro && <p className="erro caixa" role="alert">{erro}</p>}

      {!buscou ? (
        <section className="antes-de-buscar">
          <LuListFilter aria-hidden />
          <p>Escolha os filtros e toque em Buscar</p>
          <small>Os serviços só são carregados quando você buscar.</small>
        </section>
      ) : carregando ? (
        <div className="lista-esqueleto" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <section className="vazio">
          <LuClipboardList aria-hidden />
          <p>{servicos.length === 0 ? "Nenhum serviço nesse período." : "Nenhum serviço com esses filtros."}</p>
          <small>Faça um cálculo de toldo e use “Salvar serviço” no final.</small>
        </section>
      ) : (
        <ul className="lista-servicos">
          {filtrados.map((c) => {
            const fin = statusDe(c) === "finalizado";
            return (
              <li key={c.id} className={fin ? "servico finalizado" : "servico"}>
                <button type="button" className="servico-corpo" onClick={() => setAberto(c)}>
                  <span className="servico-topo">
                    <strong>{c.cliente || "Sem referência"}</strong>
                    <em>{c.valor ? formatBRL(c.valor) : "sem valor"}</em>
                  </span>
                  <span className="servico-info">
                    {itensDe(c).length === 1 ? (
                      <>
                        {NOME_TIPO[c.tipo ?? "cortina"]} {formatNum(c.entrada.largura)} × {formatNum(c.entrada.altura)}
                        {c.entrada.quantidade > 1 && `, ${c.entrada.quantidade} toldos`}
                      </>
                    ) : (
                      <>
                        <b>{totalToldos(itensDe(c))} toldos:</b> {itensDe(c).map(nomeItem).join(" · ")}
                      </>
                    )}
                    , {formatM(metrosDe(c))} de lona
                  </span>
                  <span className="servico-rodape">
                    <span className={fin ? "selo selo-ok" : "selo selo-aberto"}>
                      {fin ? `Finalizado ${c.finalizadoEm ? formatDataCurta(c.finalizadoEm) : ""}` : "Em aberto"}
                    </span>
                    <small>Salvo em {formatDataCurta(diaDe(c))}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={fin ? "servico-acao reabrir" : "servico-acao"}
                  onClick={() => alternar(c)}
                  aria-label={fin ? "Reabrir serviço" : "Finalizar serviço"}
                  title={fin ? "Reabrir" : "Finalizar"}
                >
                  {fin ? <LuRotateCcw /> : <LuCheck />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet aberto={!!aberto} titulo="Serviço" onFechar={fechar}>
        {aberto && (
          <DetalheServico
            key={aberto.id}
            c={aberto}
            onAlternar={() => alternar(aberto)}
            onAbrir={() => editarToldos(aberto)}
            onVer={(idx) => {
              setVendo({ c: aberto, idx });
              setAberto(null);
            }}
            onExcluir={() => excluir(aberto)}
            onSalvar={async (d) => {
              await editarServico(aberto, d);
              setAberto(null);
              toast({ mensagem: "Serviço atualizado" });
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function DetalheServico({
  c,
  onAlternar,
  onAbrir,
  onVer,
  onExcluir,
  onSalvar,
}: {
  c: CalculoSalvo;
  onAlternar(): void;
  onAbrir(): void;
  onVer(idx: number): void;
  onExcluir(): void;
  onSalvar(d: { cliente: string; valor: number }): Promise<void>;
}) {
  const [cliente, setCliente] = useState(c.cliente);
  const fin = statusDe(c) === "finalizado";
  const mudou = cliente.trim() !== c.cliente;
  const itens = itensDe(c);
  const cristal = itens.reduce((s, i) => s + cristalItem(i), 0);

  return (
    <div className="detalhe-servico">
      <ol className="itens-servico itens-detalhe">
        {itens.map((i, idx) => (
          <li key={i.id}>
            <button type="button" className="item-abrir" onClick={() => onVer(idx)}>
            <span className="item-num">{idx + 1}</span>
            <span className="item-servico-textos">
              <strong>{nomeItem(i)}</strong>
              <small>
                Corte {formatNum(i.resultado.larguraCorte)} × {formatNum(i.resultado.alturaCorte)} ·{" "}
                {formatM(metrosItem(i))} de lona
                {cristalItem(i) > 0 && ` · ${formatM(cristalItem(i))} de cristal`}
              </small>
            </span>
            {i.valor ? <span className="item-valor-txt">{formatBRL(i.valor)}</span> : null}
            <LuChevronRight className="seta-item" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <dl className="totais-servico">
        <div>
          <dt>Toldos</dt>
          <dd>{totalToldos(itens)}</dd>
        </div>
        <div>
          <dt>Lona</dt>
          <dd>{formatM(metrosDe(c))}</dd>
        </div>
        {cristal > 0 && (
          <div>
            <dt>Cristal</dt>
            <dd>{formatM(cristal)}</dd>
          </div>
        )}
      </dl>

      <label className="campo">
        <span>Cliente ou referência</span>
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={60} />
      </label>
      <div className="total-servico">
        <span>
          Valor do serviço
          <small>{itens.length > 1 ? `soma dos ${itens.length} toldos` : "valor do toldo"}</small>
        </span>
        <strong>{formatBRL(c.valor ?? 0)}</strong>
      </div>
      <p className="dica-salvar">Toque num toldo para ver os detalhes. Para mudar valores, use “Editar toldos”.</p>

      {mudou && (
        <button
          type="button"
          className="botao-secundario"
          onClick={() => onSalvar({ cliente, valor: c.valor ?? 0 })}
        >
          Salvar alterações
        </button>
      )}

      <button type="button" className={fin ? "botao-secundario" : "botao-principal botao-ok"} onClick={onAlternar}>
        {fin ? <LuRotateCcw aria-hidden /> : <LuCheck aria-hidden />}
        {fin ? "Reabrir serviço" : "Finalizar serviço"}
      </button>
      <p className="dica-salvar">
        {fin
          ? "Reabrir volta o valor para a receber no Financeiro."
          : "Finalizar marca o valor como recebido no Financeiro."}
      </p>

      <button type="button" className="botao-secundario" onClick={onAbrir}>
        <LuPencil aria-hidden /> Editar toldos (alterar, tirar ou juntar)
      </button>
      <button type="button" className="botao-perigo" onClick={onExcluir}>
        <LuTrash2 aria-hidden /> Excluir serviço
      </button>
    </div>
  );
}
