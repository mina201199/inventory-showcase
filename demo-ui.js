function setSync(state) {
  syncState = state;
  $('#sync').className = 'sync ' + (state === 'ok' ? 'ok' : 'error');
  $('#sync').textContent = { ok: '展示資料・已存此分頁', saving: '保存中…', error: '保存失敗', connecting: '載入假資料…' }[state] || state;
  $('#syncNote').textContent = '公開展示版｜所有資料皆為虛構。修改只保留在此瀏覽器分頁，關閉分頁後清除。請勿輸入個人或正式資料。';
  updateLanBanner(state);
}
function openSettings() {
  modal({ title: '展示設定', body: `
    <p class="privacy-tag">假資料展示，不連線正式帳本或 Google Sheets。</p>
    <p class="hint" style="margin:16px 0">可試用收銀、商品進貨、倉庫調撥、儲值、課程與月報表。重新整理會保留此分頁的操作；關閉分頁後清除。</p>
    <div class="actions"><button type="button" class="btn" id="demoReset">重設示範資料</button><button type="button" class="btn" id="demoBackup">下載展示備份</button><button type="button" class="btn" id="manageWh">管理示範倉庫</button></div>`,
    onOpen: (fields, form, close) => {
      form.querySelector('#demoReset').onclick = () => {
        close();
        confirmBox('重設此分頁的假資料與操作紀錄？', resetDemo, '重設示範資料');
      };
      form.querySelector('#demoBackup').onclick = () => downloadLocal('展示假資料備份.json', JSON.stringify({ v: 2, ...client.snapshot() }));
      form.querySelector('#manageWh').onclick = () => { close(); openWarehouses(); };
    }
  });
}
function updateLanBanner(state) {
  const banner = $('#lanBanner');
  banner.hidden = state !== 'error';
  if (state === 'error') banner.textContent = '瀏覽器保存失敗。請保留畫面，複製需要的內容後使用新的分頁重試。';
  $('.main').inert = state !== 'ok';
}
function showLanError(error) { toast(error.message, 6000); }
async function start() {
  MODE = 'lan';
  try {
    client = new DemoClient({ storage: sessionStorage, seed: makeSeed, onState: setSync });
    docs = clone((await client.load()).docs);
    rebuild();
    renderNav();
    renderView();
  } catch (error) {
    $('#boot').textContent = '瀏覽器無法保存展示資料，請允許此網站儲存資料後重新整理。';
    showLanError(error);
  }
}
