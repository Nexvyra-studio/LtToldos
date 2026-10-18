"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LuChevronUp, LuClipboardList, LuPencil, LuPlus, LuTrash2, LuX } from "react-icons/lu";
import { useConfirmar } from "@/components/Confirmar";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { cristalItem, metrosItem, somaValores } from "@/lib/data/calculos";
import { ROTA_TIPO, atualizarServico, nomeItem, salvarServico, totalToldos } from "@/lib/data/servicos";
import { mensagemErroBanco } from "@/lib/firebase";
import { centavosParaTexto, formatBRL, formatM, formatNum } from "@/lib/format";
import { useMontagem } from "@/lib/montagem";

/** Barra fixa com o serviço em montagem + painel com os toldos, cliente e valor */
export function ServicoMontagem() {
  const m = useMontagem();
  const caminho = usePathname() || "";
  const { rascunho } = m;
  // aparece nas telas de toldos e de serviços (no financeiro fica fora para não cobrir o botão +)
  const naTela = caminho.startsWith("/toldos") || caminho.startsWith("/servicos");
  if (!m.ativo) return null;

  const lona = rascunho.itens.reduce((s, i) => s + metrosItem(i), 0);
  const n = totalToldos(rascunho.itens);

  return (
    <>
      {naTela && (
        <button type="button" className="barra-servico" onClick={m.abrirPainel}>
          <span className="barra-servico-icone" aria-hidden>
            <LuClipboardList />
            {rascunho.itens.length > 0 && <i>{rascunho.itens.length}</i>}
          </span>
          <span className="barra-servico-texto">
            <strong>
              {rascunho.servicoId ? `Editando: ${rascunho.cliente || "serviço"}` : "Serviço em montagem"}
            </strong>
            <small>
              {n} {n === 1 ? "toldo" : "toldos"} · {formatM(lona)} de lona
              {somaValores(rascunho.itens) > 0 && ` · ${formatBRL(somaValores(rascunho.itens))}`}
            </small>
          </span>
          <LuChevronUp aria-hidden className="barra-servico-seta" />
        </button>
      )}
      <Sheet
        aberto={m.painelAberto}
        titulo={rascunho.servicoId ? "Editar serviço" : "Serviço em montagem"}
        onFechar={m.fecharPainel}
      >
        {m.painelAberto && <Painel />}
      </Sheet>
    </>
  );
}

function Painel() {
  const m = useMontagem();
  const { rascunho } = m;
  const router = useRouter();
  const toast = useToast();
  const confirmar = useConfirmar();
  const [salvando, setSalvando] = useState(false);
  const [tentou, setTentou] = useState(false);

  const lona = rascunho.itens.reduce((s, i) => s + metrosItem(i), 0);
  const cristal = rascunho.itens.reduce((s, i) => s + cristalItem(i), 0);
  const n = totalToldos(rascunho.itens);
  const total = somaValores(rascunho.itens);
  const semValor = rascunho.itens.filter((i) => !(i.valor && i.valor > 0)).length;
  const editando = !!rascunho.servicoId;

  function editar(id: string, tipo: keyof typeof ROTA_TIPO) {
    m.editarItem(id);
    m.fecharPainel();
    router.push(ROTA_TIPO[tipo]);
  }

  async function remover(id: string, nome: string) {
    const ok = await confirmar({
      titulo: "Tirar este toldo?",
      mensagem: (
        <>
          <b>{nome}</b> sai do serviço.
        </>
      ),
      confirmar: "Tirar",
      tom: "perigo",
    });
    if (ok) m.removerItem(id);
  }

  async function descartar() {
    const ok = await confirmar(
      editando
        ? {
            titulo: "Cancelar a edição?",
            mensagem: "As mudanças nos toldos não serão salvas. O serviço continua como estava.",
            confirmar: "Cancelar edição",
            tom: "neutro",
          }
        : {
            titulo: "Descartar o serviço?",
            mensagem: (
              <>
                Os <b>{rascunho.itens.length}</b> toldos calculados serão apagados da montagem.
              </>
            ),
            confirmar: "Descartar",
            tom: "perigo",
          },
    );
    if (ok) m.limpar();
  }

  async function salvar() {
    setTentou(true);
    if (rascunho.itens.length === 0 || total <= 0) return;
    setSalvando(true);
    const valor = total;
    try {
      if (rascunho.servicoId) {
        await atualizarServico(rascunho.servicoId, { cliente: rascunho.cliente, itens: rascunho.itens, valor });
      } else {
        await salvarServico({ cliente: rascunho.cliente, itens: rascunho.itens, valor });
      }
    } catch (e) {
      toast({ mensagem: `Não foi possível salvar. ${mensagemErroBanco(e)}` });
      setSalvando(false);
      return;
    }
    setSalvando(false);
    m.limpar();
    toast({
      mensagem: editando ? "Serviço atualizado" : `Serviço salvo. ${formatBRL(valor)} a receber`,
      acao: { rotulo: "Ver", executar: () => router.push("/servicos") },
    });
  }

  return (
    <div className="painel-servico">
      {rascunho.itens.length === 0 ? (
        <p className="painel-vazio">Nenhum toldo neste serviço. Adicione pelo menos um.</p>
      ) : (
        <ol className="itens-servico">
          {rascunho.itens.map((i, idx) => {
            const nome = nomeItem(i);
            const emEdicao = m.editandoItem === i.id;
            return (
              <li key={i.id} className={emEdicao ? "em-edicao" : undefined}>
                <span className="item-num">{idx + 1}</span>
                <span className="item-servico-textos">
                  <strong>{nome}</strong>
                  <small>
                    Corte {formatNum(i.resultado.larguraCorte)} × {formatNum(i.resultado.alturaCorte)} ·{" "}
                    {formatM(metrosItem(i))} de lona
                    {cristalItem(i) > 0 && ` · ${formatM(cristalItem(i))} de cristal`}
                    {emEdicao && " · abrindo na calculadora"}
                  </small>
                </span>
                <button type="button" className="icone-btn" onClick={() => editar(i.id, i.tipo)} aria-label={`Alterar ${nome}`}>
                  <LuPencil />
                </button>
                <button type="button" className="icone-btn perigo" onClick={() => remover(i.id, nome)} aria-label={`Tirar ${nome}`}>
                  <LuTrash2 />
                </button>
                <label className={`valor-item${tentou && !(i.valor && i.valor > 0) ? " falta" : ""}`}>
                  <span>Valor</span>
                  <em>R$</em>
                  <input
                    inputMode="numeric"
                    value={centavosParaTexto(Math.round((i.valor ?? 0) * 100))}
                    onChange={(e) =>
                      m.definirValorItem(i.id, Number(e.target.value.replace(/\D/g, "").slice(0, 11) || 0) / 100)
                    }
                    onFocus={(e) => {
                      const el = e.target;
                      requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
                    }}
                    aria-label={`Valor de ${nome} em reais`}
                  />
                </label>
              </li>
            );
          })}
        </ol>
      )}

      <Link href="/toldos" className="botao-secundario" onClick={m.fecharPainel}>
        <LuPlus aria-hidden /> Adicionar outro toldo
      </Link>

      {rascunho.itens.length > 0 && (
        <dl className="totais-servico">
          <div>
            <dt>Toldos</dt>
            <dd>{n}</dd>
          </div>
          <div>
            <dt>Lona</dt>
            <dd>{formatM(lona)}</dd>
          </div>
          {cristal > 0 && (
            <div>
              <dt>Cristal</dt>
              <dd>{formatM(cristal)}</dd>
            </div>
          )}
        </dl>
      )}

      <label className="campo">
        <span>Cliente ou referência</span>
        <input
          value={rascunho.cliente}
          onChange={(e) => m.definir({ cliente: e.target.value })}
          placeholder="Ex.: Padaria Central"
          maxLength={60}
        />
      </label>
      <div className="total-servico" aria-live="polite">
        <span>
          Valor do serviço
          <small>
            {rascunho.itens.length > 1 ? `soma dos ${rascunho.itens.length} toldos` : "valor do toldo"}
            {semValor > 0 && rascunho.itens.length > 0 && ` · ${semValor} sem valor`}
          </small>
        </span>
        <strong>{formatBRL(total)}</strong>
      </div>
      {tentou && total <= 0 && <p className="erro">Digite o valor de pelo menos um toldo.</p>}

      <p className="dica-salvar">
        {editando ? (
          <>O valor também é atualizado no Financeiro.</>
        ) : (
          <>
            Vai para Serviços e entra no Financeiro como <b>a receber</b>.
          </>
        )}
      </p>
      <button
        type="button"
        className="botao-principal"
        onClick={salvar}
        disabled={salvando || rascunho.itens.length === 0}
      >
        {salvando ? "Salvando…" : editando ? "Salvar alterações" : `Salvar serviço (${n} ${n === 1 ? "toldo" : "toldos"})`}
      </button>
      <button type="button" className="botao-perigo" onClick={descartar}>
        <LuX aria-hidden /> {editando ? "Cancelar edição" : "Descartar montagem"}
      </button>
    </div>
  );
}
