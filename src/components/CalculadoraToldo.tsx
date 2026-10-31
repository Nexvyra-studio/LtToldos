"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuCheck, LuChevronRight, LuClipboardList, LuPlus, LuRuler, LuX } from "react-icons/lu";
import { Cabecalho } from "@/components/Cabecalho";
import { DesenhoCaderno } from "@/components/DesenhoCaderno";
import { DesenhoCasca } from "@/components/DesenhoCasca";
import { DesenhoCortina } from "@/components/DesenhoCortina";
import { DesenhoVisor } from "@/components/DesenhoVisor";
import { useToast } from "@/components/Toast";
import {
  ACRESCIMO_ALTURA,
  CM_POR_EMENDA,
  NOME_ACABAMENTO,
  ROLO_LONA_CM,
  SOBRA_LATERAL_CM,
  acrescimoAltura,
  calcularCortina,
  type Acabamento,
  type Modelo,
} from "@/lib/calc/cortina";
import {
  CRISTAL_MEIA_FAIXA,
  ROLO_CRISTAL_CM,
  VISOR_ALTURA_MINIMA,
  VISOR_PADRAO,
  VISOR_SOMA_BAIXO,
  VISOR_SOMA_CIMA,
  VISOR_SOMA_LARGURA,
} from "@/lib/calc/visor";
import type { EntradaCortina } from "@/lib/calc/cortina";
import type { ItemServico } from "@/lib/data/calculos";
import { centavosParaTexto, formatBRL, formatM, formatMetros, formatNum, parseValor } from "@/lib/format";
import { useMontagem } from "@/lib/montagem";

function lerRoloSalvo() {
  try {
    const v = Number(localStorage.getItem("toldos:rolo"));
    return v >= 50 && v <= 500 ? v : ROLO_LONA_CM;
  } catch {
    return ROLO_LONA_CM;
  }
}

const TEXTOS: Record<Modelo, { titulo: string; altura: string; vazio: string }> = {
  cortina: {
    titulo: "Toldo Cortina",
    altura: "Altura",
    vazio: "Digite a largura e a altura do vão, em centímetros.",
  },
  "cortina-visor": {
    titulo: "Cortina com visor",
    altura: "Altura",
    vazio: "Digite a largura e a altura do vão, em centímetros.",
  },
  casca: {
    titulo: "Fixo (Casca)",
    altura: "Altura (curva)",
    vazio: "Digite a largura e a medida da ferragem por cima da curva, em centímetros.",
  },
  "fixo-lateral": {
    titulo: "Fixo com lateral",
    altura: "Altura (curva)",
    vazio: "Digite a largura e a medida da ferragem por cima da curva, em centímetros.",
  },
  "casca-bando": {
    titulo: "Fixo (Casca)",
    altura: "Altura (curva + bandô)",
    vazio: "Digite a largura e a medida por cima da curva já com o bandô, em centímetros.",
  },
};

/** Tela de cálculo por faixas (gomos), usada pelo Toldo Cortina e pelo Toldo Fixo (Casca) */
interface Visualizar {
  item: ItemServico;
  /** número do toldo no serviço (1, 2, 3…) */
  numero: number;
  total: number;
  cliente: string;
  onVoltar(): void;
  onAnterior?: () => void;
  onProximo?: () => void;
}

/**
 * Tela de cálculo por faixas, usada por todos os tipos.
 * Com `visualizar`, mostra um toldo de um serviço salvo só para consulta (campos travados).
 */
export function CalculadoraToldo({ modelo: modeloInicial, visualizar }: { modelo: Modelo; visualizar?: Visualizar }) {
  // Fixo (casca): uma tela só; o botão Sem bandô / Com bandô troca entre "casca" e "casca-bando"
  const [modelo, setModelo] = useState<Modelo>(modeloInicial);
  useEffect(() => setModelo(modeloInicial), [modeloInicial]);
  const ehCasca = modelo === "casca" || modelo === "casca-bando";
  const toast = useToast();
  const textos = TEXTOS[modelo];
  const ehVisor = modelo === "cortina-visor";
  // cortina e cortina com visor: altura com bandô ou canhão
  const ehCortina = modelo === "cortina" || ehVisor;

  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [acabamento, setAcabamento] = useState<Acabamento>("bando");
  // 1 toldo por cálculo: vários toldos vão juntos no serviço ("Adicionar ao serviço")
  const [quantidade, setQuantidade] = useState(1);
  const [rolo, setRolo] = useState(ROLO_LONA_CM);
  const [roloTexto, setRoloTexto] = useState(String(ROLO_LONA_CM));

  // lembra o último rolo usado neste aparelho
  useEffect(() => {
    const salvo = lerRoloSalvo();
    setRolo(salvo);
    setRoloTexto(String(salvo).replace(".", ","));
  }, []);

  function escolherRolo(cm: number) {
    setRolo(cm);
    try {
      localStorage.setItem("toldos:rolo", String(cm));
    } catch {
      /* sem armazenamento */
    }
  }
  const [comBandoLat, setComBandoLat] = useState(false);
  const [latLarg, setLatLarg] = useState("");
  const [latAlt, setLatAlt] = useState("");
  const [visLateral, setVisLateral] = useState(String(VISOR_PADRAO.lateral));
  const [visRolo, setVisRolo] = useState(String(ROLO_CRISTAL_CM));
  const [usarRetalho, setUsarRetalho] = useState(false);
  const [retalhoLarg, setRetalhoLarg] = useState("");
  const [retalhoComp, setRetalhoComp] = useState("");
  const montagem = useMontagem();
  // toldo do serviço em montagem aberto aqui para alterar
  const itemEditando = visualizar
    ? null
    : (montagem.rascunho.itens.find(
        (i) =>
          i.id === montagem.editandoItem &&
          (i.tipo === modelo || (ehCasca && (i.tipo === "casca" || i.tipo === "casca-bando"))),
      ) ?? null);
  const numeroEditando = itemEditando ? montagem.rascunho.itens.indexOf(itemEditando) + 1 : 0;
  const [valorItemCent, setValorItemCent] = useState(0);

  const entrada = useMemo(
    () => ({
      largura: parseValor(largura),
      altura: parseValor(altura),
      acabamento,
      modelo,
      quantidade,
      rolo,
      retalho: usarRetalho && !ehVisor
        ? {
            largura: parseValor(retalhoLarg) || 0,
            // em branco = comprimento livre, não entra na conta
            ...(parseValor(retalhoComp) > 0 ? { comprimento: parseValor(retalhoComp) } : {}),
          }
        : null,
      ...(modelo === "fixo-lateral"
        ? {
            comBando: comBandoLat,
            lateral: { largura: parseValor(latLarg) || 0, altura: parseValor(latAlt) || 0 },
          }
        : {}),
      ...(ehVisor
        ? {
            visor: {
              lateral: parseValor(visLateral) || 0,
              roloCristal: parseValor(visRolo) || ROLO_CRISTAL_CM,
            },
          }
        : {}),
    }),
    [largura, altura, acabamento, modelo, quantidade, rolo, usarRetalho, retalhoLarg, retalhoComp, comBandoLat, latLarg, latAlt, ehVisor, visLateral, visRolo],
  );
  const r = useMemo(() => calcularCortina(entrada), [entrada]);
  const acrescimo = acrescimoAltura(entrada);
  const ehLateral = modelo === "fixo-lateral";
  const comBando = modelo === "casca-bando" || (ehLateral && comBandoLat);
  const lat = r?.laterais ?? null;
  const vis = r?.visor ?? null;
  const metrosFinal = r ? (r.metrosGeral ?? r.metrosRolo) : 0;
  const nomeAcrescimo = ehCortina ? NOME_ACABAMENTO[acabamento] : comBando ? "Folga da casca (bandô já na medida)" : "Folga da casca";

  const desenho = (larguraCorte?: number) =>
    ehCortina ? (
      <DesenhoCaderno
        largura={entrada.largura}
        altura={entrada.altura}
        larguraCorte={larguraCorte}
        acabamento={acabamento}
      />
    ) : (
      <DesenhoCasca
        largura={entrada.largura}
        altura={entrada.altura}
        larguraCorte={larguraCorte}
        bando={comBando}
        lateral={ehLateral ? { largura: parseValor(latLarg), altura: parseValor(latAlt) } : undefined}
      />
    );

  /** limpa as medidas para calcular o próximo toldo (mantém rolo, acabamento e moldura) */
  function limparMedidas() {
    setLargura("");
    setAltura("");
    setQuantidade(1);
    setLatLarg("");
    setLatAlt("");
    setUsarRetalho(false);
    setRetalhoLarg("");
    setRetalhoComp("");
    setValorItemCent(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function adicionarAoServico() {
    if (!r) return;
    const valor = valorItemCent / 100;
    if (itemEditando) {
      montagem.atualizarItem({ id: itemEditando.id, tipo: modelo, entrada, resultado: r, valor });
      limparMedidas();
      toast({ mensagem: `Toldo ${numeroEditando} atualizado`, acao: { rotulo: "Ver serviço", executar: montagem.abrirPainel } });
      return;
    }
    const n = montagem.adicionar({ tipo: modelo, entrada, resultado: r, valor });
    limparMedidas();
    toast({
      mensagem: n === 1 ? "Toldo adicionado ao serviço" : `Toldo ${n} adicionado ao serviço`,
      acao: { rotulo: "Ver serviço", executar: montagem.abrirPainel },
    });
  }

  function cancelarEdicao() {
    montagem.editarItem(null);
    limparMedidas();
  }

  function carregar(e: EntradaCortina) {
    const c = { entrada: e };
    setLargura(String(c.entrada.largura).replace(".", ","));
    setAltura(String(c.entrada.altura).replace(".", ","));
    setAcabamento(c.entrada.acabamento);
    setQuantidade(c.entrada.quantidade);
    if (c.entrada.rolo) {
      setRolo(c.entrada.rolo);
      setRoloTexto(String(c.entrada.rolo).replace(".", ","));
    }
    const rt = c.entrada.retalho;
    setUsarRetalho(!!rt);
    setRetalhoLarg(rt ? String(rt.largura).replace(".", ",") : "");
    setRetalhoComp(rt?.comprimento ? String(rt.comprimento).replace(".", ",") : "");
    setComBandoLat(!!c.entrada.comBando);
    setLatLarg(c.entrada.lateral ? String(c.entrada.lateral.largura).replace(".", ",") : "");
    setLatAlt(c.entrada.lateral ? String(c.entrada.lateral.altura).replace(".", ",") : "");
    if (c.entrada.visor) {
      setVisLateral(String(c.entrada.visor.lateral).replace(".", ","));
      setVisRolo(String(c.entrada.visor.roloCristal).replace(".", ","));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // modo consulta: carrega o toldo do serviço salvo
  const idVisualizar = visualizar?.item.id;
  useEffect(() => {
    if (!visualizar) return;
    carregar(visualizar.item.entrada);
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idVisualizar]);

  // abre aqui o toldo escolhido para alterar (no painel do serviço)
  const idEditando = itemEditando?.id;
  useEffect(() => {
    if (itemEditando) {
      setModelo(itemEditando.tipo);
      carregar(itemEditando.entrada);
      setValorItemCent(Math.round((itemEditando.valor ?? 0) * 100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEditando]);

  return (
    <>
      {visualizar ? (
        <Cabecalho
          titulo={`Toldo ${visualizar.numero} · ${textos.titulo}`}
          subtitulo={`${visualizar.cliente || "Sem referência"} · toldo ${visualizar.numero} de ${visualizar.total}`}
          onVoltar={visualizar.onVoltar}
        />
      ) : (
        <Cabecalho titulo={textos.titulo} subtitulo={`Rolo de lona de ${formatMetros(rolo / 100)} m`} voltar="/toldos" />
      )}

      {visualizar && (
        <div className="faixa-consulta">
          <span>Só consulta: serviço salvo</span>
          {visualizar.total > 1 && (
            <span className="faixa-consulta-nav">
              <button type="button" onClick={visualizar.onAnterior} disabled={!visualizar.onAnterior} aria-label="Toldo anterior">
                ‹
              </button>
              {visualizar.numero}/{visualizar.total}
              <button type="button" onClick={visualizar.onProximo} disabled={!visualizar.onProximo} aria-label="Próximo toldo">
                ›
              </button>
            </span>
          )}
        </div>
      )}

      <section className="cartao" aria-label="Medidas">
        <fieldset className="campos-grupo" disabled={!!visualizar}>
        <div className="medidas">
          <CampoMedida rotulo="Largura" valor={largura} onChange={setLargura} autoFocus />
          <span className="medidas-x" aria-hidden>×</span>
          <CampoMedida rotulo={textos.altura} valor={altura} onChange={setAltura} />
        </div>

        <label className="rolo">
          <span className="rolo-rotulo">Largura do rolo</span>
          <div className="rolo-campo">
            <input
              inputMode="decimal"
              value={roloTexto}
              onChange={(e) => {
                const t = e.target.value.replace(/[^\d,.]/g, "");
                setRoloTexto(t);
                const v = parseValor(t);
                if (v >= 50 && v <= 500) escolherRolo(v);
              }}
              onFocus={(e) => e.target.select()}
              aria-label="Largura do rolo em centímetros"
            />
            <em>cm</em>
          </div>
        </label>

        <div className="linha-opcoes">
          {ehCortina ? (
          <div className="segmentado" role="radiogroup" aria-label="Acabamento">
            {(["bando", "canhao"] as Acabamento[]).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={acabamento === a}
                className={acabamento === a ? "ativo" : undefined}
                onClick={() => setAcabamento(a)}
              >
                {ehVisor ? (a === "bando" ? "Com bandô" : "Sem bandô") : NOME_ACABAMENTO[a]}
                <small>
                  {ehVisor
                    ? `baixo +${a === "bando" ? VISOR_SOMA_BAIXO.comBando : VISOR_SOMA_BAIXO.semBando} cm`
                    : `+${ACRESCIMO_ALTURA[a]} cm`}
                </small>
              </button>
            ))}
          </div>
          ) : ehLateral ? (
            <div className="segmentado" role="radiogroup" aria-label="Bandô">
              {[false, true].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={comBandoLat === v}
                  className={comBandoLat === v ? "ativo" : undefined}
                  onClick={() => setComBandoLat(v)}
                >
                  {v ? "Com bandô" : "Sem bandô"}
                  <small>lateral +{v ? 30 : 5} cm</small>
                </button>
              ))}
            </div>
          ) : ehCasca ? (
            <div className="segmentado" role="radiogroup" aria-label="Bandô">
              {(["casca", "casca-bando"] as Modelo[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={modelo === m}
                  className={modelo === m ? "ativo" : undefined}
                  onClick={() => setModelo(m)}
                >
                  {m === "casca-bando" ? "Com bandô" : "Sem bandô"}
                  <small>altura +{acrescimo} cm</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="nota-folga">
              Altura <b>+{acrescimo} cm</b>
              <small>{comBando ? "com bandô (já na medida)" : "sem bandô"}</small>
            </p>
          )}

        </div>

        {ehLateral && (
          <div className="bloco-lateral">
            <span className="rolo-rotulo">Laterais (2 peças, medida da ferragem)</span>
            <div className="retalho-campos">
              <CampoPequeno rotulo="Largura (avanço)" valor={latLarg} onChange={setLatLarg} />
              <CampoPequeno rotulo="Altura (na parede)" valor={latAlt} onChange={setLatAlt} />
            </div>
          </div>
        )}

        {ehVisor && (
          <div className="bloco-visor">
            <span className="rolo-rotulo">Laterais e cristal</span>
            <div className="retalho-campos">
              <CampoPequeno rotulo="Cada lateral" valor={visLateral} onChange={setVisLateral} />
              <CampoPequeno rotulo="Altura do cristal" valor={visRolo} onChange={setVisRolo} />
            </div>
            {entrada.altura > 0 && entrada.altura < VISOR_ALTURA_MINIMA && (
              <div className="aviso-visor" role="alert">
                <strong>Confirme se pode ser usado tamanho abaixo de {VISOR_ALTURA_MINIMA}.</strong>
                <span>
                  Normalmente, em cortina baixa, usa meia faixa de cristal ({CRISTAL_MEIA_FAIXA} cm).
                </span>
                {parseValor(visRolo) === CRISTAL_MEIA_FAIXA ? (
                  <button type="button" onClick={() => setVisRolo(String(ROLO_CRISTAL_CM))}>
                    Voltar para cristal de {ROLO_CRISTAL_CM}
                  </button>
                ) : (
                  <button type="button" onClick={() => setVisRolo(String(CRISTAL_MEIA_FAIXA))}>
                    Usar cristal de {CRISTAL_MEIA_FAIXA}
                  </button>
                )}
              </div>
            )}
            <p className="dica-visor">
              As faixas de cima e de baixo saem sozinhas: (altura − cristal) ÷ 2, + {VISOR_SOMA_CIMA} em cima e +{" "}
              {acabamento === "bando" ? VISOR_SOMA_BAIXO.comBando : VISOR_SOMA_BAIXO.semBando} embaixo.
            </p>
          </div>
        )}

        {!ehVisor && (
        <div className={`retalho${usarRetalho ? " aberto" : ""}`}>
          <button
            type="button"
            role="switch"
            aria-checked={usarRetalho}
            className="retalho-chave"
            onClick={() => setUsarRetalho((v) => !v)}
          >
            <span className="chave-trilho" aria-hidden><span /></span>
            Usar retalho de outro serviço
            <small>opcional</small>
          </button>
          {usarRetalho && (
            <>
              <div className="retalho-campos">
                <CampoPequeno rotulo="Largura do retalho" valor={retalhoLarg} onChange={setRetalhoLarg} />
                <CampoPequeno rotulo="Comprimento (opcional)" valor={retalhoComp} onChange={setRetalhoComp} placeholder="livre" />
              </div>
              {r?.usoRetalho && (
                <p className={r.usoRetalho.usado ? "retalho-msg ok" : "retalho-msg"}>
                  {r.usoRetalho.usado
                    ? `O retalho cobre a faixa de ${formatNum(r.usoRetalho.larguraGomo)} cm${parseValor(retalhoComp) > 0 ? "" : ` (precisa ter ${formatM(r.alturaCorte / 100)} de comprimento)`}. Economia de ${formatM(r.alturaCorte / 100)} de lona nova.`
                    : r.usoRetalho.motivo}
                </p>
              )}
            </>
          )}
        </div>
        )}
        </fieldset>
      </section>

      {r ? (
        <>
          <section className="resultado" aria-live="polite">
            <div className="resultado-total">
              <span>{r.usoRetalho?.usado ? "Lona nova do rolo" : "Lona necessária"}</span>
              <strong>{formatMetros(metrosFinal)}<em>m</em></strong>
              {ehLateral && !lat && (
                <p className="resultado-partes">Só a casca. Preencha as laterais para somar a lona delas.</p>
              )}
              {lat && (
                <p className="resultado-partes">
                  Casca {formatM(r.metrosRolo)} + 2 laterais {formatM(lat.metrosTotal)}
                </p>
              )}
              {vis && (
                <p className="resultado-partes">
                  de lona + {formatM(r.metrosCristalTotal ?? vis.metrosCristal)} de cristal (altura{" "}
                  {formatNum(vis.cristal.altura)})
                </p>
              )}
              {vis ? (
                <p>
                  2 laterais, faixa de cima, faixa de baixo e o cristal
                  {quantidade > 1 && `, em cada toldo, ${quantidade} toldos`}
                </p>
              ) : (
              <p>
                {r.gomos} {r.gomos === 1 ? "faixa" : "faixas"} de {formatMetros(r.alturaCorte / 100)} m
                {quantidade > 1 && ` em cada toldo, ${quantidade} toldos`}
                {r.usoRetalho?.usado && `, 1 deles do retalho`}
              </p>
              )}
              {vis?.aviso && <p className="resultado-aviso">{vis.aviso}</p>}
              {vis && !vis.aviso && entrada.altura < VISOR_ALTURA_MINIMA && (
                <p className="resultado-aviso">Altura abaixo de {VISOR_ALTURA_MINIMA}: confirme se pode ser usado.</p>
              )}
            </div>
            {lat && <p className="resultado-sub resultado-sub-casca">Casca</p>}
            <dl className="resultado-medidas">
              <div>
                <dt>Largura de corte</dt>
                <dd>{formatNum(r.larguraCorte)} cm</dd>
              </div>
              <div>
                <dt>Altura de corte</dt>
                <dd>{formatNum(r.alturaCorte)} cm</dd>
              </div>
              {vis ? (
                <div>
                  <dt>Cristal</dt>
                  <dd>
                    {formatNum(vis.cristal.largura)}×{formatNum(vis.cristal.altura)}
                  </dd>
                </div>
              ) : (
              <div>
                <dt>Emendas</dt>
                <dd>{r.emendas}</dd>
              </div>
              )}
            </dl>
            {lat && (
              <>
                <p className="resultado-sub">
                  Cada lateral ({comBandoLat ? "com bandô, altura +30" : "sem bandô, altura +5"})
                </p>
                <dl className="resultado-medidas resultado-lateral">
                  <div>
                    <dt>Largura de corte</dt>
                    <dd>{formatNum(lat.larguraCorte)} cm</dd>
                  </div>
                  <div>
                    <dt>Altura de corte</dt>
                    <dd>{formatNum(lat.alturaCorte)} cm</dd>
                  </div>
                  <div>
                    <dt>Emendas</dt>
                    <dd>{lat.emendas}</dd>
                  </div>
                </dl>
              </>
            )}
          </section>

          {vis ? (
            <>
              <section className="cartao cartao-caderno">
                <DesenhoVisor
                  larguraCorte={r.larguraCorte}
                  alturaCorte={r.alturaCorte}
                  v={vis}
                  acabamento={acabamento === "bando" ? "com bandô" : "sem bandô"}
                />
              </section>
              <section className="cartao">
                <h2 className="titulo-secao">Peças para cortar</h2>
                <ul className="lista-pecas">
                  <li>
                    <strong>2 laterais (lona)</strong>
                    <b>
                      {formatNum(vis.lateral.largura)} × {formatNum(vis.lateral.altura)}
                    </b>
                    <small>De cima a baixo, soldadas na parte do meio · {formatM(vis.metrosLaterais)} de rolo</small>
                  </li>
                  <li>
                    <strong>Faixa de cima (lona)</strong>
                    <b>
                      {formatNum(vis.faixaCima.largura)} × {formatNum(vis.faixaCima.altura)}
                    </b>
                    <small>
                      Metade da sobra {formatNum(vis.metade)} + {vis.somaCima}
                    </small>
                  </li>
                  <li>
                    <strong>Faixa de baixo (lona)</strong>
                    <b>
                      {formatNum(vis.faixaBaixo.largura)} × {formatNum(vis.faixaBaixo.altura)}
                    </b>
                    <small>
                      Metade da sobra {formatNum(vis.metade)} + {vis.somaBaixo} ({acabamento === "bando" ? "com" : "sem"} bandô) ·
                      as duas faixas: {formatM(vis.metrosFaixas)} de rolo
                    </small>
                  </li>
                  <li className="peca-cristal">
                    <strong>Cristal</strong>
                    <b>
                      {formatNum(vis.cristal.largura)} × {formatNum(vis.cristal.altura)}
                    </b>
                    <small>
                      {formatM(vis.metrosCristal)} do rolo de cristal
                    </small>
                  </li>
                </ul>
              </section>
            </>
          ) : (
          <>
          <section className="cartao cartao-caderno">{desenho(r.larguraCorte)}</section>


          <section className="cartao">
            <h2 className="titulo-secao">Plano de corte</h2>
            <DesenhoCortina r={r} faixa={ehCortina ? { nome: NOME_ACABAMENTO[acabamento], cm: acrescimo } : null} />
            <p className="legenda">
              {r.gomos} {r.gomos === 1 ? "faixa" : "faixas"} ({r.larguraGomos.map((g) => formatNum(g)).join(" + ")} cm) e {r.emendas} {r.emendas === 1 ? "emenda" : "emendas"}, nas linhas amarelas.
              {r.usoRetalho?.usado
                ? ` A faixa amarela (${formatNum(r.usoRetalho.larguraGomo)} cm) sai do retalho de ${formatNum(r.usoRetalho.larguraGomo + r.usoRetalho.sobraLargura)} cm${r.usoRetalho.sobraLargura > 0 ? ` e sobram ${formatNum(r.usoRetalho.sobraLargura)} cm dele` : ""}.`
                : r.retalho > 0 && `${r.gomos > 2 ? " A faixa cortada fica no meio;" : ""} sobram ${formatNum(r.retalho)} cm dele no rolo.`}
            </p>
          </section>
          </>
          )}

          {lat && (
            <section className="cartao">
              <h2 className="titulo-secao">Plano de corte da lateral</h2>
              <DesenhoCortina
                r={{ ...r, ...lat, usoRetalho: null, larguraGomos: lat.larguraGomos }}
                faixa={null}
              />
              <p className="legenda">
                Cada lateral: {lat.gomos} {lat.gomos === 1 ? "faixa" : "faixas"} ({lat.larguraGomos.map((g) => formatNum(g)).join(" + ")} cm) de {formatMetros(lat.alturaCorte / 100)} m. São 2 laterais; depois de emendar, recorta no formato da ferragem.
              </p>
            </section>
          )}

          <section className="cartao">
            <h2 className="titulo-secao">Como chegou nesse valor</h2>
            <ol className="conta">
              {vis ? (
                <>
                  <li>
                    <span>Largura</span>
                    <span>
                      {formatNum(entrada.largura)} + {VISOR_SOMA_LARGURA}
                    </span>
                    <b>{formatNum(r.larguraCorte)} cm</b>
                    <small>10 + 2 + 3, fixos</small>
                  </li>
                  <li>
                    <span>Sobra</span>
                    <span>
                      {formatNum(entrada.altura)} − {formatNum(vis.cristal.altura)}
                    </span>
                    <b>{formatNum(vis.sobra)} cm</b>
                    <small>Altura do toldo menos o cristal</small>
                  </li>
                  <li>
                    <span>Metade</span>
                    <span>{formatNum(vis.sobra)} ÷ 2</span>
                    <b>{formatNum(vis.metade)} cm</b>
                    <small>Vai para a faixa de cima e para a de baixo</small>
                  </li>
                  <li>
                    <span>Cima</span>
                    <span>
                      {formatNum(vis.metade)} + {vis.somaCima}
                    </span>
                    <b>{formatNum(vis.faixaCima.altura)} cm</b>
                    <small>Faixa de cima</small>
                  </li>
                  <li>
                    <span>Baixo</span>
                    <span>
                      {formatNum(vis.metade)} + {vis.somaBaixo}
                    </span>
                    <b>{formatNum(vis.faixaBaixo.altura)} cm</b>
                    <small>Faixa de baixo, {acabamento === "bando" ? "com" : "sem"} bandô</small>
                  </li>
                  <li>
                    <span>Altura</span>
                    <span>
                      {formatNum(entrada.altura)} + {acrescimo}
                    </span>
                    <b>{formatNum(r.alturaCorte)} cm</b>
                    <small>
                      Altura de corte e das laterais ({acabamento === "bando" ? "com" : "sem"} bandô). Faixas + cristal ={" "}
                      {formatNum(vis.alturaPecas)}: os {formatNum(vis.alturaPecas - r.alturaCorte)} cm a mais são das
                      emendas
                    </small>
                  </li>
                  <li>
                    <span>Meio</span>
                    <span>
                      {formatNum(r.larguraCorte)} − 2 × {formatNum(vis.lateral.largura)}
                    </span>
                    <b>{formatNum(vis.larguraMeio)} cm</b>
                    <small>Largura das faixas e do cristal</small>
                  </li>
                  <li>
                    <span>Lona</span>
                    <span>
                      {formatMetros(vis.metrosLaterais)} + {formatMetros(vis.metrosFaixas)}
                    </span>
                    <b>{formatM(vis.metrosLona)}</b>
                    <small>Laterais + faixas, por toldo</small>
                  </li>
                  {quantidade > 1 && (
                    <li>
                      <span>Total</span>
                      <span>
                        {formatMetros(vis.metrosLona)} × {quantidade}
                      </span>
                      <b>{formatM(r.metrosTotal)}</b>
                      <small>
                        + cristal {formatMetros(vis.metrosCristal)} × {quantidade} ={" "}
                        {formatM(r.metrosCristalTotal ?? 0)}
                      </small>
                    </li>
                  )}
                </>
              ) : (
              <>
              <li>
                <span>Largura</span>
                <span>
                  {formatNum(entrada.largura)} + {SOBRA_LATERAL_CM}
                  {r.emendas > 0 && ` + ${r.emendas * CM_POR_EMENDA}`}
                </span>
                <b>{formatNum(r.larguraCorte)} cm</b>
                <small>
                  5 cm de cada lado
                  {r.emendas > 0 && `, 1 cm por emenda (${r.emendas})`}
                </small>
              </li>
              <li>
                <span>Altura</span>
                <span>
                  {formatNum(entrada.altura)} + {acrescimo}
                </span>
                <b>{formatNum(r.alturaCorte)} cm</b>
                <small>{nomeAcrescimo}</small>
              </li>
              <li>
                <span>Lona</span>
                <span>
                  {r.gomos} × {formatMetros(r.alturaCorte / 100)} m
                </span>
                <b>{formatM(r.metrosPorToldo)}</b>
                <small>Por toldo</small>
              </li>
              {quantidade > 1 && (
                <li>
                  <span>Total</span>
                  <span>
                    {formatMetros(r.metrosPorToldo)} × {quantidade}
                  </span>
                  <b>{formatM(r.metrosTotal)}</b>
                  <small>{quantidade} toldos</small>
                </li>
              )}
              {lat && (
                <>
                  <li>
                    <span>Lateral</span>
                    <span>
                      ({formatNum(entrada.lateral!.largura)} + 5{lat.emendas > 0 && ` + ${lat.emendas}`}) × ({formatNum(entrada.lateral!.altura)} + {comBandoLat ? 30 : 5})
                    </span>
                    <b>{formatNum(lat.larguraCorte)} × {formatNum(lat.alturaCorte)}</b>
                    <small>
                      {lat.gomos} {lat.gomos === 1 ? "faixa" : "faixas"} de {formatMetros(lat.alturaCorte / 100)} m = {formatM(lat.metrosPorLateral)} cada
                    </small>
                  </li>
                  <li>
                    <span>Laterais</span>
                    <span>
                      {formatMetros(lat.metrosPorLateral)} × 2{quantidade > 1 && ` × ${quantidade}`}
                    </span>
                    <b>{formatM(lat.metrosTotal)}</b>
                    <small>{comBandoLat ? "Com bandô" : "Sem bandô"}</small>
                  </li>
                </>
              )}
              {r.usoRetalho?.usado && (
                <li>
                  <span>Retalho</span>
                  <span>
                    {formatMetros(r.metrosTotal)} − {formatMetros(r.alturaCorte / 100)}
                  </span>
                  <b>{formatM(r.metrosRolo)}</b>
                  <small>1 faixa sai do retalho, não do rolo</small>
                </li>
              )}
              </>
              )}
            </ol>
          </section>

          <section className={`cartao adicionar${itemEditando ? " editando" : ""}`}>
            {visualizar ? (
              <>
                <h2 className="titulo-secao">Valor do toldo {visualizar.numero}</h2>
                <p className="valor-consulta">
                  {visualizar.item.valor ? formatBRL(visualizar.item.valor) : "Sem valor separado"}
                </p>
                <button type="button" className="botao-secundario" onClick={visualizar.onVoltar}>
                  Voltar ao serviço
                </button>
              </>
            ) : itemEditando ? (
              <>
                <h2 className="titulo-secao">Alterando o toldo {numeroEditando}</h2>
                <p className="dica-salvar">As novas medidas substituem esse toldo no serviço.</p>
                <label className="campo campo-valor">
                  <span>Valor deste toldo</span>
                  <div>
                    <em>R$</em>
                    <input
                      inputMode="numeric"
                      value={centavosParaTexto(valorItemCent)}
                      onChange={(e) => setValorItemCent(Number(e.target.value.replace(/\D/g, "").slice(0, 11) || 0))}
                      onFocus={(e) => {
                        const el = e.target;
                        requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
                      }}
                      aria-label="Valor deste toldo em reais"
                    />
                  </div>
                </label>
                <button type="button" className="botao-principal" onClick={adicionarAoServico}>
                  <LuCheck aria-hidden /> Salvar alterações do toldo {numeroEditando}
                </button>
                <button type="button" className="botao-secundario" onClick={cancelarEdicao}>
                  <LuX aria-hidden /> Cancelar alteração
                </button>
              </>
            ) : (
              <>
                <h2 className="titulo-secao">
                  {montagem.rascunho.itens.length > 0
                    ? `Toldo ${montagem.rascunho.itens.length + 1} do serviço`
                    : "Adicionar ao serviço"}
                </h2>
                <p className="dica-salvar">
                  {montagem.rascunho.itens.length > 0
                    ? "Junta este toldo aos que já estão no serviço. O valor do serviço é a soma dos toldos."
                    : "Pode juntar outros toldos (de qualquer tipo e medida) no mesmo serviço. O valor do serviço é a soma dos toldos."}
                </p>
                <label className="campo campo-valor">
                  <span>Valor deste toldo</span>
                  <div>
                    <em>R$</em>
                    <input
                      inputMode="numeric"
                      value={centavosParaTexto(valorItemCent)}
                      onChange={(e) => setValorItemCent(Number(e.target.value.replace(/\D/g, "").slice(0, 11) || 0))}
                      onFocus={(e) => {
                        const el = e.target;
                        requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
                      }}
                      aria-label="Valor deste toldo em reais"
                    />
                  </div>
                </label>
                <button type="button" className="botao-principal" onClick={adicionarAoServico}>
                  <LuPlus aria-hidden /> Adicionar ao serviço
                </button>
              </>
            )}
          </section>
        </>
      ) : (
        <>
        {(entrada.largura > 0 || entrada.altura > 0) && (
          <section className="cartao cartao-caderno">
            {desenho()}
          </section>
        )}
        <section className="vazio">
          <LuRuler aria-hidden />
          <p>{textos.vazio}</p>
          <small>O cálculo aparece aqui na hora.</small>
        </section>
        </>
      )}

      {!visualizar && (
      <Link href="/servicos" className="link-servicos">
        <LuClipboardList aria-hidden />
        <span>
          <strong>Serviços salvos</strong>
          <small>Ver, finalizar ou excluir serviços</small>
        </span>
        <LuChevronRight aria-hidden />
      </Link>
      )}
    </>
  );
}

function CampoPequeno({
  rotulo,
  valor,
  onChange,
  placeholder = "0",
}: {
  rotulo: string;
  valor: string;
  onChange(v: string): void;
  placeholder?: string;
}) {
  return (
    <label className="campo-pequeno">
      <span>{rotulo}</span>
      <div>
        <input
          inputMode="decimal"
          placeholder={placeholder}
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ""))}
          onFocus={(e) => e.target.select()}
        />
        <em>cm</em>
      </div>
    </label>
  );
}

function CampoMedida({
  rotulo,
  valor,
  onChange,
  autoFocus,
}: {
  rotulo: string;
  valor: string;
  onChange(v: string): void;
  autoFocus?: boolean;
}) {
  return (
    <label className="medida">
      <span>{rotulo}</span>
      <div>
        <input
          inputMode="decimal"
          enterKeyHint="next"
          placeholder="0"
          autoFocus={autoFocus}
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ""))}
          onFocus={(e) => e.target.select()}
        />
        <em>cm</em>
      </div>
    </label>
  );
}
