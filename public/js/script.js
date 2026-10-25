// Helper to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

// Toast notification trigger
function showToast(message, type = 'info') {
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }

  const bgClass = type === 'success' ? 'bg-success text-white' :
                  type === 'danger' ? 'bg-danger text-white' :
                  type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white';

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${bgClass} border-0 shadow`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
  bsToast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

// Theme Management (Light / Dark mode persisted in Cookie)
function initTheme() {
  const savedTheme = getCookie('user_theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);
  updateThemeButton(savedTheme);

  const toggleBtn = document.getElementById('btnThemeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-bs-theme', nextTheme);
      updateThemeButton(nextTheme);

      // Persist to server cookie via API
      try {
        await fetch('/api/preferences/theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: nextTheme })
        });
      } catch (e) {
        console.error('Failed to sync theme cookie:', e);
      }
    });
  }
}

function updateThemeButton(theme) {
  const toggleBtn = document.getElementById('btnThemeToggle');
  if (!toggleBtn) return;
  if (theme === 'dark') {
    toggleBtn.innerHTML = '☀️ โหมดสว่าง';
    toggleBtn.className = 'btn btn-outline-warning btn-sm';
  } else {
    toggleBtn.innerHTML = '🌙 โหมดมืด';
    toggleBtn.className = 'btn btn-outline-secondary btn-sm';
  }
}

// Global Logout Handler
async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      window.location.href = '/login';
    } else {
      showToast('ไม่สามารถออกจากระบบได้', 'danger');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'danger');
  }
}

// Category labels and badges
const categoryMap = {
  study: { label: 'การเรียน', badgeClass: 'badge-cat-study', icon: 'bi-book' },
  work: { label: 'การทำงาน', badgeClass: 'badge-cat-work', icon: 'bi-briefcase' },
  health: { label: 'สุขภาพ/กีฬา', badgeClass: 'badge-cat-health', icon: 'bi-heart-pulse' },
  leisure: { label: 'พักผ่อน/ส่วนตัว', badgeClass: 'badge-cat-leisure', icon: 'bi-cup-hot' },
  other: { label: 'ทั่วไป/อื่น ๆ', badgeClass: 'badge-cat-other', icon: 'bi-tag' }
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const logoutBtns = document.querySelectorAll('.btn-logout');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
});
