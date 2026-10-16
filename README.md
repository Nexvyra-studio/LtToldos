# Toldos

Sistema web (foco no celular) para calcular a lona dos toldos e controlar as compras da empresa.
Feito com Next.js + Firebase.

## Como rodar no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Para testar no celular, na mesma rede Wi-Fi, use o endereço
"Network" que aparece no terminal (ex.: http://192.168.0.10:3000).

Sem o Firebase configurado, o sistema funciona em **modo de teste**: login `adm` / `123` e os
dados ficam salvos só no navegador do aparelho.

## Ligar o Firebase

1. Crie um projeto em https://console.firebase.google.com
2. **Authentication** > Começar > ative **E-mail/senha** e, em "Usuários", crie os acessos da empresa.
3. **Firestore Database** > Criar banco de dados (modo produção).
4. Em **Firestore > Regras**, cole o conteúdo do arquivo `firestore.rules` e publique.
5. Em **Configurações do projeto > Seus apps**, adicione um app da Web e copie a configuração.
6. Copie `firebase.exemplo.txt` para um arquivo novo chamado `.env.local` e preencha os valores.
7. Pare e rode de novo o `npm run dev`. A tela de login aparece.

## O que já tem

**Toldos** (tela inicial com os tipos; cada um tem sua calculadora)
- **Toldo Cortina:** largura + 10 + 1 cm por emenda; altura + 25 (bandô) ou + 15 (canhão).
- **Fixo (casca):** largura + 10 + 1 cm por emenda; altura (ferragem por cima da curva) + 10.
- **Fixo (casca) com bandô:** igual à casca; a medida já inclui o bandô.
- **Fixo com lateral:** casca + 2 laterais em gomos; lateral largura + 5, altura + 5 (sem bandô) ou + 30 (com bandô).
- Em todos: largura do rolo livre, gomo cortado no meio, retalho opcional, desenho estilo caderno,
  plano de corte, conta passo a passo e cálculos salvos.

**Financeiro**
- Lançamento rápido (só o valor é obrigatório), marcar como pago, filtros, busca e totais.

**Login**
- Sem Firebase: modo de teste com usuário `adm` e senha `123`.
- Com Firebase: e-mail e senha do usuário criado em Authentication.

## Banco de dados (Firestore)

As coleções são criadas sozinhas no primeiro lançamento/cálculo salvo. Não precisa criar nada à mão.

### Coleção `lancamentos` (compras do financeiro)

| Campo | Tipo | Exemplo | Observação |
|---|---|---|---|
| `descricao` | texto | `"Lona azul 1,40"` | pode ser vazio (aparece "Compra de dd/mm") |
| `valor` | número | `1850.5` | em reais |
| `data` | texto | `"2026-10-16"` | dia da compra |
| `pago` | verdadeiro/falso | `false` | |
| `dataPagamento` | texto ou nulo | `"2026-10-20"` | preenchido ao marcar como pago |
| `criadoEm` | número | `1792171234567` | data/hora em milissegundos |
| `criadoPor` | texto | `"rdn.4123@gmail.com"` | e-mail de quem lançou |

### Coleção `calculos` (cálculos de toldo salvos)

| Campo | Tipo | Observação |
|---|---|---|
| `tipo` | texto | `cortina`, `casca`, `casca-bando` ou `fixo-lateral` |
| `cliente` | texto | cliente ou referência (opcional) |
| `entrada` | mapa | medidas digitadas: `largura`, `altura`, `acabamento`, `modelo`, `quantidade`, `rolo`, `retalho`, `comBando`, `lateral` |
| `resultado` | mapa | `larguraCorte`, `alturaCorte`, `gomos`, `emendas`, `larguraGomos`, `retalho`, `metrosPorToldo`, `metrosTotal`, `metrosRolo`, `metrosGeral`, `laterais`, `usoRetalho`… |
| `criadoEm` | número | data/hora em milissegundos |
| `criadoPor` | texto | e-mail de quem salvou |

### Regras de segurança

O arquivo `firestore.rules` só deixa ler e gravar quem está logado e confere os campos de cada
documento. Para aplicar: Firebase > Firestore Database > **Regras** > colar o conteúdo > **Publicar**.

O app guarda uma cópia local no aparelho: com internet fraca continua funcionando e sincroniza
quando a conexão volta.

## Publicar na Vercel

Cadastre as mesmas 6 variáveis do `.env.local` em **Settings > Environment Variables** do projeto
e faça um novo deploy. No Firebase, em **Authentication > Configurações > Domínios autorizados**,
adicione o domínio da Vercel (ex.: `lt-toldos.vercel.app`).

## Onde mexer

| O quê | Arquivo |
|---|---|
| Regras dos toldos | `src/lib/calc/cortina.ts` |
| Lista de tipos | `src/lib/calc/tipos.ts` |
| Tela de cálculo (todos os tipos) | `src/components/CalculadoraToldo.tsx` |
| Financeiro | `src/app/financeiro/page.tsx` |
| Cores e visual | `src/app/globals.css` (variáveis no topo) |
| Conexão com o Firebase | `src/lib/firebase.ts` |
| Leitura e gravação no banco | `src/lib/data/repo.ts` |
| Login | `src/lib/auth.tsx`, `src/components/Login.tsx` |
