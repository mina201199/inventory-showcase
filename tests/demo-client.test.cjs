const test = require('node:test');
const assert = require('node:assert/strict');
const { DemoClient } = require('../demo-client.js');

const seed = () => ({ master: { products: { p1: { name: '示範精華', price: 500 } } }, ledger: {} });
const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('首次載入假資料，不呼叫任何 API', async () => {
  const client = new DemoClient({ storage: memoryStorage(), seed });
  assert.deepEqual((await client.load()).docs, seed());
  assert.equal(client.canWrite(), true);
});

test('商品、交易一次保存，重新開啟後仍存在', async () => {
  const storage = memoryStorage();
  const client = new DemoClient({ storage, seed });
  await client.load();
  await client.commit([
    { path: 'master/main', patch: { products: { p1: { price: 600 } } } },
    { path: 'ledger/2026-10', patch: { sales: { s1: { total: 600 } } } }
  ]);
  const restored = await new DemoClient({ storage, seed }).load();
  assert.equal(restored.docs.master.products.p1.name, '示範精華');
  assert.equal(restored.docs.master.products.p1.price, 600);
  assert.equal(restored.docs.ledger['2026-10'].sales.s1.total, 600);
});

test('重設只替換展示用儲存格，不清除其他資料', async () => {
  const storage = memoryStorage();
  storage.setItem('production', 'untouched');
  const client = new DemoClient({ storage, seed });
  await client.load();
  await client.replace({ master: { products: {} }, ledger: {} });
  assert.deepEqual((await client.replace(seed())).docs, seed());
  assert.equal(storage.getItem('production'), 'untouched');
});

test('儲存失敗不可回報成功或丟失舊快照', async () => {
  const storage = memoryStorage();
  const client = new DemoClient({ storage, seed });
  await client.load();
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  await assert.rejects(client.replace({ master: {}, ledger: {} }), /瀏覽器/);
  assert.deepEqual(client.docs, seed());
  assert.equal(client.canWrite(), false);
});

test('回傳值與保存快照互相隔離', async () => {
  const client = new DemoClient({ storage: memoryStorage(), seed });
  const snapshot = await client.load();
  snapshot.docs.master.products.p1.price = 1;
  assert.equal(client.docs.master.products.p1.price, 500);
});

test('無效修改不造成部分保存', async () => {
  const client = new DemoClient({ storage: memoryStorage(), seed });
  await client.load();
  await assert.rejects(client.commit([
    { path: 'master/main', patch: { products: {} } },
    { path: 'https://production.example/api', patch: {} }
  ]), /路徑/);
  assert.deepEqual(client.docs, seed());
});
