import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const assets = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const read = (name) => readFileSync(path.join(assets, name));

const SOURCE_SHA256 = '73bd548f71d167d8e74d67334ebedb1082fadecd9947d9300a66e20783f0ac92';

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error('no SOF marker');
}

function seconds(stamp) {
  const parts = stamp.split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function cues(vtt) {
  return vtt
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.split('\n'))
    .filter((lines) => lines.some((l) => l.includes('-->')))
    .map((lines) => {
      const at = lines.findIndex((l) => l.includes('-->'));
      const [start, end] = lines[at].split('-->').map((s) => seconds(s.trim().split(' ')[0]));
      return { start, end, text: lines.slice(at + 1) };
    });
}

test('teaser.mp4 is the 5580671-byte source', () => {
  assert.equal(statSync(path.join(assets, 'teaser.mp4')).size, 5580671);
  assert.equal(createHash('sha256').update(read('teaser.mp4')).digest('hex'), SOURCE_SHA256);
});

test('poster is a 1920x1080 jpeg under 400 KB', () => {
  const buf = read('teaser-poster.jpg');
  assert.ok(buf.length < 400 * 1024, `poster is ${buf.length} bytes`);
  assert.deepEqual(jpegSize(buf), { width: 1920, height: 1080 });
});

test('vtt has a valid structure', () => {
  const vtt = read('teaser.pt-BR.vtt').toString('utf8');
  assert.ok(vtt.startsWith('WEBVTT'));
  const list = cues(vtt);
  let previous = -1;
  for (const cue of list) {
    assert.ok(cue.start > previous, `cue at ${cue.start} is not after ${previous}`);
    assert.ok(cue.end > cue.start);
    assert.ok(cue.end <= 91.5, `cue ends at ${cue.end}`);
    assert.ok(cue.text.length >= 1 && cue.text.length <= 2, 'a cue has 1 or 2 lines');
    for (const line of cue.text) assert.ok(line.length <= 42, `line too long: ${line}`);
    previous = cue.start;
  }
});

test('vtt carries the narration (at least 15 cues)', { todo: 'aguardando o roteiro da narração: nenhuma ferramenta de transcrição acessível neste ambiente' }, () => {
  assert.ok(cues(read('teaser.pt-BR.vtt').toString('utf8')).length >= 15);
});

test('transcript is non-empty and in Portuguese', () => {
  const text = read('teaser.pt-BR.txt').toString('utf8');
  assert.ok(text.length >= 300, `transcript has ${text.length} characters`);
  assert.match(text, /lab/i);
});

test('transcript is the narration, not the on-screen text', { todo: 'aguardando o roteiro da narração' }, () => {
  assert.ok(!/pendente/i.test(read('teaser.pt-BR.txt').toString('utf8')));
});
