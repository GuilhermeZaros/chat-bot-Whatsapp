// gerar-fotos.js — liga foto->moldura. fotosDeNota (puro) lê os markdowns; gerar() junta com
// a listagem do Drive (_drive.json) e escreve apps-script/SeedFotosMolduras.gs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extrai [{ filename, ref }] de um markdown. ehNota2: separador "—-" e ref rotulada;
// senão separador "---" e ref no 7º campo (posicional).
export function fotosDeNota(texto, ehNota2) {
  const sep = ehNota2 ? /—-+/ : /\n-{3,}\n/;
  return String(texto).split(sep).map((b) => {
    const img = b.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (!img) return null;
    const filename = decodeURIComponent(img[1].split('/').pop());
    let ref = '';
    const refLab = b.match(/Refer[eê]ncia:\s*([^\n]*)/);
    if (refLab) {
      ref = refLab[1].trim();
    } else {
      const lines = b.split(/\r?\n/).map((l) => l.trim())
        .filter((l) => l && l.indexOf('![') !== 0 && l.charAt(0) !== '#');
      if (lines.length >= 7) { const v = lines[6]; const i = v.indexOf(':'); ref = (i >= 0 ? v.slice(i + 1) : v).trim(); }
    }
    return { filename, ref };
  }).filter(Boolean);
}

// Limpa a ref (igual ao gerador do catálogo): "sem referência"/preço → vazio.
export function refLimpa(s) {
  const t = String(s || '').trim();
  if (!t || /sem refer/i.test(t)) return '';
  if (/^\d+[,.]\d+$/.test(t)) return '';
  return t;
}

// ID da pasta pública do Drive com as fotos.
const FOTO_PASTA_ID = '1ScQmpi4t4sarN_sWTW9NgS_LbthhG8zH';

// As 4 molduras sem referência (S-REF): código -> arquivo da foto (conferido nos markdowns).
const SREF_PARA_FILENAME = {
  'S-REF-1': '42C6E9D5-FCA4-4B4F-8266-442D59CAEA7E.heic', // Rosa reta lisa 2cm
  'S-REF-2': '54F90D1E-F10D-415D-B6BB-8E61382B08B7.heic', // Lilás reta lisa 2cm
  'S-REF-3': '95F93B87-F4A1-47B4-A4AB-1E32E101239A.heic', // Dourada caixa invertida (filete) 1cm
  'S-REF-4': 'IMG_3869.jpeg'                              // Preta arredondada lisa 2cm
};

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

// Escreve apps-script/SeedFotosMolduras.gs com FOTO_ARQUIVO (codigo -> nome do arquivo) e a
// função que, rodando como o dono, lista a pasta do Drive (nome -> id) e grava o Foto_URL.
export function gerar() {
  const base = path.join(__dirname, '..', 'catalogo', 'molduras');
  let pares = [];
  for (const f of acharMd(base)) {
    const txt = fs.readFileSync(f, 'utf8');
    pares = pares.concat(fotosDeNota(txt, /—-/.test(txt)));
  }
  const fotoArquivo = {};
  for (const { filename, ref } of pares) {
    const r = refLimpa(ref);
    if (r) fotoArquivo[r] = filename;
  }
  Object.assign(fotoArquivo, SREF_PARA_FILENAME);
  const linhas = Object.entries(fotoArquivo).map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v));
  const conteudo =
    '// SeedFotosMolduras.gs — GERADO por scripts/gerar-fotos.js. NÃO editar à mão.\n' +
    '// codigo(referência) -> nome do arquivo da foto. A função lista a pasta do Drive (como o dono)\n' +
    '// e grava Foto_URL = thumbnail (JPEG, resolve heic). Idempotente.\n' +
    'var FOTO_PASTA_ID = ' + JSON.stringify(FOTO_PASTA_ID) + ';\n' +
    'var FOTO_ARQUIVO = {\n' + linhas.join(',\n') + '\n};\n\n' +
    'function importarFotosMolduras() {\n' +
    '  return comLock(function () {\n' +
    '    var pasta = DriveApp.getFolderById(FOTO_PASTA_ID);\n' +
    '    var idPorNome = {};\n' +
    '    var it = pasta.getFiles();\n' +
    '    while (it.hasNext()) { var f = it.next(); idPorNome[f.getName()] = f.getId(); }\n' +
    '    var molduras = lerAba(ABAS.MOLDURAS);\n' +
    '    var n = 0, faltou = [];\n' +
    '    molduras.forEach(function (m) {\n' +
    '      var arq = FOTO_ARQUIVO[String(m.Codigo).trim()];\n' +
    '      if (!arq) return;\n' +
    '      var id = idPorNome[arq];\n' +
    '      if (!id) { faltou.push(m.Codigo); return; }\n' +
    "      atualizarCelula(ABAS.MOLDURAS, m._linha, 'Foto_URL', 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1000');\n" +
    '      n++;\n' +
    '    });\n' +
    "    return 'Fotos ligadas em ' + n + ' molduras.' + (faltou.length ? ' Sem arquivo no Drive: ' + faltou.length + ' (' + faltou.slice(0, 8).join(', ') + ').' : '');\n" +
    '  });\n' +
    '}\n';
  fs.writeFileSync(path.join(__dirname, '..', 'apps-script', 'SeedFotosMolduras.gs'), conteudo, 'utf8');
  console.log('Gerado: ' + Object.keys(fotoArquivo).length + ' molduras -> arquivo de foto.');
  return fotoArquivo;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) gerar();
