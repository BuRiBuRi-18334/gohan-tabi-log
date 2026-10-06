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
function updateCityOptions() {
  cityInput.length = 1;
  const data = CITY_DATA[prefInput.value];
  if (!data) return;
  for (const city of data.cities) {
    cityInput.add(new Option(city.name, city.name));
  }
}

// 県を選んだら、市町村のリストを作り直す
prefInput.addEventListener('change', updateCityOptions);
// ===== トップ3 =====
// 1位から順に、記録のIDを並べた名簿（最大3つ）。ブラウザの localStorage にしまっておく
let top3 = JSON.parse(localStorage.getItem('top3') || '[]');
const MEDALS = ['', '🥇', '🥈', '🥉'];

// 記録の順位を調べる（1〜3。トップ3でなければ 0）
function getRank(record) {
  return top3.indexOf(record.id) + 1;
}

// 記録の順位を決める（0 なら順位を外す）。ほかの記録は1つずつずれる
function setRank(id, rank) {
  top3 = top3.filter((x) => x !== id);
  if (rank > 0) {
    top3.splice(rank - 1, 0, id);
  }
  top3 = top3.slice(0, 3);
  localStorage.setItem('top3', JSON.stringify(top3));
}

// ===== 保存した記録 =====
let records = [];
const recordCount = document.getElementById('record-count');

function showCount() {
  recordCount.textContent = `保存した記録：${records.length}件`;
}
// ===== 県で絞り込む =====
const filterPref = document.getElementById('filter-pref');

// 記録がある県だけで、絞り込みのリストを作り直す（件数つき）
function updateFilterOptions() {
  const current = filterPref.value;

  // 県ごとに記録の数を数える
  const counts = {};
  for (const record of records) {
    counts[record.pref] = (counts[record.pref] || 0) + 1;
  }

  filterPref.length = 1;
  filterPref.options[0].textContent = `すべての県（${records.length}）`;
  for (const pref of Object.keys(CITY_DATA)) {
    if (counts[pref]) {
      filterPref.add(new Option(`${pref}（${counts[pref]}）`, pref));
    }
  }
  filterPref.value = counts[current] ? current : '';
}

filterPref.addEventListener('change', renderList);

// 一覧を表示する
const list = document.getElementById('list');

function renderList() {
  list.innerHTML = '';
    updateFilterOptions();
  records.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  for (const record of records) {
        if (filterPref.value && record.pref !== filterPref.value) continue;
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
        const rank = getRank(record);
    if (rank > 0) {
      const medal = document.createElement('span');
      medal.className = 'medal';
      medal.textContent = MEDALS[rank];
      li.append(medal);
    }
        li.addEventListener('click', () => openDetail(record));
    list.append(li);
  }
    if (showingMap) renderMap();
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
const formTitle = document.getElementById('form-title');
let editingRecord = null; // 編集中の記録（新しく記録するときは null）

// フォームを開く（記録を渡すと編集、null なら新しい記録）
function openForm(record) {
  editingRecord = record;
  if (record) {
    formTitle.textContent = '記録を編集';
    selectedPhoto = { photo: record.photo, thumb: record.thumb };
    photoPreview.src = URL.createObjectURL(record.photo);
    nameInput.value = record.name;
    prefInput.value = record.pref;
    updateCityOptions();
    cityInput.value = record.city;
    dateInput.value = record.date;
    memoInput.value = record.memo;
  } else {
    formTitle.textContent = 'ごはんを記録';
    dateInput.value = new Date().toLocaleDateString('sv-SE');
  }
    rankInput.value = record ? getRank(record) : 0;
  formDialog.showModal();
}

document.getElementById('add-btn').addEventListener('click', () => {
  openForm(null);
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  formDialog.close();
});

// フォームを閉じたら、写真・料理名・メモを空に戻す（県・市町村はそのまま）
formDialog.addEventListener('close', () => {
  selectedPhoto = null;
  photoInput.value = '';
  photoPreview.removeAttribute('src');
  nameInput.value = '';
  memoInput.value = '';
});

// ===== 保存ボタンを押したとき =====
const recordForm = document.getElementById('record-form');
const nameInput = document.getElementById('name-input');
const memoInput = document.getElementById('memo-input');
const rankInput = document.getElementById('rank-input');

recordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!selectedPhoto) {
    alert('写真を選んでください');
    return;
  }

  // 記録1件分を、1つの箱にまとめる
  const record = {
        id: editingRecord ? editingRecord.id : Date.now(),
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
    setRank(record.id, Number(rankInput.value));
  records = records.filter((r) => r.id !== record.id);
  records.push(record);
  showCount();
    renderList();
    formDialog.close();
});
// ===== 詳細のポップアップ =====
const detailDialog = document.getElementById('detail-dialog');
let viewingRecord = null; // 詳細を表示している記録

function openDetail(record) {
  viewingRecord = record;
  document.getElementById('detail-photo').src = URL.createObjectURL(record.photo);
  document.getElementById('detail-name').textContent = MEDALS[getRank(record)] + record.name;
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
  setRank(viewingRecord.id, 0);
  records = records.filter((r) => r.id !== viewingRecord.id);
  showCount();
  renderList();
  detailDialog.close();
});

document.getElementById('edit-btn').addEventListener('click', () => {
  detailDialog.close();
  openForm(viewingRecord);
});

// ===== 一覧と地図の切り替え =====
const tabList = document.getElementById('tab-list');
const tabMap = document.getElementById('tab-map');
const mapBox = document.getElementById('map');
let showingMap = false; // 地図を表示しているかどうか

function showView(mapMode) {
  showingMap = mapMode;
  list.hidden = mapMode;
  mapBox.hidden = !mapMode;
  tabList.classList.toggle('active', !mapMode);
  tabMap.classList.toggle('active', mapMode);
  if (mapMode) renderMap();
}

tabList.addEventListener('click', () => showView(false));
tabMap.addEventListener('click', () => showView(true));

// ===== 地図 =====
let map = null; // 地図（最初に開いたときに作る）
let markerLayer = null; // 地図の上に置いた写真のまとまり

// 記録の位置（緯度・経度）を調べる。市町村を選んでいなければ県庁所在地
function getLatLng(record) {
  const data = CITY_DATA[record.pref];
  const cityName = record.city || data.capital;
  const city = data.cities.find((c) => c.name === cityName);
  return [city.lat, city.lng];
}

// 地図に置く、丸い写真の目印を作る（トップ3は大きく、枠の色とメダル付き）
function photoIcon(record, rank) {
  const size = rank > 0 ? 64 : 48;
  return L.divIcon({
    html: `<img src="${URL.createObjectURL(record.thumb)}" alt=""><span class="medal">${MEDALS[rank]}</span>`,
    className: `photo-marker rank-${rank}`,
    iconSize: [size, size],
  });
}

function renderMap() {
  // インターネットにつながっていなくて、地図の部品を読み込めなかったとき
  if (typeof L === 'undefined') {
    mapBox.textContent = '地図を表示するには、インターネットにつながっている必要があります';
    return;
  }

  // 最初に開いたときだけ、地図を作る
  if (!map) {
    map = L.map(mapBox, { minZoom: 4, maxZoom: 18 });
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
    }).addTo(map);
  }

  // 隠れていた地図を表示したときは、大きさを測り直す
  map.invalidateSize();
  
  // 前に置いた写真を片付けてから、置き直す
  if (markerLayer) markerLayer.remove();
  markerLayer = L.layerGroup().addTo(map);

  // 近くの写真をまとめる袋（トップ3は入れない）
  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyDistanceMultiplier: 2,
    iconCreateFunction: (group) => L.divIcon({
      html: `<span>${group.getChildCount()}</span>`,
      className: 'photo-cluster',
      iconSize: [44, 44],
    }),
  });
  markerLayer.addLayer(cluster);

  const places = [];
  for (const record of records) {
    if (filterPref.value && record.pref !== filterPref.value) continue;
    const place = getLatLng(record);
        const rank = getRank(record);
    const marker = L.marker(place, {
      icon: photoIcon(record, rank),
      zIndexOffset: rank > 0 ? 10000 - rank : 0,
    });
    marker.on('click', () => openDetail(record));
    if (rank > 0) {
      markerLayer.addLayer(marker); // トップ3はまとめずに、いつも見えるようにする
    } else {
      cluster.addLayer(marker);
    }
    places.push(place);
  }

  // 写真が全部入るように、地図の範囲を合わせる
  if (places.length > 0) {
    map.fitBounds(places, { padding: [40, 40], maxZoom: 12 });
  } else {
    map.setView([36.5, 137.5], 5);
  }
}
