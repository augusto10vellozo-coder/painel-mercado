#!/usr/bin/env node
'use strict';

/**
 * Injeta os dados calculados no template e gera o HTML único.
 *
 *   node gerar-painel.cjs
 */

const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const entrada = path.join(raiz, 'dados', 'dados-mercado.json');
const template = path.join(raiz, 'painel', 'template.html');
const saida = path.join(raiz, 'painel-mercado.html');

if (!fs.existsSync(entrada)) {
  console.error('dados/dados-mercado.json não encontrado. Rode "node importar.cjs" primeiro.');
  process.exit(1);
}

const dados = JSON.parse(fs.readFileSync(entrada, 'utf8'));
const tpl = fs.readFileSync(template, 'utf8');

if (!tpl.includes('/*__DADOS__*/')) {
  console.error('Template sem o marcador /*__DADOS__*/.');
  process.exit(1);
}

// escapa "<" para não fechar o <script> por acidente
const json = JSON.stringify(dados).replace(/</g, '\\u003c');
const html = tpl.replace('/*__DADOS__*/', json);

fs.writeFileSync(saida, html, 'utf8');

const kb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
console.log('');
console.log(`Painel gerado: ${saida} (${kb} KB)`);
console.log(`Mercado: ${dados.meta.mercado} · ${dados.meta.periodo.de} a ${dados.meta.periodo.ate}`);
console.log('Abra o arquivo com duplo clique — funciona offline.');
