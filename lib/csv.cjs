'use strict';

/** CSV e números — sem dependência externa. */

function detectarSeparador(primeiraLinha) {
  const opcoes = [';', ',', '\t'];
  let melhor = ';';
  let maior = -1;
  for (const sep of opcoes) {
    const n = (primeiraLinha.match(new RegExp(`\\${sep}`, 'g')) || []).length;
    if (n > maior) { maior = n; melhor = sep; }
  }
  return melhor;
}

function dividirLinha(linha, sep) {
  const out = [];
  let atual = '';
  let dentro = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      if (dentro && linha[i + 1] === '"') { atual += '"'; i++; }
      else dentro = !dentro;
      continue;
    }
    if (ch === sep && !dentro) { out.push(atual); atual = ''; continue; }
    atual += ch;
  }
  out.push(atual);
  return out.map(s => s.trim());
}

function parseCsv(texto) {
  const linhas = String(texto).replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());
  if (!linhas.length) return { cabecalho: [], linhas: [] };

  const sep = detectarSeparador(linhas[0]);
  const cabecalho = dividirLinha(linhas[0], sep);

  const registros = linhas.slice(1).map(linha => {
    const cols = dividirLinha(linha, sep);
    const obj = {};
    cabecalho.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return obj;
  });

  return { cabecalho, linhas: registros, separador: sep };
}

const normalizar = s => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

/** Aceita 1.234,56 (pt-BR), 1,234.56 (en) e 1234.56. */
function numero(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  let s = String(valor).trim().replace(/[^\d,.-]/g, '');
  if (!s) return null;

  const ultimaVirgula = s.lastIndexOf(',');
  const ultimoPonto = s.lastIndexOf('.');

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    if (ultimaVirgula > ultimoPonto) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (ultimaVirgula >= 0) {
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Aceita dd/mm/aaaa, aaaa-mm-dd e dd/mm/aa. Devolve aaaa-mm-dd. */
function data(valor) {
  if (!valor) return null;
  const s = String(valor).trim();
  let m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function diffDias(a, b) {
  const da = new Date(`${a}T00:00:00Z`);
  const db = new Date(`${b}T00:00:00Z`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  return Math.round((da - db) / 86400000);
}

const brl = n => Number.isFinite(n)
  ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  : '—';

const pct = (n, casas = 1) => Number.isFinite(n)
  ? `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`
  : '—';

module.exports = { parseCsv, normalizar, numero, data, diffDias, brl, pct };
