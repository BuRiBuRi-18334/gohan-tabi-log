const addBtn = document.getElementById('add-btn');
const message = document.getElementById('message');
let count = 0;

addBtn.addEventListener('click', () => {
  count = count + 1;
  message.textContent = `ボタンを${count}回押しました`;
});
