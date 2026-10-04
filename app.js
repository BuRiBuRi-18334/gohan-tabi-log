const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  photoPreview.src = URL.createObjectURL(file);
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

// 保存ボタンを押したとき（本当の保存はレッスン8で作ります）
const recordForm = document.getElementById('record-form');
recordForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('name-input').value;
  alert(`${prefInput.value} ${cityInput.value} の「${name}」を記録します`);
});
// ===== 保存した記録 =====
let records = [];
const recordCount = document.getElementById('record-count');

function showCount() {
  recordCount.textContent = `保存した記録：${records.length}件`;
}

// アプリを開いたときに、倉庫から記録を全部出してくる
async function init() {
  records = await recordStore.getAll();
  showCount();
}

init();
