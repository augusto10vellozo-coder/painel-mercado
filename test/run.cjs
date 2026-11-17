'use strict';

/** Teste de fumaça dos indicadores do painel. */

const assert = require('assert');
const { analisar, mapearCabecalho } = require('../importar.cjs');
const config = require('../config/mapeamento.json');

// mapeamento tolera camelCase, snake_case e acento
const mapa = mapearCabecalho(['Data', 'Codigo', 'ValorUnitario', 'valor_total', 'Descrição'], config.vendas);
assert.strictEqual(mapa.data, 'Data');
assert.strictEqual(mapa.valor_unitario, 'ValorUnitario');
assert.strictEqual(mapa.valor_total, 'valor_total');
assert.strictEqual(mapa.produto, 'Descrição');

const vendas = [];
for (const dia of ['2026-11-01', '2026-11-02', '2026-11-03']) {
  vendas.push({ data: dia, codigo: 'A', produto: 'Produto A', categoria: 'Mercearia', quantidade: 2, valor_unitario: 20, valor_total: 40, custo_unitario: 10 });
  vendas.push({ data: dia, codigo: 'B', produto: 'Produto B', categoria: 'Bebidas', quantidade: 1, valor_unitario: 10, valor_total: 10, custo_unitario: 5 });
}

const estoque = [
  { codigo: 'A', produto: 'Produto A', categoria: 'Mercearia', quantidade: 0, custo_unitario: 10, validade: null },
  { codigo: 'B', produto: 'Produto B', categoria: 'Bebidas', quantidade: 10, custo_unitario: 5, validade: '2026-11-08' },
];

const contas = [
  { fornecedor: 'Fornecedor 1', cnpj: '00.000.000/0001-00', vencimento: '2026-11-08', valor: 100, categoria: 'Mercadoria' },
  { fornecedor: 'Fornecedor 2', cnpj: '11.111.111/0001-11', vencimento: '2026-11-02', valor: 50, categoria: 'Mercadoria' },
];

const d = analisar({ vendas, estoque, contas }, { mercado: 'Teste', hoje: '2026-11-05' });

assert.strictEqual(d.resumo.totalVendas, 150, 'vendas devem somar 150');
assert.strictEqual(d.resumo.totalCusto, 75, 'custo deve somar 75');
assert.strictEqual(d.resumo.cmv, 0.5, 'CMV deve ser 50%');
assert.strictEqual(d.resumo.margem, 0.5, 'margem deve ser 50%');
assert.strictEqual(d.resumo.produtos, 2, 'dois produtos');
assert.strictEqual(d.resumo.ruptura, 1, 'um produto em ruptura');
assert.strictEqual(d.ruptura[0].codigo, 'A', 'ruptura deve ser o produto A');
assert.strictEqual(d.resumo.aVencer7, 1, 'um produto vence em 7 dias');
assert.strictEqual(d.resumo.contas7Valor, 100, 'conta de 7 dias deve somar 100');
assert.strictEqual(d.resumo.contasVencidasValor, 50, 'conta vencida deve somar 50');
assert.strictEqual(d.porDia.length, 3, 'três dias no gráfico');
assert.strictEqual(d.produtos[0].abc, 'A', 'produto A é curva A');

console.log('OK — vendas %s, CMV %s, ruptura %s, a vencer %s', d.resumo.totalVendas, d.resumo.cmv, d.resumo.ruptura, d.resumo.aVencer7);
