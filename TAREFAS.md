# Tarefas — Painel do Mercado

## Feito (v0.1)

- [x] Importador de CSV com mapeamento de colunas configurável.
- [x] Aceita `;` ou `,`, número pt-BR e data `dd/mm/aaaa` ou `aaaa-mm-dd`.
- [x] Descarta colunas de dado pessoal e avisa no console.
- [x] Indicadores: vendas, CMV, margem, ruptura, validade, cobertura, curva ABC e contas a pagar.
- [x] Ações da semana geradas a partir dos dados.
- [x] Painel HTML único, offline, com gráficos SVG e impressão.
- [x] Resumo em Markdown para WhatsApp.
- [x] Base de exemplo determinística (43 produtos, 30 dias).
- [x] Teste de fumaça em `test/run.cjs`.
- [x] `atualizar.cmd` para rodar tudo com duplo clique.

## Próximo (ordem sugerida)

1. **Receber o CSV real do parceiro** e ajustar `config/mapeamento.json`. Sem isso, o resto é hipótese.
2. **Validar a contagem de estoque** — a ruptura só vale se a contagem for confiável.
3. **Rodar uma semana** e comparar o resumo com a percepção do dono.
4. **Agendar semanalmente** e enviar o resumo por WhatsApp (link `wa.me` ou API oficial).
5. **Fluxo de caixa** — se o PDV exportar sangria/entradas, montar o caixa real.
6. **Comparativo de preço de fornecedor** — histórico de custo por produto e por CNPJ.
7. **Sugestão de compra** — ponto de pedido por produto com base no giro e no lead time.

## Decisões tomadas

- **Sem dado pessoal por desenho.** O importador só lê o mapeamento; coluna de cliente é descartada.
- **HTML único offline**, não SaaS. O dono abre com duplo clique e não depende de internet.
- **Ação, não vaidade.** O painel termina em "o que fazer na segunda-feira", não em gráfico.
- **Ruptura exige estoque atualizado.** Se não houver contagem confiável, o indicador é marcado como indisponível em vez de chutar.
- **Margem exige custo.** Sem custo no PDV, o painel mostra `—` em vez de estimar.
