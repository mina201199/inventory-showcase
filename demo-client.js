(function(root) {
  'use strict';
  const storageKey = 'inventory-public-showcase-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function merge(target, patch) {
    const result = isObject(target) ? clone(target) : {};
    for (const key of Object.keys(patch)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('無效欄位');
      result[key] = isObject(patch[key]) ? merge(result[key], patch[key]) : clone(patch[key]);
    }
    return result;
  }
  class DemoClient {
    constructor({ storage, seed, onState = () => {} }) {
      this.storage = storage;
      this.seed = seed;
      this.onState = onState;
      this.docs = null;
      this.revision = 0;
      this.busy = false;
      this.pending = null;
      this.state = 'connecting';
    }
    status(state) { this.state = state; this.onState(state); }
    snapshot() { return { revision: this.revision, docs: clone(this.docs) }; }
    canWrite() { return this.state === 'ok' && !this.busy; }
    async load() {
      try {
        const saved = this.storage.getItem(storageKey);
        if (saved) {
          const value = JSON.parse(saved);
          if (!Number.isInteger(value.revision) || !value.docs?.master || !value.docs.ledger) throw new Error('展示資料格式不正確');
          this.docs = value.docs;
          this.revision = value.revision;
        } else {
          const value = { revision: 0, docs: this.seed() };
          this.storage.setItem(storageKey, JSON.stringify(value));
          this.docs = value.docs;
        }
        this.status('ok');
        return this.snapshot();
      } catch (error) {
        this.status('error');
        throw new Error('瀏覽器無法讀取展示資料，請允許此網站儲存資料，或使用新的分頁。');
      }
    }
    async commit(changes) {
      const next = clone(this.docs);
      for (const { path, patch } of changes) {
        if (path === 'master/main') next.master = merge(next.master, patch);
        else if (/^ledger\/\d{4}-\d{2}$/.test(path)) {
          const month = path.split('/')[1];
          next.ledger[month] = merge(next.ledger[month], patch);
        } else throw new Error('不允許的展示資料路徑');
      }
      return this.replace(next);
    }
    async replace(docs) {
      if (!this.canWrite()) throw new Error('展示資料尚未準備好');
      this.busy = true;
      this.status('saving');
      try {
        const next = { revision: this.revision + 1, docs: clone(docs) };
        this.storage.setItem(storageKey, JSON.stringify(next));
        this.docs = next.docs;
        this.revision = next.revision;
        this.status('ok');
        return this.snapshot();
      } catch (error) {
        this.status('error');
        throw new Error('瀏覽器保存失敗；請保留目前畫面，不要重新整理。');
      } finally { this.busy = false; }
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { DemoClient };
  else root.DemoClient = DemoClient;
})(globalThis);
