"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  LuCheck,
  LuClipboardList,
  LuExternalLink,
  LuRotateCcw,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import { Cabecalho } from "@/components/Cabecalho";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import type { Modelo } from "@/lib/calc/cortina";
import { statusDe, useCalculos, type CalculoSalvo } from "@/lib/data/calculos";
import { useLancamentos } from "@/lib/data/lancamentos";
import {
  CHAVE_ABRIR,
  NOME_TIPO,
  ROTA_TIPO,
  definirFinalizado,
  editarServico,
  excluirServico,
} from "@/lib/data/servicos";
import { centavosParaTexto, formatBRL, formatDataCurta, formatM, formatNum, hojeISO } from "@/lib/format";
import { PERIODOS, intervaloDoPeriodo, type PeriodoId } from "@/lib/periodos";

type Situacao = "abertos" | "finalizados" | "todos";

const metrosDe = (c: CalculoSalvo) => c.resultado.metrosGeral ?? c.resultado.metrosRolo ?? c.resultado.metrosTotal;
const diaDe = (c: CalculoSalvo) => hojeISO(new Date(c.criadoEm));

export default function ServicosPage() {
  const toast = useToast();
  const router = useRouter();
  const servicos = useCalculos();
  const { itens: lancamentos } = useLancamentos();

  const [situacao, setSituacao] = useState<Situacao>("abertos");
  const [tipo, setTipo] = useState<Modelo | "todos">("todos");
  const [periodo, setPeriodo] = useState<PeriodoId>("tudo");
  const [datas, setDatas] = useState({ de: "", ate: "" });
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<CalculoSalvo | null>(null);

  const intervalo = useMemo(() => intervaloDoPeriodo(periodo, datas), [periodo, datas]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return servicos.filter((c) => {
      const dia = diaDe(c);
      return (
        (situacao === "todos" || (situacao === "abertos" ? statusDe(c) === "aberto" : statusDe(c) === "finalizado")) &&
        (tipo === "todos" || c.tipo === tipo) &&
        (!intervalo.de || dia >= intervalo.de) &&
        (!intervalo.ate || dia <= intervalo.ate) &&
        (!t || (c.cliente || "sem referência").toLowerCase().includes(t))
      );
    });
  }, [servicos, situacao, tipo, intervalo, busca]);

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
      await definirFinalizado(c, finalizar);
      setAberto(null);
      toast({
        mensagem: finalizar
          ? `Serviço finalizado${c.valor ? `. ${formatBRL(c.valor)} recebido` : ""}`
          : "Serviço reaberto. Voltou para a receber",
        acao: { rotulo: "Desfazer", executar: () => definirFinalizado({ ...c }, !finalizar) },
      });
    },
    [toast],
  );

  function abrirCalculo(c: CalculoSalvo) {
    try {
      sessionStorage.setItem(CHAVE_ABRIR, c.id);
    } catch {
      /* nada */
    }
    router.push(ROTA_TIPO[c.tipo ?? "cortina"]);
  }

  async function excluir(c: CalculoSalvo) {
    const lanc = lancamentos.find((l) => l.id === c.lancamentoId) ?? null;
    const desfazer = await excluirServico(c, lanc);
    setAberto(null);
    toast({ mensagem: "Serviço excluído", acao: { rotulo: "Desfazer", executar: desfazer } });
  }

  const fechar = useCallback(() => setAberto(null), []);

  return (
    <>
      <Cabecalho titulo="Serviços" subtitulo="Toldos salvos e entregas" />

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
                onClick={() => setSituacao(id)}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>

        <div className="chips" role="radiogroup" aria-label="Tipo de toldo">
          {(["todos", "cortina", "casca", "casca-bando", "fixo-lateral"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              className={tipo === t ? "ativo" : undefined}
              onClick={() => setTipo(t)}
            >
              {t === "todos" ? "Todos os tipos" : NOME_TIPO[t]}
            </button>
          ))}
        </div>

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
              placeholder="Buscar cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar pelo cliente"
            />
          </label>
        </div>
      </section>

      {filtrados.length === 0 ? (
        <section className="vazio">
          <LuClipboardList aria-hidden />
          <p>{servicos.length === 0 ? "Nenhum serviço salvo ainda." : "Nenhum serviço com esses filtros."}</p>
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
                    {NOME_TIPO[c.tipo ?? "cortina"]} {formatNum(c.entrada.largura)} × {formatNum(c.entrada.altura)}
                    {c.entrada.quantidade > 1 && `, ${c.entrada.quantidade} toldos`}, {formatM(metrosDe(c))} de lona
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
            onAbrir={() => abrirCalculo(aberto)}
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
  onExcluir,
  onSalvar,
}: {
  c: CalculoSalvo;
  onAlternar(): void;
  onAbrir(): void;
  onExcluir(): void;
  onSalvar(d: { cliente: string; valor: number }): Promise<void>;
}) {
  const [cliente, setCliente] = useState(c.cliente);
  const [cent, setCent] = useState(c.valor ? Math.round(c.valor * 100) : 0);
  const fin = statusDe(c) === "finalizado";
  const mudou = cliente.trim() !== c.cliente || cent !== Math.round((c.valor ?? 0) * 100);
  const r = c.resultado;

  return (
    <div className="detalhe-servico">
      <dl className="detalhe-medidas">
        <div>
          <dt>Tipo</dt>
          <dd>{NOME_TIPO[c.tipo ?? "cortina"]}</dd>
        </div>
        <div>
          <dt>Medidas</dt>
          <dd>
            {formatNum(c.entrada.largura)} × {formatNum(c.entrada.altura)}
          </dd>
        </div>
        <div>
          <dt>Corte</dt>
          <dd>
            {formatNum(r.larguraCorte)} × {formatNum(r.alturaCorte)}
          </dd>
        </div>
        <div>
          <dt>Lona</dt>
          <dd>{formatM(metrosDe(c))}</dd>
        </div>
      </dl>

      <label className="campo">
        <span>Cliente ou referência</span>
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={60} />
      </label>
      <label className="campo campo-valor">
        <span>Valor do serviço</span>
        <div>
          <em>R$</em>
          <input
            inputMode="numeric"
            value={centavosParaTexto(cent)}
            onChange={(e) => setCent(Number(e.target.value.replace(/\D/g, "").slice(0, 11) || 0))}
            aria-label="Valor do serviço em reais"
          />
        </div>
      </label>

      {mudou && (
        <button
          type="button"
          className="botao-secundario"
          disabled={cent <= 0}
          onClick={() => onSalvar({ cliente, valor: cent / 100 })}
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
        <LuExternalLink aria-hidden /> Abrir cálculo
      </button>
      <button type="button" className="botao-perigo" onClick={onExcluir}>
        <LuTrash2 aria-hidden /> Excluir serviço
      </button>
    </div>
  );
}
