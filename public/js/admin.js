document.addEventListener('DOMContentLoaded', () => {
  loadAdminStats();
  loadAdminUsers();

  const searchInput = document.getElementById('adminUserSearch');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadAdminUsers();
      }, 300);
    });
  }

  const statusFilter = document.getElementById('adminStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadAdminUsers();
    });
  }
});

async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) throw new Error('Cannot load admin stats');
    const data = await res.json();

    document.getElementById('adminTotalUsers').textContent = data.totalUsers;
    document.getElementById('adminTotalActivities').textContent = data.totalActivities;
    document.getElementById('adminActiveUsers').textContent = data.activeUsers;
    document.getElementById('adminAvgPerUser').textContent = data.avgActivitiesPerUser;

    // Render Category Distribution Table/List
    const catContainer = document.getElementById('adminCategoryList');
    if (catContainer) {
      if (data.categories.length === 0) {
        catContainer.innerHTML = '<p class="text-muted">ยังไม่มีข้อมูลกิจกรรม</p>';
      } else {
        let html = '<ul class="list-group list-group-flush">';
        data.categories.forEach(c => {
          const catInfo = categoryMap[c.category] || categoryMap.other;
          html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span><i class="bi ${catInfo.icon} me-2"></i>${catInfo.label}</span>
              <span class="badge bg-primary rounded-pill">${c.count} รายการ</span>
            </li>
          `;
        });
        html += '</ul>';
        catContainer.innerHTML = html;
      }
    }
  } catch (err) {
    console.error('Error loading admin stats:', err);
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTbody');
  if (!tbody) return;

  const searchVal = document.getElementById('adminUserSearch')?.value || '';
  const statusVal = document.getElementById('adminStatusFilter')?.value || '';

  try {
    const queryParams = new URLSearchParams();
    if (searchVal.trim()) queryParams.append('search', searchVal.trim());
    if (statusVal.trim()) queryParams.append('status', statusVal.trim());

    const res = await fetch(`/api/admin/users?${queryParams.toString()}`);
    if (!res.ok) throw new Error('Cannot load users');
    const users = await res.json();

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">ไม่พบข้อมูลผู้ใช้ที่ค้นหา</td></tr>';
      return;
    }

    let html = '';
    users.forEach(u => {
      const isSelf = u.username === 'admin';
      const statusBadge = u.status === 'active' 
        ? '<span class="badge bg-success-subtle text-success border border-success">ใช้งานปกติ</span>' 
        : '<span class="badge bg-danger-subtle text-danger border border-danger">ระงับการใช้งาน</span>';

      const toggleAction = u.status === 'active' ? 'inactive' : 'active';
      const toggleBtnClass = u.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success';
      const toggleBtnText = u.status === 'active' ? 'ระงับบัญชี' : 'เปิดใช้งาน';

      html += `
        <tr>
          <td><strong>${escapeHtml(u.username)}</strong></td>
          <td>${escapeHtml(u.full_name)}</td>
          <td><span class="badge ${u.role === 'admin' ? 'bg-danger-subtle text-danger border border-danger' : 'bg-primary-subtle text-primary border border-primary'}">${u.role.toUpperCase()}</span></td>
          <td>${u.activity_count} กิจกรรม</td>
          <td>${statusBadge}</td>
          <td>
            ${isSelf ? '<small class="text-muted">บัญชีปัจจุบัน</small>' : `
              <button class="btn btn-sm ${toggleBtnClass}" onclick="toggleUserStatus('${u.id}', '${toggleAction}')">
                ${toggleBtnText}
              </button>
            `}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (err) {
    console.error('Error loading admin users:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center py-3">เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้</td></tr>';
  }
}

async function toggleUserStatus(userId, nextStatus) {
  if (!confirm(`คุณต้องการ${nextStatus === 'inactive' ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'} ผู้ใช้นี้ใช่หรือไม่?`)) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      loadAdminStats();
      loadAdminUsers();
    } else {
      showToast(data.error || 'ไม่สามารถเปลี่ยนสถานะได้', 'danger');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'danger');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
