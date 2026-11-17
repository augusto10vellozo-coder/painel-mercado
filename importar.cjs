#!/usr/bin/env node
'use strict';

/**
 * Lê os CSVs do mercado e gera os indicadores do painel.
 *
 *   node importar.cjs
 *   node importar.cjs --vendas dados/vendas.csv --estoque dados/estoque.csv --contas dados/contas.csv
 *
 * Princípio de privacidade: só entram os campos do mapeamento. Qualquer coluna
 * de cliente (nome, CPF, telefone) é descartada e gera aviso no console.
 */

const fs = require('fs');
const path = require('path');
const { parseCsv, normalizar, numero, data, diffDias, brl, pct } = require('./lib/csv.cjs');

const raiz = __dirname;
const args = process.argv.slice(2);
const arg = (nome, padrao) => {
  const i = args.indexOf('--' + nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};

const config = JSON.parse(fs.readFileSync(path.join(raiz, 'config', 'mapeamento.json'), 'utf8'));

function mapearCabecalho(cabecalho, aliases) {
  // compara sem separadores: "ValorUnitario" e "valor_unitario" viram a mesma chave
  const chave = s => normalizar(s).replace(/_/g, '');
  const norm = cabecalho.map(h => ({ original: h, n: chave(h) }));
  const mapa = {};
  for (const [campo, opcoes] of Object.entries(aliases)) {
    const alvo = opcoes.map(chave);
    const achado = norm.find(h => alvo.includes(h.n));
    mapa[campo] = achado ? achado.original : null;
  }
  return mapa;
}

function ler(nome, aliases) {
  const caminho = path.resolve(raiz, arg(nome, path.join('dados', `${nome}.csv`)));
  if (!fs.existsSync(caminho)) return { registros: [], mapa: {}, caminho, ausente: true };

  const { cabecalho, linhas } = parseCsv(fs.readFileSync(caminho, 'utf8'));
  const mapa = mapearCabecalho(cabecalho, aliases);

  // LGPD: avisa e ignora colunas de dado pessoal
  const chave = s => normalizar(s).replace(/_/g, '');
  const proibidos = (config.camposProibidos || []).map(chave);
  const achados = cabecalho.filter(h => proibidos.includes(chave(h)));
  if (achados.length) {
    console.warn(`  ! ${path.basename(caminho)}: coluna(s) de dado pessoal ignorada(s): ${achados.join(', ')}`);
  }

  const registros = linhas.map(l => {
    const o = {};
    for (const [campo, col] of Object.entries(mapa)) o[campo] = col ? l[col] : null;
    return o;
  });

  return { registros, mapa, caminho, ausente: false, cabecalho };
}

function normalizarVendas(brutos) {
  return brutos.map(r => {
    const quantidade = numero(r.quantidade);
    const unitario = numero(r.valor_unitario);
    const total = numero(r.valor_total) ?? (unitario != null && quantidade != null ? unitario * quantidade : null);
    return {
      data: data(r.data),
      codigo: String(r.codigo || '').trim(),
      produto: String(r.produto || '').trim(),
      categoria: String(r.categoria || 'Sem categoria').trim(),
      quantidade,
      valor_unitario: unitario,
      valor_total: total,
      custo_unitario: numero(r.custo_unitario),
    };
  }).filter(v => v.data && v.quantidade > 0 && v.valor_total > 0);
}

function normalizarEstoque(brutos) {
  return brutos.map(r => ({
    codigo: String(r.codigo || '').trim(),
    produto: String(r.produto || '').trim(),
    categoria: String(r.categoria || 'Sem categoria').trim(),
    quantidade: numero(r.quantidade) ?? 0,
    custo_unitario: numero(r.custo_unitario),
    validade: data(r.validade),
  })).filter(e => e.codigo || e.produto);
}

function normalizarContas(brutos) {
  return brutos.map(r => ({
    fornecedor: String(r.fornecedor || 'Fornecedor').trim(),
    cnpj: String(r.cnpj || '').trim(),
    vencimento: data(r.vencimento),
    valor: numero(r.valor),
    categoria: String(r.categoria || 'Geral').trim(),
  })).filter(c => c.vencimento && c.valor > 0);
}

const soma = arr => arr.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

function addDia(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function analisar({ vendas, estoque, contas }, opts = {}) {
  const hoje = opts.hoje || new Date().toISOString().slice(0, 10);
  const datas = [...new Set(vendas.map(v => v.data))].sort();
  const de = datas[0] || hoje;
  const ate = datas[datas.length - 1] || hoje;
  const dias = Math.max(1, (diffDias(ate, de) || 0) + 1);

  const totalVendas = round2(soma(vendas.map(v => v.valor_total)));
  const comCusto = vendas.filter(v => v.custo_unitario != null);
  const vendasComCusto = round2(soma(comCusto.map(v => v.valor_total)));
  const totalCusto = round2(soma(comCusto.map(v => v.custo_unitario * v.quantidade)));
  const coberturaCusto = totalVendas > 0 ? vendasComCusto / totalVendas : 0;
  const cmv = vendasComCusto > 0 ? totalCusto / vendasComCusto : null;
  const margem = cmv != null ? 1 - cmv : null;

  // por dia (preenche dias sem venda)
  const mapaDia = new Map();
  for (const v of vendas) mapaDia.set(v.data, (mapaDia.get(v.data) || 0) + v.valor_total);
  const porDia = [];
  for (let d = de; d <= ate; d = addDia(d, 1)) {
    porDia.push({ data: d, valor: round2(mapaDia.get(d) || 0) });
    if (porDia.length > 400) break;
  }

  // por produto
  const mapaProd = new Map();
  for (const v of vendas) {
    const k = v.codigo || v.produto;
    if (!mapaProd.has(k)) {
      mapaProd.set(k, { codigo: v.codigo, produto: v.produto, categoria: v.categoria, qtd: 0, venda: 0, custo: 0, temCusto: false });
    }
    const p = mapaProd.get(k);
    p.qtd += v.quantidade;
    p.venda += v.valor_total;
    if (v.custo_unitario != null) { p.custo += v.custo_unitario * v.quantidade; p.temCusto = true; }
  }

  const produtos = [...mapaProd.values()].sort((a, b) => b.venda - a.venda);
  let acumulado = 0;
  for (const p of produtos) {
    acumulado += p.venda;
    p.venda = round2(p.venda);
    p.custo = round2(p.custo);
    p.participacao = totalVendas ? p.venda / totalVendas : 0;
    p.acumulado = totalVendas ? acumulado / totalVendas : 0;
    p.abc = p.acumulado <= 0.8 ? 'A' : p.acumulado <= 0.95 ? 'B' : 'C';
    p.margem = p.temCusto ? round2(p.venda - p.custo) : null;
    p.margemPct = p.temCusto && p.venda > 0 ? p.margem / p.venda : null;
    p.vendaMediaDia = p.qtd / dias;
  }

  // estoque
  const estoquePorChave = new Map();
  for (const e of estoque) estoquePorChave.set(e.codigo || e.produto, e);
  for (const p of produtos) {
    const e = estoquePorChave.get(p.codigo || p.produto);
    p.estoque = e ? e.quantidade : null;
    p.validade = e ? e.validade : null;
    p.coberturaDias = e && p.vendaMediaDia > 0 ? Math.round((e.quantidade / p.vendaMediaDia) * 10) / 10 : null;
  }

  const ruptura = produtos
    .filter(p => p.estoque === 0 && p.qtd > 0)
    .map(p => ({ ...p, vendaPerdidaDia: round2(p.vendaMediaDia * (p.margemPct != null ? 1 : 1)) }));

  // validade
  const validade = estoque
    .filter(e => e.validade)
    .map(e => ({
      codigo: e.codigo,
      produto: e.produto,
      categoria: e.categoria,
      quantidade: e.quantidade,
      validade: e.validade,
      dias: diffDias(e.validade, hoje),
      valor: round2((e.custo_unitario || 0) * e.quantidade),
    }))
    .filter(e => e.dias <= 45)
    .sort((a, b) => a.dias - b.dias);

  const vencidos = validade.filter(e => e.dias < 0);
  const aVencer7 = validade.filter(e => e.dias >= 0 && e.dias <= 7);
  const aVencer30 = validade.filter(e => e.dias >= 0 && e.dias <= 30);

  // categorias
  const mapaCat = new Map();
  for (const v of vendas) {
    const k = v.categoria || 'Sem categoria';
    if (!mapaCat.has(k)) mapaCat.set(k, { categoria: k, venda: 0, custo: 0, temCusto: false, qtd: 0 });
    const c = mapaCat.get(k);
    c.venda += v.valor_total;
    c.qtd += v.quantidade;
    if (v.custo_unitario != null) { c.custo += v.custo_unitario * v.quantidade; c.temCusto = true; }
  }
  const porCategoria = [...mapaCat.values()]
    .map(c => ({
      ...c,
      venda: round2(c.venda),
      custo: round2(c.custo),
      margem: c.temCusto ? round2(c.venda - c.custo) : null,
      margemPct: c.temCusto && c.venda > 0 ? (c.venda - c.custo) / c.venda : null,
    }))
    .sort((a, b) => b.venda - a.venda);

  // contas
  const contasOrdenadas = [...contas].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const diasConta = c => diffDias(c.vencimento, hoje);
  const porVencimento = (a, b) => a.vencimento.localeCompare(b.vencimento);
  const contas7 = contas.filter(c => diasConta(c) >= 0 && diasConta(c) <= 7).sort(porVencimento);
  const contas30 = contas.filter(c => diasConta(c) >= 0 && diasConta(c) <= 30).sort(porVencimento);
  const contasVencidas = contas.filter(c => diasConta(c) < 0).sort(porVencimento);

  // ações da semana
  const acoes = [];
  if (ruptura.length) {
    acoes.push(`Repor ${ruptura.length} produto(s) que venderam e estão zerados: ${ruptura.slice(0, 3).map(p => p.produto).join(', ')}${ruptura.length > 3 ? '…' : ''}.`);
  }
  if (aVencer7.length) {
    const valor = round2(soma(aVencer7.map(e => e.valor)));
    acoes.push(`Promover ${aVencer7.length} produto(s) que vencem em 7 dias (${brl(valor)} a custo).`);
  }
  if (vencidos.length) {
    acoes.push(`Retirar ${vencidos.length} produto(s) vencido(s) da área de venda.`);
  }
  if (margem != null && margem < 0.25) {
    acoes.push(`Margem bruta em ${pct(margem)}: revisar preço dos produtos com margem abaixo de 20%.`);
  }
  if (contasVencidas.length) {
    acoes.push(`Regularizar ${contasVencidas.length} conta(s) vencida(s) (${brl(round2(soma(contasVencidas.map(c => c.valor))))}).`);
  }
  if (contas7.length) {
    acoes.push(`Conferir ${contas7.length} conta(s) a pagar nos próximos 7 dias (${brl(round2(soma(contas7.map(c => c.valor))))}).`);
  }
  if (!acoes.length) acoes.push('Sem alerta crítico no período.');

  return {
    meta: {
      mercado: opts.mercado || 'Mercado',
      geradoEm: new Date().toISOString(),
      hoje,
      periodo: { de, ate, dias },
      coberturaCusto,
      arquivos: opts.arquivos || {},
    },
    resumo: {
      totalVendas,
      totalCusto,
      cmv,
      margem,
      vendaMediaDia: porDia.length ? round2(totalVendas / porDia.length) : 0,
      itens: round2(soma(vendas.map(v => v.quantidade))),
      produtos: produtos.length,
      categorias: porCategoria.length,
      ruptura: ruptura.length,
      aVencer7: aVencer7.length,
      aVencer7Valor: round2(soma(aVencer7.map(e => e.valor))),
      vencidos: vencidos.length,
      contas7: contas7.length,
      contas7Valor: round2(soma(contas7.map(c => c.valor))),
      contasVencidas: contasVencidas.length,
      contasVencidasValor: round2(soma(contasVencidas.map(c => c.valor))),
      contasTotal: round2(soma(contas.map(c => c.valor))),
    },
    porDia,
    porCategoria,
    produtos,
    ruptura,
    validade: { vencidos, aVencer7, aVencer30, todos: validade },
    contas: { lista: contasOrdenadas, contas7, contas30, vencidas: contasVencidas },
    acoes,
  };
}

function resumoMarkdown(d) {
  const p = d.meta.periodo;
  const linhas = [];
  linhas.push(`# ${d.meta.mercado} — resumo do período`);
  linhas.push('');
  linhas.push(`**Período:** ${p.de} a ${p.ate} (${p.dias} dias)  `);
  linhas.push(`**Gerado em:** ${new Date(d.meta.geradoEm).toLocaleString('pt-BR')}`);
  linhas.push('');
  linhas.push('| Indicador | Valor |');
  linhas.push('|---|---|');
  linhas.push(`| Vendas | ${brl(d.resumo.totalVendas)} |`);
  linhas.push(`| CMV | ${brl(d.resumo.totalCusto)} (${pct(d.resumo.cmv)}) |`);
  linhas.push(`| Margem bruta | ${brl(d.resumo.totalVendas - d.resumo.totalCusto)} (${pct(d.resumo.margem)}) |`);
  linhas.push(`| Venda média/dia | ${brl(d.resumo.vendaMediaDia)} |`);
  linhas.push(`| Produtos vendidos | ${d.resumo.produtos} |`);
  linhas.push(`| Ruptura | ${d.resumo.ruptura} produto(s) |`);
  linhas.push(`| A vencer em 7 dias | ${d.resumo.aVencer7} produto(s) · ${brl(d.resumo.aVencer7Valor)} |`);
  linhas.push(`| Contas a pagar (7 dias) | ${d.resumo.contas7} · ${brl(d.resumo.contas7Valor)} |`);
  linhas.push(`| Contas vencidas | ${d.resumo.contasVencidas} · ${brl(d.resumo.contasVencidasValor)} |`);
  linhas.push('');
  linhas.push('## Ações da semana');
  linhas.push('');
  for (const a of d.acoes) linhas.push(`- ${a}`);
  linhas.push('');
  linhas.push('## Top 10 produtos');
  linhas.push('');
  linhas.push('| Produto | Venda | Margem | ABC |');
  linhas.push('|---|---|---|---|');
  for (const pr of d.produtos.slice(0, 10)) {
    linhas.push(`| ${pr.produto} | ${brl(pr.venda)} | ${pr.margemPct != null ? pct(pr.margemPct) : 'sem custo'} | ${pr.abc} |`);
  }
  linhas.push('');
  linhas.push('> Dados de produto, estoque e fornecedor. Nenhum dado pessoal de cliente é lido ou armazenado.');
  linhas.push('');
  return linhas.join('\n');
}

function main() {
  const mercado = arg('mercado', 'Mercado Exemplo');

  console.log('');
  console.log(`Importando — ${mercado}`);

  const vendasBrutas = ler('vendas', config.vendas);
  const estoqueBruto = ler('estoque', config.estoque);
  const contasBrutas = ler('contas', config.contas);

  for (const [nome, r] of [['vendas', vendasBrutas], ['estoque', estoqueBruto], ['contas', contasBrutas]]) {
    if (r.ausente) {
      console.warn(`  ! ${nome}.csv não encontrado — seguindo sem ele`);
      continue;
    }
    const faltando = Object.entries(r.mapa).filter(([, v]) => !v).map(([k]) => k);
    if (faltando.length) console.warn(`  ! ${nome}.csv: campo(s) não mapeado(s): ${faltando.join(', ')}`);
  }

  const vendas = normalizarVendas(vendasBrutas.registros);
  const estoque = normalizarEstoque(estoqueBruto.registros);
  const contas = normalizarContas(contasBrutas.registros);

  if (!vendas.length) {
    console.error('Nenhuma venda válida. Confira o mapeamento em config/mapeamento.json.');
    process.exit(1);
  }

  const dados = analisar({ vendas, estoque, contas }, {
    mercado,
    hoje: arg('hoje', new Date().toISOString().slice(0, 10)),
    arquivos: {
      vendas: path.basename(vendasBrutas.caminho),
      estoque: path.basename(estoqueBruto.caminho),
      contas: path.basename(contasBrutas.caminho),
    },
  });

  const saidaDados = path.join(raiz, 'dados', 'dados-mercado.json');
  fs.writeFileSync(saidaDados, JSON.stringify(dados, null, 2), 'utf8');

  const saidaResumo = path.join(raiz, 'saida', 'resumo-semanal.md');
  fs.mkdirSync(path.dirname(saidaResumo), { recursive: true });
  fs.writeFileSync(saidaResumo, resumoMarkdown(dados), 'utf8');

  console.log('');
  console.log(`Vendas: ${brl(dados.resumo.totalVendas)} · ${dados.resumo.produtos} produtos · ${dados.meta.periodo.dias} dias`);
  console.log(`CMV: ${pct(dados.resumo.cmv)} · Margem: ${pct(dados.resumo.margem)}`);
  console.log(`Ruptura: ${dados.resumo.ruptura} · A vencer 7d: ${dados.resumo.aVencer7} · Contas 7d: ${brl(dados.resumo.contas7Valor)}`);
  console.log('');
  console.log(`Dados:  ${saidaDados}`);
  console.log(`Resumo: ${saidaResumo}`);
}

if (require.main === module) main();

module.exports = { analisar, normalizarVendas, normalizarEstoque, normalizarContas, mapearCabecalho, resumoMarkdown };
