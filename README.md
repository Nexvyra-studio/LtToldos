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

Sem o Firebase configurado, o sistema funciona em **modo local**: os dados ficam salvos só
no navegador do aparelho. Bom para testar.

## Ligar o Firebase

1. Crie um projeto em https://console.firebase.google.com
2. **Authentication** > Começar > ative **E-mail/senha** e, em "Usuários", crie os acessos da empresa.
3. **Firestore Database** > Criar banco de dados (modo produção).
4. Em **Firestore > Regras**, cole o conteúdo do arquivo `firestore.rules` e publique.
5. Em **Configurações do projeto > Seus apps**, adicione um app da Web e copie a configuração.
6. Copie `firebase.exemplo.txt` para um arquivo novo chamado `.env.local` e preencha os valores.
7. Pare e rode de novo o `npm run dev`. A tela de login aparece.

## O que já tem

**Toldos**
- Tela inicial para escolher o tipo de toldo (só o Cortina está ativo; os outros aparecem como "Em breve").
- Toldo Cortina: largura + 10 cm + 1 cm por emenda; altura + 25 cm (bandô) ou + 15 cm (canhão);
  rolo de 1,40 m. Mostra metros de lona, plano de corte desenhado, sobra do rolo e a conta passo a passo.
- Salvar cálculos com cliente/referência, reabrir e excluir (com "Desfazer").

**Financeiro**
- Lançamento rápido: só o valor é obrigatório. Data vem com hoje; descrição é opcional
  (em branco aparece como "Compra de dd/mm") e sugere as descrições já usadas.
- Marcar como pago com um toque (grava a data do pagamento), com "Desfazer".
- Resumo: a pagar, pago e total, com barra de progresso.
- Filtros por período (este mês, 7 dias, hoje, mês passado, tudo, datas escolhidas),
  por situação (todos, a pagar, pagos) e busca pela descrição.
- Editar e excluir uma compra tocando nela.

## Onde mexer

| O quê | Arquivo |
|---|---|
| Regras do Toldo Cortina | `src/lib/calc/cortina.ts` |
| Lista de tipos de toldo | `src/lib/calc/tipos.ts` |
| Tela do Cortina | `src/app/toldos/cortina/page.tsx` |
| Tela do Financeiro | `src/app/financeiro/page.tsx` |
| Cores e visual | `src/app/globals.css` (variáveis no topo) |
| Firebase / modo local | `src/lib/firebase.ts`, `src/lib/data/repo.ts` |
