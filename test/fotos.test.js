import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../scripts/gerar-fotos.js';

test('fotosDeNota: nota 2 (—-, rotulada) extrai filename + ref', () => {
  const txt = [
    '![Imagem](Attachments/0BA80932-83D4-4BD7-8476-73626552B85E.heic)',
    'Valor: 28,90', 'Referência: 160-RM9', '—-',
    '![Imagem](Attachments/94FD642B.heic)', 'Referência: 066-R315'
  ].join('\n');
  const r = g.fotosDeNota(txt, true);
  assert.equal(r.length, 2);
  assert.equal(r[0].filename, '0BA80932-83D4-4BD7-8476-73626552B85E.heic');
  assert.equal(r[0].ref, '160-RM9');
  assert.equal(r[1].ref, '066-R315');
});
test('fotosDeNota: nota 1 (---, posicional) pega filename + ref (último campo)', () => {
  const txt = [
    '![IMG_3840.jpeg](Sem%20t%C3%ADtulo/IMG_3840.jpeg)',
    '18,90', '2cm', 'nada anotado', 'dourada', 'reta', 'lisa', '060-3059',
    '---',
    '![IMG_3841.jpeg](Sem%20t%C3%ADtulo/IMG_3841.jpeg)',
    '34,90', '2cm', 'x', 'Dourada', 'Rebaixada', 'Lisa', '165-3059'
  ].join('\n');
  const r = g.fotosDeNota(txt, false);
  assert.equal(r.length, 2);
  assert.equal(r[0].filename, 'IMG_3840.jpeg');
  assert.equal(r[0].ref, '060-3059');
  assert.equal(r[1].filename, 'IMG_3841.jpeg');
  assert.equal(r[1].ref, '165-3059');
});
test('fotosDeNota: ignora bloco sem imagem', () => {
  assert.equal(g.fotosDeNota('só texto sem imagem', true).length, 0);
});
test('refLimpa: tira sem-referência e preço', () => {
  assert.equal(g.refLimpa('160-RM9'), '160-RM9');
  assert.equal(g.refLimpa('sem referência'), '');
  assert.equal(g.refLimpa('64,00'), '');
});
