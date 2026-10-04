const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  photoPreview.src = URL.createObjectURL(file);
});
