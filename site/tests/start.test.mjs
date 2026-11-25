import { test } from 'node:test';
import assert from 'node:assert/strict';
import browser from './helpers/browser.cjs';

const { withPage } = browser;

const WITH_ORG = "window.__R2S_ORG__ = 'org-exemplo';";
const TEMPLATE_URL = 'https://github.com/org-exemplo/r2s-lab';

test('without an organization shows the coming-soon notice', async () => {
  await withPage({ init: "window.__R2S_ORG__ = '';" }, async (page, url) => {
    const response = await page.goto(url, { waitUntil: 'load' });
    const raw = await response.text();
    assert.equal(
      (await page.locator('#clone-status').textContent()).trim(),
      'Em breve: a coordenação vai divulgar o endereço do repositório.',
    );
    assert.equal(await page.locator('#template-link').count(), 0);
    for (const html of [raw, await page.content()]) {
      assert.ok(!html.includes('<ORG>') && !html.includes('&lt;ORG&gt;'));
      assert.ok(!html.includes('github.com//'));
    }
  });
});

test('default configuration links to the lab template', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(
      await page.locator('#template-link').getAttribute('href'),
      'https://github.com/juliopessan/r2s-lab',
    );
    assert.equal(await page.locator('#clone-status').count(), 0);
  });
});

test('with an organization links to the template and explains the private repo', async () => {
  await withPage({ init: WITH_ORG }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const link = page.locator('#template-link');
    assert.equal(await link.getAttribute('href'), TEMPLATE_URL);
    assert.equal((await link.textContent()).trim(), 'Abrir o template do laboratório');
    assert.equal(await page.locator('#clone-status').count(), 0);
    const hint = await page.locator('#comecar .template-hint').innerText();
    assert.match(hint, /Use this template/);
    assert.match(hint, /Private/);
  });
});

test('never tells people to clone the shared template', async () => {
  for (const init of ['', WITH_ORG]) {
    await withPage({ init }, async (page, url) => {
      await page.goto(url, { waitUntil: 'load' });
      assert.ok(!(await page.locator('main').innerText()).includes('git clone'));
      assert.equal(await page.locator('#clone-cmd').count(), 0);
    });
  }
});

test('an invalid organization name is ignored', async () => {
  await withPage({ init: "window.__R2S_ORG__ = 'x/../evil';" }, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.locator('#template-link').count(), 0);
    assert.ok(await page.locator('#clone-status').isVisible());
  });
});

test('footer holds the R2S lockup and no company name appears anywhere', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const footer = await page.locator('footer').innerText();
    assert.ok(footer.includes('R2S LAB'));
    assert.ok(footer.includes('Prática de Data & AI'));
    assert.doesNotMatch(await page.locator('body').innerText(), /avanade|brazil engineering/i);
  });
});

test('lists the three steps, starting from a private repo', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const steps = (await page.locator('ol.steps li').allTextContents()).map((t) => t.trim());
    assert.equal(steps.length, 3);
    assert.match(steps[0], /repositório privado/);
    assert.match(steps[0], /template/);
    assert.match(steps[1], /Clonar o seu repositório/);
    assert.match(steps[1], /VS Code/);
    assert.match(steps[2], /README/);
  });
});

test('start section follows the last beat and the footer follows main', async () => {
  await withPage({}, async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    const order = await page.evaluate(() => {
      const after = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [
        after(document.querySelector('#final'), document.querySelector('#comecar')),
        after(document.querySelector('main'), document.querySelector('footer')),
      ];
    });
    assert.deepEqual(order, [true, true]);
  });
});
