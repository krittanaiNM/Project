let currentSelectedDate = new Date().toISOString().split('T')[0];
let currentCategoryFilter = 'all';
let currentDayStart = getCookie('pref_day_start') || '08:00';
let currentDayEnd = getCookie('pref_day_end') || '22:00';

let activityModalInstance = null;
let quickFinderModalInstance = null;
let profileModalInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Bootstrap Modals
  const actModalEl = document.getElementById('activityModal');
  if (actModalEl) activityModalInstance = new bootstrap.Modal(actModalEl);

  const quickModalEl = document.getElementById('quickFinderModal');
  if (quickModalEl) quickFinderModalInstance = new bootstrap.Modal(quickModalEl);

  const profileModalEl = document.getElementById('profileModal');
  if (profileModalEl) profileModalInstance = new bootstrap.Modal(profileModalEl);

  // Load user profile
  await loadCurrentUser();

  // Load cookies into profile hours inputs
  const inputDayStart = document.getElementById('prefDayStart');
  const inputDayEnd = document.getElementById('prefDayEnd');
  if (inputDayStart) inputDayStart.value = currentDayStart;
  if (inputDayEnd) inputDayEnd.value = currentDayEnd;

  // Setup Date picker
  const dateInput = document.getElementById('currentDateInput');
  if (dateInput) {
    dateInput.value = currentSelectedDate;
    dateInput.addEventListener('change', (e) => {
      currentSelectedDate = e.target.value;
      refreshAll();
    });
  }

  // Quick Date Navigation
  const btnToday = document.getElementById('btnToday');
  if (btnToday) {
    btnToday.addEventListener('click', () => {
      currentSelectedDate = new Date().toISOString().split('T')[0];
      if (dateInput) dateInput.value = currentSelectedDate;
      refreshAll();
    });
  }

  const btnTomorrow = document.getElementById('btnTomorrow');
  if (btnTomorrow) {
    btnTomorrow.addEventListener('click', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      currentSelectedDate = tomorrow.toISOString().split('T')[0];
      if (dateInput) dateInput.value = currentSelectedDate;
      refreshAll();
    });
  }

  // View toggle (Daily vs Weekly)
  const btnViewDaily = document.getElementById('btnViewDaily');
  const btnViewWeekly = document.getElementById('btnViewWeekly');
  const weeklySection = document.getElementById('weeklyViewSection');

  if (btnViewDaily && btnViewWeekly && weeklySection) {
    btnViewDaily.addEventListener('click', () => {
      btnViewDaily.classList.add('btn-primary', 'active');
      btnViewDaily.classList.remove('btn-outline-primary');
      btnViewWeekly.classList.remove('btn-primary', 'active');
      btnViewWeekly.classList.add('btn-outline-primary');
      weeklySection.classList.add('d-none');
    });

    btnViewWeekly.addEventListener('click', () => {
      btnViewWeekly.classList.add('btn-primary', 'active');
      btnViewWeekly.classList.remove('btn-outline-primary');
      btnViewDaily.classList.remove('btn-primary', 'active');
      btnViewDaily.classList.add('btn-outline-primary');
      weeklySection.classList.remove('d-none');
      loadWeeklyOverview();
    });
  }

  // Export CSV
  const btnExportCsv = document.getElementById('btnExportCsv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      window.location.href = `/api/activities/export/csv?date=${currentSelectedDate}`;
    });
  }

  // Category Filter Pills
  const filterBtns = document.querySelectorAll('.btn-filter-cat');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active', 'btn-primary'));
      filterBtns.forEach(b => b.classList.add('btn-outline-secondary'));

      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-outline-secondary');

      currentCategoryFilter = btn.getAttribute('data-cat');
      loadActivities();
    });
  });

  // Add Activity Button
  const btnOpenAdd = document.getElementById('btnOpenAddModal');
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', () => {
      openActivityModal('add');
    });
  }

  // Form Submissions
  const activityForm = document.getElementById('activityForm');
  if (activityForm) activityForm.addEventListener('submit', handleActivitySubmit);

  const quickFinderForm = document.getElementById('quickFinderForm');
  if (quickFinderForm) quickFinderForm.addEventListener('submit', handleQuickFinder);

  const formScheduleHours = document.getElementById('formScheduleHours');
  if (formScheduleHours) formScheduleHours.addEventListener('submit', handleSaveScheduleHours);

  const formUpdateProfile = document.getElementById('formUpdateProfile');
  if (formUpdateProfile) formUpdateProfile.addEventListener('submit', handleUpdateProfile);

  const formChangePassword = document.getElementById('formChangePassword');
  if (formChangePassword) formChangePassword.addEventListener('submit', handleChangePassword);

  // Initial load
  refreshAll();
});

// Refresh all components
function refreshAll() {
  updatePrintDateLabel();
  loadFreeTimeSummary();
  loadActivities();
}

function updatePrintDateLabel() {
  const label = document.getElementById('printDateLabel');
  if (label) {
    label.textContent = `วันที่: ${currentSelectedDate}`;
  }
}

// -------------------------------------------------------------
// Load User Info
// -------------------------------------------------------------
async function loadCurrentUser() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      const userDisplay = document.getElementById('userDisplayName');
      if (userDisplay) userDisplay.textContent = data.user.full_name;

      const profileNameInput = document.getElementById('profileFullName');
      if (profileNameInput) profileNameInput.value = data.user.full_name;
    }
  } catch (e) {
    console.error('Failed to load user info:', e);
  }
}

// -------------------------------------------------------------
// Free Time Calculation & Summary
// -------------------------------------------------------------
async function loadFreeTimeSummary() {
  try {
    const res = await fetch(`/api/activities/free-time?date=${currentSelectedDate}&day_start=${currentDayStart}&day_end=${currentDayEnd}`);
    if (!res.ok) throw new Error('Cannot load calculation');
    const data = await res.json();

    // Update KPI badges
    document.getElementById('statTotalActivities').textContent = data.summary.total_activities;
    document.getElementById('statBusyTime').textContent = data.summary.formatted_busy;
    document.getElementById('statFreeTime').textContent = data.summary.formatted_free;
    document.getElementById('statFreePercent').textContent = `${data.summary.free_percentage}%`;

    const spanLabel = document.getElementById('calcSpanLabel');
    if (spanLabel) {
      spanLabel.textContent = `(คำนวณจากช่วงเวลา ${currentDayStart} - ${currentDayEnd})`;
    }

    // Dynamic Progress Bar
    const progressBar = document.getElementById('freeTimeProgressBar');
    if (progressBar) {
      progressBar.style.width = `${data.summary.free_percentage}%`;
      progressBar.setAttribute('aria-valuenow', data.summary.free_percentage);
      progressBar.className = `progress-bar ${data.summary.free_percentage > 40 ? 'bg-success' : 'bg-warning'}`;
    }

    // Render Free Slots Cards
    renderFreeSlots(data.free_slots);

    // Render Smart Recommendations
    renderSmartSuggestions(data.recommendations);

    // Render Visual 24-Hour Timeline Bar
    renderVisualTimeline(data.free_slots);
  } catch (err) {
    console.error('Error loading free time:', err);
  }
}

function renderFreeSlots(slots) {
  const container = document.getElementById('freeSlotsContainer');
  if (!container) return;

  if (slots.length === 0) {
    container.innerHTML = `
      <div class="text-muted p-3 text-center">
        <i class="bi bi-clock-history fs-3 d-block mb-1 text-secondary"></i>
        ไม่มีเวลาว่างเหลือในช่วงเวลา ${currentDayStart} - ${currentDayEnd}
      </div>
    `;
    return;
  }

  let html = '<div class="row g-2">';
  slots.forEach(slot => {
    html += `
      <div class="col-12 col-md-6">
        <div class="slot-pill-card">
          <div>
            <div class="fw-bold text-success">
              <i class="bi bi-check-circle-fill me-1"></i> ${slot.start_time} - ${slot.end_time}
            </div>
            <small class="text-muted">ว่าง: ${slot.formatted_duration}</small>
          </div>
          <button class="btn btn-sm btn-outline-success" onclick="useFreeSlot('${slot.start_time}', '${slot.end_time}')">
            <i class="bi bi-plus"></i> แทรกกิจกรรม
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}

function renderSmartSuggestions(recommendations) {
  const container = document.getElementById('smartSuggestionsContainer');
  if (!container) return;

  let html = '';
  recommendations.forEach(r => {
    if (r.available_count > 0) {
      html += `
        <span class="badge bg-success-subtle text-success border border-success p-2 me-2 mb-2">
          <i class="bi bi-lightning-charge me-1"></i> ว่าง ${r.requested_minutes} นาที (${r.available_count} ช่วง)
          ${r.sample_slot ? `<span class="d-block text-muted small mt-1">เช่น ${r.sample_slot}</span>` : ''}
        </span>
      `;
    }
  });

  if (!html) {
    html = '<small class="text-muted">ไม่มีช่วงเวลาว่างที่ต่อเนื่องเกิน 30 นาที</small>';
  }

  container.innerHTML = html;
}

// -------------------------------------------------------------
// Visual Timeline Bar Rendering (DOM Manipulation)
// -------------------------------------------------------------
async function renderVisualTimeline(freeSlots) {
  const track = document.getElementById('visualTimelineTrack');
  const markers = document.getElementById('timelineHourMarkers');
  if (!track) return;

  track.innerHTML = '';

  const dayStartMins = timeToMinutes(currentDayStart);
  const dayEndMins = timeToMinutes(currentDayEnd);
  const totalSpan = dayEndMins - dayStartMins;

  // Update hour markers
  if (markers) {
    let markHtml = '';
    const step = 2; // Every 2 hours
    const startHour = Math.floor(dayStartMins / 60);
    const endHour = Math.ceil(dayEndMins / 60);
    for (let h = startHour; h <= endHour; h += step) {
      const timeStr = `${h.toString().padStart(2, '0')}:00`;
      markHtml += `<span>${timeStr}</span>`;
    }
    markers.innerHTML = markHtml;
  }

  // 1. Render Free Slot Blocks
  freeSlots.forEach(slot => {
    const s = Math.max(dayStartMins, timeToMinutes(slot.start_time));
    const e = Math.min(dayEndMins, timeToMinutes(slot.end_time));
    if (e > s) {
      const leftPct = ((s - dayStartMins) / totalSpan) * 100;
      const widthPct = ((e - s) / totalSpan) * 100;

      const block = document.createElement('div');
      block.className = 'timeline-block timeline-block-free';
      block.style.left = `${leftPct}%`;
      block.style.width = `${widthPct}%`;
      block.title = `เวลาว่าง: ${slot.start_time} - ${slot.end_time} (${slot.formatted_duration}) - คลิกเพื่อแทรกกิจกรรม`;
      block.innerHTML = `<span class="d-none d-sm-inline">ว่าง ${slot.formatted_duration}</span>`;

      block.addEventListener('click', () => {
        useFreeSlot(slot.start_time, slot.end_time);
      });

      track.appendChild(block);
    }
  });

  // 2. Fetch and Render Busy Activity Blocks
  try {
    const res = await fetch(`/api/activities?date=${currentSelectedDate}`);
    const activities = await res.json();

    const catBg = {
      study: '#3b82f6',
      work: '#8b5cf6',
      health: '#10b981',
      leisure: '#f59e0b',
      other: '#6b7280'
    };

    activities.forEach(act => {
      const s = Math.max(dayStartMins, timeToMinutes(act.start_time));
      const e = Math.min(dayEndMins, timeToMinutes(act.end_time));
      if (e > s) {
        const leftPct = ((s - dayStartMins) / totalSpan) * 100;
        const widthPct = ((e - s) / totalSpan) * 100;

        const block = document.createElement('div');
        block.className = `timeline-block`;
        block.style.left = `${leftPct}%`;
        block.style.width = `${widthPct}%`;
        block.style.backgroundColor = catBg[act.category] || '#3b82f6';
        block.title = `${act.title} (${act.start_time} - ${act.end_time}) - คลิกเพื่อแก้ไข`;
        block.innerHTML = `<span>${escapeHtml(act.title)}</span>`;

        block.addEventListener('click', () => {
          openEditActivity(act.id);
        });

        track.appendChild(block);
      }
    });
  } catch (err) {
    console.error('Error rendering visual timeline activities:', err);
  }
}

// -------------------------------------------------------------
// Weekly 7-Day Overview
// -------------------------------------------------------------
async function loadWeeklyOverview() {
  const container = document.getElementById('weeklyDaysContainer');
  if (!container) return;

  try {
    const res = await fetch(`/api/activities/week-summary?start_date=${currentSelectedDate}&day_start=${currentDayStart}&day_end=${currentDayEnd}`);
    const data = await res.json();

    let html = '';
    data.days.forEach(d => {
      const isSelected = d.date === currentSelectedDate;
      const cardClass = isSelected ? 'weekly-day-card active border-primary' : 'weekly-day-card';
      const badgeClass = d.free_percentage > 50 ? 'bg-success' : d.free_percentage > 25 ? 'bg-primary' : 'bg-warning text-dark';

      html += `
        <div class="col-6 col-md-3 col-lg">
          <div class="${cardClass}" onclick="selectDateFromWeek('${d.date}')">
            <div class="fw-bold text-truncate">${d.day_name}</div>
            <small class="text-muted d-block mb-1">${d.short_date}</small>
            <span class="badge ${badgeClass} mb-1">ว่าง ${d.free_percentage}%</span>
            <div class="small text-muted">${d.total_activities} กิจกรรม</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error('Error loading weekly overview:', err);
    container.innerHTML = '<div class="alert alert-danger">ไม่สามารถโหลดข้อมูลสัปดาห์ได้</div>';
  }
}

function selectDateFromWeek(dateStr) {
  currentSelectedDate = dateStr;
  const dateInput = document.getElementById('currentDateInput');
  if (dateInput) dateInput.value = dateStr;
  refreshAll();
  loadWeeklyOverview();
}

// -------------------------------------------------------------
// Quick Presets
// -------------------------------------------------------------
function applyPreset(title, durationMins, category, priority) {
  fetch(`/api/activities/free-time?date=${currentSelectedDate}&day_start=${currentDayStart}&day_end=${currentDayEnd}`)
    .then(res => res.json())
    .then(data => {
      const matchSlot = data.free_slots.find(s => s.duration_minutes >= durationMins);
      let startTime = currentDayStart;
      let endTime = minutesToTime(timeToMinutes(currentDayStart) + durationMins);

      if (matchSlot) {
        startTime = matchSlot.start_time;
        endTime = minutesToTime(timeToMinutes(startTime) + durationMins);
      }

      openActivityModal('add');
      document.getElementById('actTitle').value = title;
      document.getElementById('actDate').value = currentSelectedDate;
      document.getElementById('actStartTime').value = startTime;
      document.getElementById('actEndTime').value = endTime;
      document.getElementById('actCategory').value = category;
      document.getElementById('actPriority').value = priority;
    })
    .catch(() => {
      openActivityModal('add');
      document.getElementById('actTitle').value = title;
      document.getElementById('actCategory').value = category;
      document.getElementById('actPriority').value = priority;
    });
}

// -------------------------------------------------------------
// Activity List (Timeline)
// -------------------------------------------------------------
async function loadActivities() {
  const listContainer = document.getElementById('activityTimelineList');
  if (!listContainer) return;

  try {
    const res = await fetch(`/api/activities?date=${currentSelectedDate}&category=${currentCategoryFilter}`);
    if (!res.ok) throw new Error('Cannot load activities');
    const activities = await res.json();

    if (activities.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-calendar2-check fs-1 text-secondary d-block mb-2"></i>
          <h5>ยังไม่มีกิจกรรมสำหรับวันนี้</h5>
          <p class="small">คลิกปุ่ม <strong>"เพิ่มกิจกรรมใหม่"</strong> หรือเลือกปุ่ม <strong>"กิจกรรมด่วนยอดนิยม"</strong> ด้านบนเพื่อเริ่มบันทึก</p>
        </div>
      `;
      return;
    }

    let html = '';
    activities.forEach(act => {
      const cat = categoryMap[act.category] || categoryMap.other;
      const priorityBadge = act.priority === 'high' 
        ? '<span class="badge bg-danger-subtle text-danger border border-danger">ความสำคัญสูง</span>' 
        : act.priority === 'low' 
        ? '<span class="badge bg-secondary-subtle text-secondary border border-secondary">ความสำคัญต่ำ</span>' 
        : '<span class="badge bg-primary-subtle text-primary border border-primary">ปกติ</span>';

      html += `
        <div class="activity-item-card cat-${act.category}">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <span class="badge ${cat.badgeClass} me-1"><i class="bi ${cat.icon} me-1"></i>${cat.label}</span>
              ${priorityBadge}
            </div>
            <div class="no-print">
              <button class="btn btn-sm btn-outline-secondary me-1" onclick="openEditActivity('${act.id}')" title="แก้ไข">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteActivity('${act.id}')" title="ลบ">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
          
          <h5 class="card-title mb-1 fw-bold">${escapeHtml(act.title)}</h5>
          
          <div class="text-primary fw-semibold mb-2">
            <i class="bi bi-clock me-1"></i> ${act.start_time} - ${act.end_time} น.
          </div>

          ${act.notes ? `<p class="text-muted small mb-0"><i class="bi bi-chat-left-text me-1"></i>${escapeHtml(act.notes)}</p>` : ''}
        </div>
      `;
    });

    listContainer.innerHTML = html;
  } catch (err) {
    console.error('Error fetching activities:', err);
    listContainer.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการโหลดกิจกรรม</div>';
  }
}

// -------------------------------------------------------------
// Modal Form Operations (Add / Edit)
// -------------------------------------------------------------
function openActivityModal(mode) {
  const form = document.getElementById('activityForm');
  const modalTitle = document.getElementById('activityModalLabel');
  const alertBox = document.getElementById('activityModalAlert');

  form.reset();
  alertBox.classList.add('d-none');

  if (mode === 'add') {
    modalTitle.innerHTML = '<i class="bi bi-plus-circle me-1"></i> เพิ่มกิจกรรมใหม่';
    document.getElementById('actId').value = '';
    document.getElementById('actDate').value = currentSelectedDate;
  }

  activityModalInstance.show();
}

async function openEditActivity(id) {
  try {
    const res = await fetch(`/api/activities?date=${currentSelectedDate}`);
    const list = await res.json();
    const act = list.find(a => a.id === id);

    if (!act) {
      showToast('ไม่พบข้อมูลกิจกรรมที่ต้องการแก้ไข', 'danger');
      return;
    }

    openActivityModal('edit');
    document.getElementById('activityModalLabel').innerHTML = '<i class="bi bi-pencil-square me-1"></i> แก้ไขกิจกรรม';
    document.getElementById('actId').value = act.id;
    document.getElementById('actTitle').value = act.title;
    document.getElementById('actDate').value = act.activity_date;
    document.getElementById('actStartTime').value = act.start_time;
    document.getElementById('actEndTime').value = act.end_time;
    document.getElementById('actCategory').value = act.category;
    document.getElementById('actPriority').value = act.priority;
    document.getElementById('actNotes').value = act.notes || '';
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม', 'danger');
  }
}

async function handleActivitySubmit(e) {
  e.preventDefault();
  const alertBox = document.getElementById('activityModalAlert');
  alertBox.classList.add('d-none');

  const id = document.getElementById('actId').value;
  const title = document.getElementById('actTitle').value.trim();
  const activity_date = document.getElementById('actDate').value;
  const start_time = document.getElementById('actStartTime').value;
  const end_time = document.getElementById('actEndTime').value;
  const category = document.getElementById('actCategory').value;
  const priority = document.getElementById('actPriority').value;
  const notes = document.getElementById('actNotes').value.trim();

  if (!title || !activity_date || !start_time || !end_time) {
    showAlert(alertBox, 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
    return;
  }

  if (start_time >= end_time) {
    showAlert(alertBox, 'เวลาเริ่มกิจกรรมต้องมาก่อนเวลาสิ้นสุดกิจกรรม');
    return;
  }

  const payload = { title, activity_date, start_time, end_time, category, priority, notes };
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/activities/${id}` : '/api/activities';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      activityModalInstance.hide();
      refreshAll();
    } else {
      showAlert(alertBox, data.error || 'ไม่สามารถบันทึกกิจกรรมได้');
    }
  } catch (err) {
    showAlert(alertBox, 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
}

async function deleteActivity(id) {
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้?')) return;

  try {
    const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('ลบกิจกรรมเรียบร้อยแล้ว', 'success');
      refreshAll();
    } else {
      showToast(data.error || 'ไม่สามารถลบกิจกรรมได้', 'danger');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'danger');
  }
}

function useFreeSlot(startTime, endTime) {
  openActivityModal('add');
  document.getElementById('actDate').value = currentSelectedDate;
  document.getElementById('actStartTime').value = startTime;
  document.getElementById('actEndTime').value = endTime;
}

// -------------------------------------------------------------
// Quick Slot Finder
// -------------------------------------------------------------
function handleQuickFinder(e) {
  e.preventDefault();
  const minsRequired = parseInt(document.getElementById('quickMinutes').value, 10);
  const resultContainer = document.getElementById('quickFinderResults');

  fetch(`/api/activities/free-time?date=${currentSelectedDate}&day_start=${currentDayStart}&day_end=${currentDayEnd}`)
    .then(res => res.json())
    .then(data => {
      const matchSlots = data.free_slots.filter(s => s.duration_minutes >= minsRequired);
      if (matchSlots.length === 0) {
        resultContainer.innerHTML = `
          <div class="alert alert-warning mb-0">
            <i class="bi bi-exclamation-triangle me-1"></i> ไม่พบช่วงเวลาว่างที่ติดต่อกันถึง ${minsRequired} นาทีในวันนี้
          </div>
        `;
      } else {
        let html = `<div class="list-group">`;
        matchSlots.forEach(s => {
          html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>${s.start_time} - ${s.end_time}</strong> (${s.formatted_duration})
              </div>
              <button class="btn btn-sm btn-success" onclick="quickApplySlot('${s.start_time}', ${minsRequired})">
                เลือกช่วงนี้
              </button>
            </div>
          `;
        });
        html += `</div>`;
        resultContainer.innerHTML = html;
      }
    })
    .catch(() => {
      resultContainer.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการค้นหา</div>';
    });
}

function quickApplySlot(startTime, durationMins) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMins = h * 60 + m + durationMins;
  const endH = Math.floor(totalMins / 60).toString().padStart(2, '0');
  const endM = (totalMins % 60).toString().padStart(2, '0');
  const endTime = `${endH}:${endM}`;

  quickFinderModalInstance.hide();
  useFreeSlot(startTime, endTime);
}

// -------------------------------------------------------------
// Profile & Preferences Handlers
// -------------------------------------------------------------
async function handleSaveScheduleHours(e) {
  e.preventDefault();
  const day_start = document.getElementById('prefDayStart').value;
  const day_end = document.getElementById('prefDayEnd').value;

  if (day_start >= day_end) {
    showToast('เวลาเริ่มวันต้องน้อยกว่าเวลาสิ้นสุดวัน', 'danger');
    return;
  }

  try {
    const res = await fetch('/api/preferences/schedule-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_start, day_end })
    });

    if (res.ok) {
      currentDayStart = day_start;
      currentDayEnd = day_end;
      showToast('บันทึกช่วงเวลาคำนวณลง Cookie สำเร็จ', 'success');
      profileModalInstance.hide();
      refreshAll();
    } else {
      showToast('ไม่สามารถบันทึกการตั้งค่าได้', 'danger');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'danger');
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const full_name = document.getElementById('profileFullName').value.trim();

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      document.getElementById('userDisplayName').textContent = full_name;
      profileModalInstance.hide();
    } else {
      showToast(data.error || 'ไม่สามารถอัปเดตข้อมูลได้', 'danger');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'danger');
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const current_password = document.getElementById('pwdCurrent').value;
  const new_password = document.getElementById('pwdNew').value;
  const confirm_password = document.getElementById('pwdConfirm').value;

  try {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password, confirm_password })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, 'success');
      document.getElementById('formChangePassword').reset();
      profileModalInstance.hide();
    } else {
      showToast(data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'danger');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'danger');
  }
}

// Helpers
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function showAlert(box, msg) {
  box.textContent = msg;
  box.classList.remove('d-none');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
