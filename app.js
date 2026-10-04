const addBtn = document.getElementById('add-btn');
const message = document.getElementById('message');
let count = 0;

addBtn.addEventListener('click', () => {
  count = count + 1;
  message.textContent = `ボタンを${count}回押しました`;
});
const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  photoPreview.src = URL.createObjectURL(file);
});
