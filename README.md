# Painel do Mercado

Painel de gestão para mercado pequeno. Lê a exportação do PDV e a planilha de estoque, calcula os indicadores e gera **um HTML único, offline**, que o dono abre com duplo clique.

O foco é o que o dono do mercado realmente usa: **venda, margem, ruptura, validade e contas a pagar**. Não é ERP, não é PDV, não é dashboard de vaidade.

## Privacidade (por desenho)

O importador só lê as colunas declaradas em `config/mapeamento.json`. Qualquer coluna de cliente — nome, CPF, telefone, endereço — é **descartada** e gera aviso no console.

O painel trabalha com produto, estoque, fornecedor (CNPJ) e valores. Nenhum dado pessoal de cliente é lido, armazenado ou exibido.

## Como rodar

```bash
# 1. gerar a base de exemplo (só na primeira vez)
node tools/gerar-exemplo.cjs

# 2. importar os CSVs e calcular os indicadores
node importar.cjs --mercado "Mercado do Parceiro"

# 3. gerar o HTML
node gerar-painel.cjs

# ou tudo de uma vez (Windows)
atualizar.cmd
```

Saídas:
- `dados/dados-mercado.json` — indicadores calculados
- `saida/resumo-semanal.md` — resumo em texto para WhatsApp
- `painel-mercado.html` — o painel

Teste: `node test/run.cjs`.

## Os arquivos de entrada

Coloque em `dados/`:

| Arquivo | O que precisa ter | Obrigatório |
|---|---|---|
| `vendas.csv` | data, código/produto, quantidade, valor | sim |
| `estoque.csv` | código/produto, quantidade, validade | recomendado |
| `contas.csv` | fornecedor, vencimento, valor | opcional |

Aceita `;` ou `,`, números em pt-BR (`1.234,56`) e datas em `dd/mm/aaaa` ou `aaaa-mm-dd`.

### Mapeamento de colunas

Cada PDV exporta com um nome diferente. Em vez de mexer no código, ajuste `config/mapeamento.json`:

```json
{
  "vendas": {
    "data": ["Data", "data_venda", "DT_MOVIMENTO"],
    "codigo": ["Codigo", "cod_produto", "EAN"],
    "produto": ["Produto", "descricao"],
    "categoria": ["Categoria", "grupo", "secao"],
    "quantidade": ["Qtde", "quantidade"],
    "valor_total": ["Total", "valor_total", "VL_TOTAL"],
    "custo_unitario": ["Custo", "custo_unitario"]
  }
}
```

A comparação ignora acento, maiúscula e separador: `ValorUnitario` casa com `valor_unitario`.

Se `custo_unitario` não existir, o painel calcula venda e ruptura, mas mostra `—` na margem. Se `estoque.csv` não existir, não calcula ruptura nem validade.

## O que o painel mostra

| Indicador | Como é calculado |
|---|---|
| Vendas | soma do valor total no período |
| CMV | custo das vendas ÷ venda das linhas que têm custo |
| Margem bruta | 1 − CMV |
| Ruptura | produto que vendeu e está com estoque zero |
| A vencer 7/30 dias | validade do estoque menos a data de hoje |
| Cobertura | estoque atual ÷ venda média por dia |
| Curva ABC | participação acumulada na venda (A ≤ 80%, B ≤ 95%) |
| Contas a pagar | vencimento nos próximos 7/30 dias, mais as vencidas |

## Ações da semana

O painel gera uma lista de ação a partir dos dados, não um texto fixo:

- repor produtos em ruptura (com nome);
- promover o que vence em 7 dias (com valor a custo);
- retirar vencidos;
- revisar preço se a margem estiver abaixo de 25%;
- regularizar contas vencidas;
- conferir contas dos próximos 7 dias.

É essa camada que transforma o painel em serviço: o dono não quer ler gráfico, quer saber o que fazer na segunda-feira.

## Limites conhecidos

- **Não é fluxo de caixa.** O `contas.csv` tem contas a pagar; não há entradas/saídas de caixa. Um fluxo completo exige o extrato ou o sangria do PDV.
- **Ruptura depende do estoque estar atualizado.** Se a contagem não é confiável, o número não é.
- **Margem depende do custo.** PDV que não exporta custo não permite calcular CMV.
- **Venda por dia, não ticket por cliente.** Não usamos dado de cliente — por escolha.

## Próximos passos

1. Testar com o CSV real do parceiro e ajustar o mapeamento.
2. Validar a contagem de estoque (a ruptura é tão boa quanto a contagem).
3. Rodar uma semana e comparar o resumo com a percepção do dono.
4. Se fizer sentido, agendar o `atualizar.cmd` semanalmente e enviar o resumo por WhatsApp.
