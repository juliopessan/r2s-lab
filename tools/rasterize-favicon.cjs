/* Rasteriza as versões em quadro do favicon (geradas por tools/build-favicon.py) com o Chromium do
 * Playwright e monta site/assets/favicon.ico (16, 32, 48) e site/assets/apple-touch-icon.png (180). */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = path.join(os.tmpdir(), 'r2s-favicon');
const ASSETS = path.join(__dirname, '..', 'site', 'assets');

function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(([lado, buf], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(lado >= 256 ? 0 : lado, e); head.writeUInt8(lado >= 256 ? 0 : lado, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += buf.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p[1])]);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const png = async (nome, lado) => {
    await page.setViewportSize({ width: lado, height: lado });
    await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${fs.readFileSync(path.join(TMP, nome), 'utf8')}`);
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: lado, height: lado } });
  };
  const tamanhos = [[16, 'favicon-16.svg'], [32, 'favicon-32.svg'], [48, 'favicon-48.svg']];
  const pngs = [];
  for (const [lado, nome] of tamanhos) pngs.push([lado, await png(nome, lado)]);
  fs.writeFileSync(path.join(ASSETS, 'favicon.ico'), ico(pngs));
  fs.writeFileSync(path.join(ASSETS, 'apple-touch-icon.png'), await png('apple-touch-icon.svg', 180));
  await browser.close();
  console.log('favicon.ico e apple-touch-icon.png prontos');
})();
