const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('展示網站不含正式 API 或外部連線，資源支援 GitHub Pages 子路徑', () => {
  const client = fs.readFileSync(path.join(root, 'demo-client.js'), 'utf8');
  assert.doesNotMatch(html + client, /fetch\s*\(|\/api\/|workers\.dev|script\.google\.com|serviceWorker|IndexedVault|CloudClient|LanClient/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /src="\.\/demo-client\.js"/);
  assert.doesNotMatch(html, /(?:src|href)="\//);
  assert.doesNotMatch(html, /localStorage/);
});

test('所有產生的客人及商品皆為假資料，不含聯絡資訊', () => {
  const seed = html.match(/\/\* SEED-START \*\/([\s\S]*?)\/\* SEED-END \*\//)[1];
  const data = vm.runInNewContext(seed + '; makeSeed();');
  assert.equal(Object.keys(data.master.products).length, 26);
  for (const product of Object.values(data.master.products)) {
    assert.match(product.name, /^示範/);
    assert.match(product.sku, /^DEMO-/);
  }
  for (const customer of Object.values(data.master.customers)) {
    assert.match(customer.name, /^示範客人/);
    assert.equal(customer.phone, '未提供');
    assert.equal(customer.line, undefined);
    assert.equal(customer.address, undefined);
  }
  assert.ok(Object.keys(data.ledger).length >= 2);
});

test('展示頁 JavaScript 可解析，產生結果與獨立來源一致', () => {
  for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  const template = fs.readFileSync(path.join(root, 'src/app.html'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'demo-ui.js'), 'utf8');
  assert.equal(html, template.replace('/* DEMO-UI */', ui));
});
