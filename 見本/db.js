// ===== データの保存係 =====
// ブラウザの中にある「IndexedDB」というデータベースに記録を保存します。
// 写真も含めて、使っている端末（スマホやパソコン）の中だけに保存されます。

const DB_NAME = 'gohan-tabi-log';
const STORE_NAME = 'records';

let dbPromise = null;

// データベースを開く（初回だけ作成する）
function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// データベースへの操作を1回実行して、終わるのを待つ
async function runRequest(mode, action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const req = action(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// app.js から使う3つの操作
const recordStore = {
  getAll: () => runRequest('readonly', (store) => store.getAll()),
  save: (record) => runRequest('readwrite', (store) => store.put(record)),
  remove: (id) => runRequest('readwrite', (store) => store.delete(id)),
};
