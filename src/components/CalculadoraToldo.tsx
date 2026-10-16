"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuChevronRight, LuClipboardList, LuMinus, LuPlus, LuRuler } from "react-icons/lu";
import { Cabecalho } from "@/components/Cabecalho";
import { DesenhoCaderno } from "@/components/DesenhoCaderno";
import { DesenhoCasca } from "@/components/DesenhoCasca";
import { DesenhoCortina } from "@/components/DesenhoCortina";
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
import { statusDe, useCalculos, type CalculoSalvo } from "@/lib/data/calculos";
import { CHAVE_ABRIR, salvarServico } from "@/lib/data/servicos";
import { mensagemErroBanco } from "@/lib/firebase";
import { centavosParaTexto, formatBRL, formatM, formatMetros, formatNum, parseValor } from "@/lib/format";

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
    titulo: "Casca com bandô",
    altura: "Altura (curva + bandô)",
    vazio: "Digite a largura e a medida por cima da curva já com o bandô, em centímetros.",
  },
};

/** Tela de cálculo por gomos, usada pelo Toldo Cortina e pelo Toldo Fixo (Casca) */
export function CalculadoraToldo({ modelo }: { modelo: Modelo }) {
  const toast = useToast();
  const todosSalvos = useCalculos();
  const salvos = todosSalvos.filter((c) => (c.tipo ?? "cortina") === modelo);
  const textos = TEXTOS[modelo];
  const ehCortina = modelo === "cortina";

  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [acabamento, setAcabamento] = useState<Acabamento>("bando");
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
  const [usarRetalho, setUsarRetalho] = useState(false);
  const [retalhoLarg, setRetalhoLarg] = useState("");
  const [retalhoComp, setRetalhoComp] = useState("");
  const [cliente, setCliente] = useState("");
  const [valorCent, setValorCent] = useState(0);
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  const entrada = useMemo(
    () => ({
      largura: parseValor(largura),
      altura: parseValor(altura),
      acabamento,
      modelo,
      quantidade,
      rolo,
      retalho: usarRetalho
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
    }),
    [largura, altura, acabamento, modelo, quantidade, rolo, usarRetalho, retalhoLarg, retalhoComp, comBandoLat, latLarg, latAlt],
  );
  const r = useMemo(() => calcularCortina(entrada), [entrada]);
  const acrescimo = acrescimoAltura(entrada);
  const ehLateral = modelo === "fixo-lateral";
  const comBando = modelo === "casca-bando" || (ehLateral && comBandoLat);
  const lat = r?.laterais ?? null;
  const metrosFinal = r ? (r.metrosGeral ?? r.metrosRolo) : 0;
  const nomeAcrescimo = ehCortina ? NOME_ACABAMENTO[acabamento] : comBando ? "Folga (bandô já na medida)" : "Folga da casca";

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

  async function salvar() {
    if (!r || valorCent <= 0) return;
    setSalvando(true);
    try {
      const valor = valorCent / 100;
      await salvarServico({ tipo: modelo, cliente, entrada, resultado: r, valor });
      setCliente("");
      setValorCent(0);
      toast({
        mensagem: `Serviço salvo. ${formatBRL(valor)} a receber`,
        acao: { rotulo: "Ver", executar: () => router.push("/servicos") },
      });
    } catch (e) {
      toast({ mensagem: `Não foi possível salvar. ${mensagemErroBanco(e)}` });
    } finally {
      setSalvando(false);
    }
  }

  function carregar(c: CalculoSalvo) {
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
    setCliente(c.cliente);
    setValorCent(c.valor ? Math.round(c.valor * 100) : 0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // abre um serviço escolhido na página Serviços
  useEffect(() => {
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(CHAVE_ABRIR);
    } catch {
      /* nada */
    }
    if (!id) return;
    const c = todosSalvos.find((x) => x.id === id);
    if (c) {
      try {
        sessionStorage.removeItem(CHAVE_ABRIR);
      } catch {
        /* nada */
      }
      carregar(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosSalvos]);

  const abertos = salvos.filter((c) => statusDe(c) === "aberto").length;

  return (
    <>
      <Cabecalho titulo={textos.titulo} subtitulo={`Rolo de lona de ${formatMetros(rolo / 100)} m`} voltar="/toldos" />

      <section className="cartao" aria-label="Medidas">
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
                {NOME_ACABAMENTO[a]}
                <small>+{ACRESCIMO_ALTURA[a]} cm</small>
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
          ) : (
            <p className="nota-folga">
              Altura <b>+{acrescimo} cm</b>
              <small>{comBando ? "bandô já incluso na medida" : "sem bandô"}</small>
            </p>
          )}

          <div className="contador" aria-label="Quantidade de toldos">
            <button
              type="button"
              aria-label="Menos um"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              disabled={quantidade <= 1}
            >
              <LuMinus />
            </button>
            <output aria-live="polite">
              {quantidade}
              <small>{quantidade === 1 ? "toldo" : "toldos"}</small>
            </output>
            <button type="button" aria-label="Mais um" onClick={() => setQuantidade((q) => q + 1)}>
              <LuPlus />
            </button>
          </div>
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
                    ? `O retalho cobre o gomo de ${formatNum(r.usoRetalho.larguraGomo)} cm${parseValor(retalhoComp) > 0 ? "" : ` (precisa ter ${formatM(r.alturaCorte / 100)} de comprimento)`}. Economia de ${formatM(r.alturaCorte / 100)} de lona nova.`
                    : r.usoRetalho.motivo}
                </p>
              )}
            </>
          )}
        </div>
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
              <p>
                {r.gomos} {r.gomos === 1 ? "gomo" : "gomos"} de {formatMetros(r.alturaCorte / 100)} m
                {quantidade > 1 && ` em cada toldo, ${quantidade} toldos`}
                {r.usoRetalho?.usado && `, 1 deles do retalho`}
              </p>
            </div>
            <dl className="resultado-medidas">
              <div>
                <dt>Largura de corte</dt>
                <dd>{formatNum(r.larguraCorte)} cm</dd>
              </div>
              <div>
                <dt>Altura de corte</dt>
                <dd>{formatNum(r.alturaCorte)} cm</dd>
              </div>
              <div>
                <dt>Emendas</dt>
                <dd>{r.emendas}</dd>
              </div>
            </dl>
          </section>

          <section className="cartao cartao-caderno">{desenho(r.larguraCorte)}</section>


          <section className="cartao">
            <h2 className="titulo-secao">Plano de corte</h2>
            <DesenhoCortina r={r} faixa={ehCortina ? { nome: NOME_ACABAMENTO[acabamento], cm: acrescimo } : null} />
            <p className="legenda">
              {r.gomos} {r.gomos === 1 ? "gomo" : "gomos"} ({r.larguraGomos.map((g) => formatNum(g)).join(" + ")} cm) e {r.emendas} {r.emendas === 1 ? "emenda" : "emendas"}, nas linhas amarelas.
              {r.usoRetalho?.usado
                ? ` O gomo amarelo (${formatNum(r.usoRetalho.larguraGomo)} cm) sai do retalho de ${formatNum(r.usoRetalho.larguraGomo + r.usoRetalho.sobraLargura)} cm${r.usoRetalho.sobraLargura > 0 ? ` e sobram ${formatNum(r.usoRetalho.sobraLargura)} cm dele` : ""}.`
                : r.retalho > 0 && `${r.gomos > 2 ? " O gomo cortado fica no meio;" : ""} sobram ${formatNum(r.retalho)} cm dele no rolo.`}
            </p>
          </section>

          {lat && (
            <section className="cartao">
              <h2 className="titulo-secao">Plano de corte da lateral</h2>
              <DesenhoCortina
                r={{ ...r, ...lat, usoRetalho: null, larguraGomos: lat.larguraGomos }}
                faixa={null}
              />
              <p className="legenda">
                Cada lateral: {lat.gomos} {lat.gomos === 1 ? "gomo" : "gomos"} ({lat.larguraGomos.map((g) => formatNum(g)).join(" + ")} cm) de {formatMetros(lat.alturaCorte / 100)} m. São 2 laterais; depois de emendar, recorta no formato da ferragem.
              </p>
            </section>
          )}

          <section className="cartao">
            <h2 className="titulo-secao">Como chegou nesse valor</h2>
            <ol className="conta">
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
                      ({formatNum(entrada.lateral!.largura)} + 5) × ({formatNum(entrada.lateral!.altura)} + {comBandoLat ? 30 : 5})
                    </span>
                    <b>{formatNum(lat.larguraCorte)} × {formatNum(lat.alturaCorte)}</b>
                    <small>
                      {lat.gomos} {lat.gomos === 1 ? "gomo" : "gomos"} de {formatMetros(lat.alturaCorte / 100)} m = {formatM(lat.metrosPorLateral)} cada
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
                  <small>1 gomo sai do retalho, não do rolo</small>
                </li>
              )}
            </ol>
          </section>

          <section className="cartao salvar">
            <h2 className="titulo-secao">Salvar como serviço</h2>
            <label className="campo">
              <span>Cliente ou referência</span>
              <input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ex.: Padaria Central"
                maxLength={60}
              />
            </label>
            <label className="campo campo-valor">
              <span>Valor do serviço</span>
              <div>
                <em>R$</em>
                <input
                  inputMode="numeric"
                  value={centavosParaTexto(valorCent)}
                  onChange={(e) => setValorCent(Number(e.target.value.replace(/\D/g, "").slice(0, 11) || 0))}
                  onFocus={(e) => {
                    const el = e.target;
                    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
                  }}
                  aria-label="Valor do serviço em reais"
                />
              </div>
            </label>
            <p className="dica-salvar">Vai para Serviços e entra no Financeiro como <b>a receber</b>.</p>
            <button type="button" className="botao-principal" onClick={salvar} disabled={salvando || valorCent <= 0}>
              {salvando ? "Salvando…" : "Salvar serviço"}
            </button>
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

      <Link href="/servicos" className="link-servicos">
        <LuClipboardList aria-hidden />
        <span>
          <strong>Serviços salvos</strong>
          <small>
            {salvos.length === 0
              ? "Nenhum deste tipo ainda"
              : `${salvos.length} deste tipo, ${abertos} em aberto`}
          </small>
        </span>
        <LuChevronRight aria-hidden />
      </Link>
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
