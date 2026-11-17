'use strict';

/**
 * Gera uma base de exemplo realista para o painel.
 * Determinístico: rodar de novo produz os mesmos arquivos.
 *
 *   node tools/gerar-exemplo.cjs
 */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const dados = path.join(raiz, 'dados');
fs.mkdirSync(dados, { recursive: true });

// PRNG determinístico
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261105);
const entre = (a, b) => a + (b - a) * rnd();
const escolher = arr => arr[Math.floor(rnd() * arr.length)];

const PRODUTOS = [
  // [codigo, nome, categoria, custo, preco, perecivel, validadeDias]
  ['1001', 'Arroz Branco 5kg', 'Mercearia', 18.90, 27.90, false, null],
  ['1002', 'Feijão Carioca 1kg', 'Mercearia', 6.20, 9.49, false, null],
  ['1003', 'Óleo de Soja 900ml', 'Mercearia', 5.80, 8.99, false, null],
  ['1004', 'Açúcar Refinado 1kg', 'Mercearia', 3.40, 5.49, false, null],
  ['1005', 'Café Torrado 500g', 'Mercearia', 14.50, 21.90, false, null],
  ['1006', 'Macarrão Espaguete 500g', 'Mercearia', 3.10, 5.29, false, null],
  ['1007', 'Farinha de Trigo 1kg', 'Mercearia', 4.20, 6.79, false, null],
  ['1008', 'Sal Refinado 1kg', 'Mercearia', 1.80, 3.49, false, null],
  ['1009', 'Molho de Tomate 340g', 'Mercearia', 2.90, 4.99, false, null],
  ['1010', 'Leite Integral 1L', 'Mercearia', 4.10, 6.49, false, null],
  ['1011', 'Achocolatado 400g', 'Mercearia', 6.80, 10.90, false, null],
  ['1012', 'Biscoito Recheado', 'Mercearia', 2.20, 3.99, false, null],

  ['2001', 'Refrigerante Cola 2L', 'Bebidas', 6.40, 9.99, false, null],
  ['2002', 'Cerveja Lata 350ml', 'Bebidas', 2.30, 3.99, false, null],
  ['2003', 'Água Mineral 1,5L', 'Bebidas', 1.10, 2.49, false, null],
  ['2004', 'Suco de Uva 1L', 'Bebidas', 5.20, 8.49, false, null],
  ['2005', 'Energético 250ml', 'Bebidas', 4.80, 7.99, false, null],
  ['2006', 'Cerveja Long Neck', 'Bebidas', 3.10, 5.49, false, null],

  ['3001', 'Detergente 500ml', 'Limpeza', 2.10, 3.49, false, null],
  ['3002', 'Sabão em Pó 1kg', 'Limpeza', 8.40, 13.90, false, null],
  ['3003', 'Água Sanitária 2L', 'Limpeza', 3.20, 5.49, false, null],
  ['3004', 'Desinfetante 1L', 'Limpeza', 3.80, 6.49, false, null],
  ['3005', 'Papel Higiênico 12un', 'Limpeza', 11.90, 18.90, false, null],
  ['3006', 'Sabonete 90g', 'Limpeza', 1.40, 2.79, false, null],

  ['4001', 'Queijo Mussarela kg', 'Frios', 28.00, 42.90, true, 12],
  ['4002', 'Presunto Fatiado kg', 'Frios', 24.00, 36.90, true, 10],
  ['4003', 'Mortadela kg', 'Frios', 16.00, 25.90, true, 14],
  ['4004', 'Iogurte Natural 170g', 'Frios', 2.40, 4.29, true, 18],
  ['4005', 'Manteiga 200g', 'Frios', 7.80, 12.49, true, 25],

  ['5001', 'Banana Prata kg', 'Hortifruti', 3.20, 5.99, true, 6],
  ['5002', 'Tomate kg', 'Hortifruti', 4.10, 7.49, true, 5],
  ['5003', 'Cebola kg', 'Hortifruti', 2.80, 4.99, true, 12],
  ['5004', 'Batata kg', 'Hortifruti', 3.40, 5.49, true, 15],
  ['5005', 'Alface Unidade', 'Hortifruti', 1.60, 3.29, true, 4],
  ['5006', 'Laranja kg', 'Hortifruti', 2.90, 4.99, true, 10],

  ['6001', 'Pão Francês kg', 'Padaria', 7.50, 12.90, true, 2],
  ['6002', 'Pão de Forma 500g', 'Padaria', 5.40, 8.99, true, 8],
  ['6003', 'Bolacha Maria 400g', 'Padaria', 3.60, 6.29, false, null],
  ['6004', 'Bolo de Cenoura', 'Padaria', 8.00, 14.90, true, 4],

  ['7001', 'Frango Inteiro kg', 'Carnes', 9.80, 15.90, true, 3],
  ['7002', 'Carne Moída kg', 'Carnes', 22.00, 32.90, true, 4],
  ['7003', 'Linguiça Toscana kg', 'Carnes', 16.50, 24.90, true, 7],
  ['7004', 'Peito de Frango kg', 'Carnes', 12.90, 19.90, true, 3],
];

// peso de venda por categoria (frequência)
const PESO = {
  Mercearia: 0.55, Bebidas: 0.75, Limpeza: 0.35, Frios: 0.45,
  Hortifruti: 0.65, Padaria: 0.85, Carnes: 0.50,
};

const hoje = new Date('2026-11-05T00:00:00Z');
const DIAS = 30;
const linhasVenda = [];
const fmt = n => n.toFixed(2).replace('.', ',');
const fmtData = d => {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};

for (let i = DIAS - 1; i >= 0; i--) {
  const dia = new Date(hoje);
  dia.setUTCDate(dia.getUTCDate() - i);
  const dow = dia.getUTCDay();
  const fatorDia = dow === 0 ? 0.55 : dow === 6 ? 1.45 : dow === 5 ? 1.25 : 1;

  for (const [codigo, nome, categoria, custo, preco, , validade] of PRODUTOS) {
    const peso = (PESO[categoria] || 0.4) * fatorDia;
    // número de cupons que levaram o produto
    const ocorrencias = Math.round(entre(0, 4) * peso + (rnd() < peso * 0.35 ? 1 : 0));
    if (ocorrencias <= 0) continue;

    for (let k = 0; k < ocorrencias; k++) {
      const qtd = categoria === 'Hortifruti' || categoria === 'Carnes' || categoria === 'Frios'
        ? Math.round(entre(0.3, 1.8) * 100) / 100
        : Math.max(1, Math.round(entre(1, 3)));

      // variação de preço ocasional (promoção)
      const precoPraticado = rnd() < 0.08 ? preco * 0.88 : preco;
      const total = Math.round(precoPraticado * qtd * 100) / 100;

      linhasVenda.push({
        Data: fmtData(dia),
        Codigo: codigo,
        Produto: nome,
        Categoria: categoria,
        Quantidade: qtd,
        ValorUnitario: fmt(precoPraticado),
        ValorTotal: fmt(total),
        CustoUnitario: fmt(custo),
      });
    }
  }
}

// estoque: alguns zerados de propósito (ruptura) e alguns vencendo
const linhasEstoque = PRODUTOS.map(([codigo, nome, categoria, custo, , perecivel, validadeDias]) => {
  const zerado = ['1005', '2002', '3005', '5002', '7001'].includes(codigo);
  const qtd = zerado ? 0 : Math.round(entre(4, 60));
  let validade = '';
  if (perecivel && qtd > 0) {
    const dias = Math.max(1, Math.round(entre(1, validadeDias + 6)));
    const d = new Date(hoje);
    d.setUTCDate(d.getUTCDate() + dias);
    validade = fmtData(d);
  }
  return {
    Codigo: codigo,
    Produto: nome,
    Categoria: categoria,
    Quantidade: qtd,
    CustoUnitario: fmt(custo),
    Validade: validade,
  };
});

// contas a pagar (fornecedor = CNPJ, sem dado pessoal)
const FORNECEDORES = [
  ['Distribuidora Central Alimentos', '12.345.678/0001-90'],
  ['Bebidas Sul Ltda', '23.456.789/0001-01'],
  ['Atacado Limpeza Paraná', '34.567.890/0001-12'],
  ['Frigorífico Boa Carne', '45.678.901/0001-23'],
  ['Hortifruti Campo Verde', '56.789.012/0001-34'],
  ['Panificadora Trigo Bom', '67.890.123/0001-45'],
  ['Laticínios Vale Leite', '78.901.234/0001-56'],
  ['Distribuidora de Frios', '89.012.345/0001-67'],
  ['Atacarejo Atacadão', '90.123.456/0001-78'],
  ['Transportadora Rápida', '01.234.567/0001-89'],
];

const linhasContas = [];
for (let i = 0; i < 22; i++) {
  const [fornecedor, cnpj] = escolher(FORNECEDORES);
  const dias = Math.round(entre(-4, 34));
  const venc = new Date(hoje);
  venc.setUTCDate(venc.getUTCDate() + dias);
  linhasContas.push({
    Fornecedor: fornecedor,
    Cnpj: cnpj,
    Vencimento: fmtData(venc),
    Valor: fmt(Math.round(entre(120, 1600) * 100) / 100),
    Categoria: escolher(['Mercadoria', 'Mercadoria', 'Mercadoria', 'Despesa', 'Frete']),
  });
}

function escrever(nome, cabecalho, linhas) {
  const csv = [
    cabecalho.join(';'),
    ...linhas.map(l => cabecalho.map(h => l[h] ?? '').join(';')),
  ].join('\r\n');
  fs.writeFileSync(path.join(dados, nome), csv, 'utf8');
  console.log(`${nome}: ${linhas.length} linhas`);
}

escrever('vendas.csv', ['Data', 'Codigo', 'Produto', 'Categoria', 'Quantidade', 'ValorUnitario', 'ValorTotal', 'CustoUnitario'], linhasVenda);
escrever('estoque.csv', ['Codigo', 'Produto', 'Categoria', 'Quantidade', 'CustoUnitario', 'Validade'], linhasEstoque);
escrever('contas.csv', ['Fornecedor', 'Cnpj', 'Vencimento', 'Valor', 'Categoria'], linhasContas);

console.log('\nBase de exemplo gerada em dados/.');
