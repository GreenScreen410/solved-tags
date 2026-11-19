import { META_TAGS } from '../../utils/constants.js';

const tags = document.getElementById('tags');
const toggle = document.getElementById('enable-toggle');
const error = document.getElementById('storage-error');

for (const { ko, color, svg } of Object.values(META_TAGS)) {
  const tag = document.createElement('li');
  tag.style.setProperty('--tag-color', color);
  tag.innerHTML = svg;
  tag.firstElementChild.setAttribute('aria-hidden', 'true');
  tag.append(ko);
  tags.append(tag);
}

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

async function loadSetting() {
  try {
    const settings = await browser.storage.local.get('enabled');
    toggle.checked = settings.enabled !== false;
    toggle.disabled = false;
  } catch {
    showError('설정을 읽지 못했습니다. 팝업을 다시 열어 주세요.');
  }
}

toggle.addEventListener('change', async () => {
  const enabled = toggle.checked;
  toggle.disabled = true;
  showError('');
  try {
    await browser.storage.local.set({ enabled });
  } catch {
    toggle.checked = !enabled;
    showError('설정을 저장하지 못했습니다. 다시 시도해 주세요.');
  } finally {
    toggle.disabled = false;
  }
});

loadSetting();
