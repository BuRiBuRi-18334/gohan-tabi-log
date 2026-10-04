// ===== アプリの動き =====

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

// 保存する写真の大きさ（長い辺のピクセル数）。小さくすると容量の節約になる
const PHOTO_MAX_SIZE = 1600;
const THUMB_MAX_SIZE = 480;

// HTMLの部品をIDで取り出す短い書き方
const $ = (id) => document.getElementById(id);

let records = [];        // 保存されている記録の一覧
let editingId = null;    // 編集中の記録のID（新しく追加するときは null）
let pendingPhoto = null; // フォームで選んだ写真 { photo, thumb }
let viewingId = null;    // 詳細表示している記録のID

// 写真を画面に出すために作る一時的なURL（使い終わったら片付ける）
let listUrls = [];
let previewUrl = null;
let detailUrl = null;

// ===== 小さな便利関数 =====

// 今日の日付を "2026-10-04" の形で返す
function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// "2026-10-04" を "2026年10月4日" にする
function formatDate(dateText) {
  const [y, m, d] = dateText.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

function formatPlace(record) {
  return `${record.pref} ${record.city}`.trim();
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 前回入力した県・市町村を覚えておく（旅行中は同じ場所が続くので便利）
function loadLastPlace() {
  try {
    return JSON.parse(localStorage.getItem('lastPlace')) || {};
  } catch {
    return {};
  }
}

function saveLastPlace(pref, city) {
  try {
    localStorage.setItem('lastPlace', JSON.stringify({ pref, city }));
  } catch {
    // 保存できなくてもアプリは動くので何もしない
  }
}

// ===== 写真の処理 =====

// 選んだファイルを画像として読み込む
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした'));
    };
    img.src = url;
  });
}

// 画像を指定サイズまで縮小して JPEG にする
function shrinkImage(img, maxSize, quality) {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function showPreview(blob) {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = blob ? URL.createObjectURL(blob) : null;
  $('photo-preview').src = previewUrl || '';
  $('photo-preview').hidden = !blob;
  $('photo-placeholder').hidden = !!blob;
}

// ===== 一覧の表示 =====

// 県のしぼりこみメニューを、記録がある県だけで作り直す
function updateFilterOptions() {
  const select = $('filter-pref');
  const current = select.value;

  const counts = {};
  for (const r of records) {
    counts[r.pref] = (counts[r.pref] || 0) + 1;
  }

  select.length = 1; // 先頭の「すべての県」だけ残す
  select.options[0].textContent = `すべての県（${records.length}）`;
  for (const pref of PREFECTURES) {
    if (counts[pref]) {
      select.add(new Option(`${pref}（${counts[pref]}）`, pref));
    }
  }
  select.value = counts[current] ? current : '';
}

function render() {
  updateFilterOptions();

  const pref = $('filter-pref').value;
  const shown = records
    .filter((r) => !pref || r.pref === pref)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  for (const url of listUrls) URL.revokeObjectURL(url);
  listUrls = [];

  const list = $('list');
  list.replaceChildren();

  for (const r of shown) {
    const url = URL.createObjectURL(r.thumb);
    listUrls.push(url);

    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `
      <button type="button">
        <img alt="" loading="lazy">
        <span class="card-info">
          <span class="card-name"></span>
          <span class="card-place"></span>
          <span class="card-date"></span>
        </span>
      </button>`;
    li.querySelector('img').src = url;
    li.querySelector('.card-name').textContent = r.name;
    li.querySelector('.card-place').textContent = formatPlace(r);
    li.querySelector('.card-date').textContent = formatDate(r.date);
    li.querySelector('button').addEventListener('click', () => openDetail(r.id));
    list.append(li);
  }

  $('empty').hidden = records.length > 0;
  $('summary').textContent = records.length ? `${shown.length}件の記録` : '';
}

// ===== 追加・編集フォーム =====

function openForm(record) {
  const last = loadLastPlace();
  editingId = record ? record.id : null;
  pendingPhoto = record ? { photo: record.photo, thumb: record.thumb } : null;

  $('form-title').textContent = record ? '記録を編集' : 'ごはんを記録';
  $('name-input').value = record ? record.name : '';
  $('pref-input').value = record ? record.pref : (last.pref || '');
  $('city-input').value = record ? record.city : (last.city || '');
  $('date-input').value = record ? record.date : today();
  $('memo-input').value = record ? record.memo : '';
  showPreview(pendingPhoto && pendingPhoto.photo);

  $('form-dialog').showModal();
}

$('photo-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  event.target.value = ''; // 同じ写真をもう一度選んでも反応するように
  if (!file) return;

  try {
    const img = await loadImage(file);
    pendingPhoto = {
      photo: await shrinkImage(img, PHOTO_MAX_SIZE, 0.85),
      thumb: await shrinkImage(img, THUMB_MAX_SIZE, 0.8),
    };
    showPreview(pendingPhoto.photo);
  } catch {
    alert('この写真は読み込めませんでした。別の写真を試してください。');
  }
});

$('record-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!pendingPhoto) {
    alert('写真をえらんでください。');
    return;
  }

  const old = records.find((r) => r.id === editingId);
  const record = {
    id: editingId || newId(),
    photo: pendingPhoto.photo,
    thumb: pendingPhoto.thumb,
    name: $('name-input').value.trim(),
    pref: $('pref-input').value,
    city: $('city-input').value.trim(),
    date: $('date-input').value,
    memo: $('memo-input').value.trim(),
    createdAt: old ? old.createdAt : Date.now(),
  };

  try {
    await recordStore.save(record);
  } catch {
    alert('保存できませんでした。端末の空き容量を確認してください。');
    return;
  }

  records = records.filter((r) => r.id !== record.id).concat(record);
  saveLastPlace(record.pref, record.city);
  $('form-dialog').close();
  render();
});

$('cancel-btn').addEventListener('click', () => $('form-dialog').close());

$('form-dialog').addEventListener('close', () => {
  showPreview(null);
  pendingPhoto = null;
});

// ===== 詳細表示 =====

function openDetail(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) return;
  viewingId = id;

  detailUrl = URL.createObjectURL(r.photo);
  $('detail-photo').src = detailUrl;
  $('detail-name').textContent = r.name;
  $('detail-place').textContent = formatPlace(r);
  $('detail-date').textContent = formatDate(r.date);
  $('detail-memo').textContent = r.memo;

  $('detail-dialog').showModal();
}

$('detail-dialog').addEventListener('close', () => {
  if (detailUrl) URL.revokeObjectURL(detailUrl);
  detailUrl = null;
});

// 写真の外側（暗い部分）をタップしても閉じる
$('detail-dialog').addEventListener('click', (event) => {
  if (event.target === $('detail-dialog')) $('detail-dialog').close();
});

$('close-btn').addEventListener('click', () => $('detail-dialog').close());

$('edit-btn').addEventListener('click', () => {
  const r = records.find((rec) => rec.id === viewingId);
  $('detail-dialog').close();
  openForm(r);
});

$('delete-btn').addEventListener('click', async () => {
  if (!confirm('この記録を削除しますか？（元に戻せません）')) return;

  try {
    await recordStore.remove(viewingId);
  } catch {
    alert('削除できませんでした。');
    return;
  }

  records = records.filter((r) => r.id !== viewingId);
  $('detail-dialog').close();
  render();
});

// ===== その他の操作 =====

$('add-btn').addEventListener('click', () => openForm(null));
$('filter-pref').addEventListener('change', render);

// ===== アプリの起動 =====

async function init() {
  for (const pref of PREFECTURES) {
    $('pref-input').add(new Option(pref, pref));
  }

  try {
    records = await recordStore.getAll();
  } catch {
    alert('記録を読み込めませんでした。');
  }
  render();

  // ブラウザに「このデータを勝手に消さないで」とお願いする
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
  }
}

init();
