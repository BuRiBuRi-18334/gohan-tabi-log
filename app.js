// ===== 写真 =====
const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');
let selectedPhoto = null; // 選んだ写真（小さくしたもの）

// 写真ファイルを画像として読み込む
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読み込めませんでした'));
    img.src = URL.createObjectURL(file);
  });
}

// 画像を、長い辺が maxSize ピクセルになるように縮めて、JPEG にする
function shrinkImage(img, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

// 写真を選んだら、保存用と一覧用の2つを作る
photoInput.addEventListener('change', async () => {
  const file = photoInput.files[0];
  if (!file) return;

  try {
    const img = await loadImage(file);
    selectedPhoto = {
      photo: await shrinkImage(img, 1600),
      thumb: await shrinkImage(img, 480),
    };
  } catch (error) {
    alert('この写真は読み込めませんでした');
    return;
  }

  photoPreview.src = URL.createObjectURL(selectedPhoto.photo);

  const kb = (blob) => Math.round(blob.size / 1024) + 'KB';
  console.log('元の写真', kb(file), '→ 保存用', kb(selectedPhoto.photo), '→ 一覧用', kb(selectedPhoto.thumb));
});
const prefInput = document.getElementById('pref-input');
const cityInput = document.getElementById('city-input');
const dateInput = document.getElementById('date-input');

// 都道府県のリストを作る
for (const pref of Object.keys(CITY_DATA)) {
  prefInput.add(new Option(pref, pref));
}

// 県を選んだら、その県の市町村リストを作り直す
prefInput.addEventListener('change', () => {
  cityInput.length = 1;
  const data = CITY_DATA[prefInput.value];
  if (!data) return;
  for (const city of data.cities) {
    cityInput.add(new Option(city.name, city.name));
  }
});

// 食べた日に、最初から今日の日付を入れておく
dateInput.value = new Date().toLocaleDateString('sv-SE');

// ===== 保存した記録 =====
let records = [];
const recordCount = document.getElementById('record-count');

function showCount() {
  recordCount.textContent = `保存した記録：${records.length}件`;
}
// 一覧を表示する
const list = document.getElementById('list');

function renderList() {
  list.innerHTML = '';
  records.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  for (const record of records) {
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `
      <img alt="">
      <div class="card-info">
        <div class="card-name"></div>
        <div class="card-place"></div>
        <div class="card-date"></div>
      </div>`;
    li.querySelector('img').src = URL.createObjectURL(record.thumb);
    li.querySelector('.card-name').textContent = record.name;
    li.querySelector('.card-place').textContent = `${record.pref} ${record.city}`;
    li.querySelector('.card-date').textContent = record.date.replaceAll('-', '/');
        li.addEventListener('click', () => openDetail(record));
    list.append(li);
  }
}
// アプリを開いたときに、倉庫から記録を全部出してくる
async function init() {
  records = await recordStore.getAll();
  showCount();
    renderList();
}

init();
// ===== 入力フォームのポップアップ =====
const formDialog = document.getElementById('form-dialog');

document.getElementById('add-btn').addEventListener('click', () => {
  formDialog.showModal();
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  formDialog.close();
});
// ===== 保存ボタンを押したとき =====
const recordForm = document.getElementById('record-form');
const nameInput = document.getElementById('name-input');
const memoInput = document.getElementById('memo-input');

recordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!selectedPhoto) {
    alert('写真を選んでください');
    return;
  }

  // 記録1件分を、1つの箱にまとめる
  const record = {
    id: Date.now(),
    photo: selectedPhoto.photo,
    thumb: selectedPhoto.thumb,
    name: nameInput.value,
    pref: prefInput.value,
    city: cityInput.value,
    date: dateInput.value,
    memo: memoInput.value,
  };

  try {
    await recordStore.save(record);
  } catch (error) {
    alert('保存できませんでした。スマホやパソコンの空き容量を確認してください');
    return;
  }

  records.push(record);
  showCount();
    renderList();
    formDialog.close();

  // 次の記録のために、写真・料理名・メモを空に戻す（県・市町村・日付はそのまま）
  selectedPhoto = null;
  photoInput.value = '';
  photoPreview.removeAttribute('src');
  nameInput.value = '';
  memoInput.value = '';
});
// ===== 詳細のポップアップ =====
const detailDialog = document.getElementById('detail-dialog');
let viewingRecord = null; // 詳細を表示している記録

function openDetail(record) {
  viewingRecord = record;
  document.getElementById('detail-photo').src = URL.createObjectURL(record.photo);
  document.getElementById('detail-name').textContent = record.name;
  document.getElementById('detail-place').textContent = `${record.pref} ${record.city}`;
  document.getElementById('detail-date').textContent = record.date.replaceAll('-', '/');
  document.getElementById('detail-memo').textContent = record.memo;
  detailDialog.showModal();
}

document.getElementById('close-btn').addEventListener('click', () => {
  detailDialog.close();
});

// 写真の外側（暗いところ）を押しても閉じる
detailDialog.addEventListener('click', (event) => {
  if (event.target === detailDialog) detailDialog.close();
});

document.getElementById('delete-btn').addEventListener('click', async () => {
  if (!confirm(`「${viewingRecord.name}」を削除しますか？（元に戻せません）`)) return;

  try {
    await recordStore.remove(viewingRecord.id);
  } catch (error) {
    alert('削除できませんでした');
    return;
  }

  records = records.filter((r) => r.id !== viewingRecord.id);
  showCount();
  renderList();
  detailDialog.close();
});
