import { readFile, writeFile } from 'node:fs/promises';

const templateUrl = new URL('../src/app.html', import.meta.url);
const uiUrl = new URL('../demo-ui.js', import.meta.url);
const template = await readFile(templateUrl, 'utf8');
const ui = await readFile(uiUrl, 'utf8');
if (template.split('/* DEMO-UI */').length !== 2) throw new Error('展示頁範本結構錯誤');
await writeFile(new URL('../index.html', import.meta.url), template.replace('/* DEMO-UI */', ui));
console.log('已產生獨立展示頁 index.html');
