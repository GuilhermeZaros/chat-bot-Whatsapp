// gerar-catalogo.js — lê as duas notas do Notion (catalogo/molduras) e gera
// apps-script/CatalogoDados.gs. Funções puras (normalização) testadas em test/catalogo.test.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VARA_M = 2.70;
const ESTOQUE_BASTANTE_M = 27;
const ESTOQUE_MINIMO_M = 5.40;

export function parseValorBR(s) {
  if (typeof s === 'number') return isNaN(s) ? 0 : s;
  let t = String(s == null ? '' : s).replace(/[^\d.,]/g, '');
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return isNaN(n) ? 0 : n;
}

export function parsePerfil(s) {
  const t = String(s == null ? '' : s).replace(/[^\d,.]/g, '').replace(',', '.');
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

export function estoqueMetros(s) {
  const t = String(s == null ? '' : s).toLowerCase();
  const m = t.match(/(\d+)\s*vara/);
  if (m) return Number((parseInt(m[1], 10) * VARA_M).toFixed(2));
  return ESTOQUE_BASTANTE_M; // "nada anotado", "bastante", vazio
}

export function normalizarCor(s) {
  const t = String(s || '').toLowerCase();
  const palette = [
    [/dourad/, 'dourada'], [/prata|pratead/, 'prata'], [/pret/, 'preta'],
    [/branc/, 'branca'], [/madeira/, 'madeira'], [/marrom/, 'marrom'],
    [/bronze/, 'bronze'], [/ros[eê]|rosa/, 'rosa'], [/vermelh/, 'vermelho'],
    [/verde/, 'verde'], [/azul/, 'azul'], [/amarel/, 'amarelo'],
    [/lil[aá]s/, 'lilas'], [/tabaco/, 'tabaco'], [/bambu/, 'bambu']
  ];
  for (const [re, nome] of palette) if (re.test(t)) return nome;
  return t.split(/[/,]/)[0].trim();
}

export function normalizarEstilo(s) {
  const t = String(s || '').toLowerCase().trim();
  if (/caixa invertida|filete|borda infinita/.test(t)) return 'caixa invertida (filete)';
  if (/caixa/.test(t)) return 'caixa';
  if (/semi\s*arredond/.test(t)) return 'semi arredondada';
  if (/arredond/.test(t)) return 'arredondada';
  if (/rebaix/.test(t)) return 'rebaixada';
  if (/reta/.test(t)) return 'reta';
  return t;
}

export function normalizarAcabamento(s) {
  const t = String(s || '').toLowerCase().trim();
  if (/^lis/.test(t)) return 'lisa';
  if (/detalh/.test(t)) return 'detalhada';
  if (/martel/.test(t)) return 'martelada';
  return t;
}

export function refLimpa(s) {
  const t = String(s || '').trim();
  if (!t || /sem refer/i.test(t)) return '';
  if (/^\d+[,.]\d+$/.test(t)) return ''; // parece preço (ex: 64,00)
  return t;
}

export function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
export function fmtCm(n) { return String(n).replace('.', ',') + 'cm'; }

export function montarNome(cor, estilo, acab, perfilNum) {
  const p = perfilNum ? (' ' + fmtCm(perfilNum)) : '';
  return (cap(cor) + ' ' + estilo + ' ' + acab + p).replace(/\s+/g, ' ').trim();
}

export function montarDescricao(raw, corNorm, perfilNum) {
  const partes = [];
  const corC = String(raw.cor || '').replace(/\s*\/\s*/g, '/').trim();
  if (corC && corC.toLowerCase() !== corNorm) partes.push('Cor: ' + corC + '.');
  const altura = parsePerfil(raw.altura);
  if (altura) partes.push('Perfil ' + fmtCm(perfilNum) + ' × altura ' + fmtCm(altura) + '.');
  const obs = String(raw.obs || '').trim();
  if (obs) partes.push(obs);
  return partes.join(' ').trim();
}

export function montarMoldura(raw) {
  const valor = parseValorBR(raw.valor);
  if (!(valor > 0)) return null; // sem preço → pula
  const perfil = parsePerfil(raw.largura);
  const cor = normalizarCor(raw.cor);
  const estilo = normalizarEstilo(raw.estilo);
  const acab = normalizarAcabamento(raw.acabamento);
  return {
    Nome: montarNome(cor, estilo, acab, perfil),
    Modelo: refLimpa(raw.ref),
    Estilo: estilo,
    Cor: cor,
    Acabamento: acab,
    Largura_perfil_cm: perfil || '',
    Valor_por_metro: valor,
    Estoque_atual_m: estoqueMetros(raw.estoque),
    Estoque_minimo_m: ESTOQUE_MINIMO_M,
    Descricao: montarDescricao(raw, cor, perfil),
    Tags: '',
    Foto_URL: '',
    Custo_por_metro: '',
    Disponivel: true
  };
}

// Nota 1 (Sem título.md): separador "---", 7 campos posicionais (rótulo "Label:" opcional).
export function parseNota1(texto) {
  return String(texto).split(/\n-{3,}\n/).map((b) => {
    const lines = b.split(/\r?\n/).map((l) => l.trim())
      .filter((l) => l && l.indexOf('![') !== 0 && l.charAt(0) !== '#');
    if (lines.length < 7) return null;
    const v = lines.slice(0, 7).map((l) => { const i = l.indexOf(':'); return (i >= 0 ? l.slice(i + 1) : l).trim(); });
    return { valor: v[0], largura: v[1], altura: '', estoque: v[2], cor: v[3], estilo: v[4], acabamento: v[5], ref: v[6], obs: '' };
  }).filter(Boolean);
}

// Nota 2 (Nova Nota.md): separador "—-", campos rotulados (+ Altura/Obs opcionais).
export function parseNota2(texto) {
  return String(texto).split(/—-+/).map((b) => {
    const get = (re) => { const m = b.match(re); return m ? m[1].trim() : ''; };
    const raw = {
      valor: get(/Valor:\s*([^\n]*)/),
      largura: get(/Largura do perfil:\s*([^\n]*)/),
      altura: get(/Altura do perfil:\s*([^\n]*)/),
      estoque: get(/Estoque:\s*([^\n]*)/),
      cor: get(/Cor:\s*([^\n]*)/),
      estilo: get(/Estilo:\s*([^\n]*)/),
      acabamento: get(/Acabamento:\s*([^\n]*)/),
      ref: get(/Refer[eê]ncia:\s*([^\n]*)/),
      obs: get(/Obs\*?:\s*([^\n]*)/)
    };
    if (!raw.cor && !raw.estilo && !raw.valor) return null;
    return raw;
  }).filter(Boolean);
}

function acharMd(dir) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '__MACOSX') walk(p); }
      else if (/\.md$/i.test(e.name)) out.push(p);
    }
  })(dir);
  return out;
}

export function gerar() {
  const base = path.join(__dirname, '..', 'catalogo', 'molduras');
  const mds = acharMd(base);
  let raws = [];
  for (const f of mds) {
    const txt = fs.readFileSync(f, 'utf8');
    raws = raws.concat(/—-/.test(txt) ? parseNota2(txt) : parseNota1(txt));
  }
  const registros = raws.map(montarMoldura).filter(Boolean);
  // dedup por referência; 060-116 já é a MOL-016 (não reimporta). Sem-ref entram individualmente.
  const vistos = { '060-116': true };
  const finais = [];
  for (const r of registros) {
    const ref = String(r.Modelo || '').trim();
    if (ref) { if (vistos[ref]) continue; vistos[ref] = true; }
    finais.push(r);
  }
  const conteudo =
    '// CatalogoDados.gs — GERADO por scripts/gerar-catalogo.js. NÃO editar à mão.\n' +
    '// ' + finais.length + ' molduras do catálogo real (Foto_URL/Custo vazios; fotos vêm depois).\n' +
    'var CATALOGO_MOLDURAS = ' + JSON.stringify(finais, null, 2) + ';\n';
  fs.writeFileSync(path.join(__dirname, '..', 'apps-script', 'CatalogoDados.gs'), conteudo, 'utf8');
  console.log('Gerado: ' + finais.length + ' molduras -> apps-script/CatalogoDados.gs');
  return finais;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) gerar();
