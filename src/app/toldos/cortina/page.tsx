"use client";

import { useEffect, useMemo, useState } from "react";
import { LuMinus, LuPlus, LuRuler, LuTrash2 } from "react-icons/lu";
import { Cabecalho } from "@/components/Cabecalho";
import { DesenhoCaderno } from "@/components/DesenhoCaderno";
import { DesenhoCortina } from "@/components/DesenhoCortina";
import { useToast } from "@/components/Toast";
import {
  ACRESCIMO_ALTURA,
  CM_POR_EMENDA,
  NOME_ACABAMENTO,
  ROLO_LONA_CM,
  SOBRA_LATERAL_CM,
  calcularCortina,
  type Acabamento,
} from "@/lib/calc/cortina";
import { calculosRepo, useCalculos, type CalculoSalvo } from "@/lib/data/calculos";
import { formatDataCurta, formatM, formatMetros, formatNum, hojeISO, parseValor } from "@/lib/format";

function lerRoloSalvo() {
  try {
    const v = Number(localStorage.getItem("toldos:rolo"));
    return v >= 50 && v <= 500 ? v : ROLO_LONA_CM;
  } catch {
    return ROLO_LONA_CM;
  }
}

export default function CortinaPage() {
  const toast = useToast();
  const salvos = useCalculos();

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
  const [usarRetalho, setUsarRetalho] = useState(false);
  const [retalhoLarg, setRetalhoLarg] = useState("");
  const [retalhoComp, setRetalhoComp] = useState("");
  const [cliente, setCliente] = useState("");
  const [salvando, setSalvando] = useState(false);

  const entrada = useMemo(
    () => ({
      largura: parseValor(largura),
      altura: parseValor(altura),
      acabamento,
      quantidade,
      rolo,
      retalho: usarRetalho
        ? {
            largura: parseValor(retalhoLarg) || 0,
            // em branco = comprimento livre, não entra na conta
            ...(parseValor(retalhoComp) > 0 ? { comprimento: parseValor(retalhoComp) } : {}),
          }
        : null,
    }),
    [largura, altura, acabamento, quantidade, rolo, usarRetalho, retalhoLarg, retalhoComp],
  );
  const r = useMemo(() => calcularCortina(entrada), [entrada]);

  async function salvar() {
    if (!r) return;
    setSalvando(true);
    try {
      await calculosRepo.criar({
        tipo: "cortina",
        cliente: cliente.trim(),
        entrada,
        resultado: r,
        criadoEm: Date.now(),
      });
      setCliente("");
      toast({ mensagem: "Cálculo salvo" });
    } catch {
      toast({ mensagem: "Não foi possível salvar. Confira a conexão." });
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
    setCliente(c.cliente);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluir(c: CalculoSalvo) {
    await calculosRepo.excluir(c.id);
    toast({
      mensagem: "Cálculo excluído",
      acao: { rotulo: "Desfazer", executar: () => calculosRepo.restaurar(c) },
    });
  }

  return (
    <>
      <Cabecalho titulo="Toldo Cortina" subtitulo={`Rolo de lona de ${formatMetros(rolo / 100)} m`} voltar="/toldos" />

      <section className="cartao" aria-label="Medidas do vão">
        <div className="medidas">
          <CampoMedida rotulo="Largura" valor={largura} onChange={setLargura} autoFocus />
          <span className="medidas-x" aria-hidden>×</span>
          <CampoMedida rotulo="Altura" valor={altura} onChange={setAltura} />
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
              <strong>{formatMetros(r.metrosRolo)}<em>m</em></strong>
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

          {(entrada.largura > 0 || entrada.altura > 0) && (
            <section className="cartao cartao-caderno">
              <DesenhoCaderno
                largura={entrada.largura}
                altura={entrada.altura}
                larguraCorte={r?.larguraCorte}
                acabamento={acabamento}
              />
            </section>
          )}


          <section className="cartao">
            <h2 className="titulo-secao">Plano de corte</h2>
            <DesenhoCortina r={r} acabamento={acabamento} />
            <p className="legenda">
              {r.gomos} {r.gomos === 1 ? "gomo" : "gomos"} ({r.larguraGomos.map((g) => formatNum(g)).join(" + ")} cm) e {r.emendas} {r.emendas === 1 ? "emenda" : "emendas"}, nas linhas amarelas.
              {r.usoRetalho?.usado
                ? ` O gomo amarelo (${formatNum(r.usoRetalho.larguraGomo)} cm) sai do retalho de ${formatNum(r.usoRetalho.larguraGomo + r.usoRetalho.sobraLargura)} cm${r.usoRetalho.sobraLargura > 0 ? ` e sobram ${formatNum(r.usoRetalho.sobraLargura)} cm dele` : ""}.`
                : r.retalho > 0 && `${r.gomos > 2 ? " O gomo cortado fica no meio;" : ""} sobram ${formatNum(r.retalho)} cm dele no rolo.`}
            </p>
          </section>

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
                  {formatNum(entrada.altura)} + {ACRESCIMO_ALTURA[acabamento]}
                </span>
                <b>{formatNum(r.alturaCorte)} cm</b>
                <small>{NOME_ACABAMENTO[acabamento]}</small>
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
            <label className="campo">
              <span>Cliente ou referência</span>
              <input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Opcional"
                maxLength={60}
              />
            </label>
            <button type="button" className="botao-principal" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar cálculo"}
            </button>
          </section>
        </>
      ) : (
        <>
        {(entrada.largura > 0 || entrada.altura > 0) && (
          <section className="cartao cartao-caderno">
            <DesenhoCaderno largura={entrada.largura} altura={entrada.altura} acabamento={acabamento} />
          </section>
        )}
        <section className="vazio">
          <LuRuler aria-hidden />
          <p>Digite a largura e a altura do vão, em centímetros.</p>
          <small>O cálculo aparece aqui na hora.</small>
        </section>
        </>
      )}

      {salvos.length > 0 && (
        <section className="salvos">
          <h2 className="titulo-secao">Cálculos salvos</h2>
          <ul>
            {salvos.map((c) => (
              <li key={c.id}>
                <button type="button" className="salvo" onClick={() => carregar(c)}>
                  <strong>{c.cliente || "Sem referência"}</strong>
                  <span>
                    {formatNum(c.entrada.largura)} × {formatNum(c.entrada.altura)},{" "}
                    {NOME_ACABAMENTO[c.entrada.acabamento].toLowerCase()}
                    {c.entrada.quantidade > 1 && `, ${c.entrada.quantidade} toldos`}
                    {c.entrada.rolo && `, rolo ${formatNum(c.entrada.rolo)}`}
                  </span>
                  <em>{formatM(c.resultado.metrosRolo ?? c.resultado.metrosTotal)}</em>
                  <small>{formatDataCurta(hojeISO(new Date(c.criadoEm)))}</small>
                </button>
                <button
                  type="button"
                  className="icone-btn perigo"
                  aria-label={`Excluir cálculo ${c.cliente || ""}`}
                  onClick={() => excluir(c)}
                >
                  <LuTrash2 />
                </button>
              </li>
            ))}
          </ul>
        </section>
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
