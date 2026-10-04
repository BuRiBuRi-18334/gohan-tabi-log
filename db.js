// ===== 記録の倉庫係 =====
// ブラウザの中の倉庫「IndexedDB」に、記録を出し入れします。

const DB_NAME = 'gohan-log';
const STORE_NAME = 'records';

// 倉庫の扉を開ける（初めてのときは棚を作る）
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 倉庫に1回お願いをして、終わるまで待つ
async function runRequest(mode, action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = action(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// app.js から使う3つの道具
const recordStore = {
  getAll: () => runRequest('readonly', (store) => store.getAll()),
  save: (record) => runRequest('readwrite', (store) => store.put(record)),
  remove: (id) => runRequest('readwrite', (store) => store.delete(id)),
};
