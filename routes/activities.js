const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

// All activity routes require authentication
router.use(requireAuth);

// Helper แปลง "HH:MM" เป็นจำนวนนาทีนับจาก 00:00
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Helper แปลงจำนวนนาทีกลับเป็น "HH:MM"
function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Format duration เป็นข้อความภาษาไทย
function formatDuration(mins) {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0 && minutes > 0) return `${hours} ชม. ${minutes} นาที`;
  if (hours > 0) return `${hours} ชม.`;
  return `${minutes} นาที`;
}

// ตรวจสอบเวลาทับซ้อนผ่าน MongoDB Mongoose Query
async function checkConflict(userId, date, startTime, endTime, excludeId = null) {
  const filter = {
    user: userId,
    activity_date: date,
    start_time: { $lt: endTime },
    end_time: { $gt: startTime }
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return await Activity.find(filter);
}

// -------------------------------------------------------------
// GET /api/activities/free-time - คำนวณหาช่วงเวลาว่าง (Free Slots)
// -------------------------------------------------------------
router.get('/free-time', async (req, res) => {
  const userId = req.session.user.id;
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const dayStartStr = req.query.day_start || '08:00';
  const dayEndStr = req.query.day_end || '22:00';

  const dayStartMins = timeToMinutes(dayStartStr);
  const dayEndMins = timeToMinutes(dayEndStr);

  if (dayStartMins >= dayEndMins) {
    return res.status(400).json({ error: 'เวลาเริ่มวันต้องน้อยกว่าเวลาสิ้นสุดวัน' });
  }

  try {
    // ดึงกิจกรรมในวันที่เลือก เรียงตามเวลาเริ่ม (MongoDB find & sort)
    const activities = await Activity.find({
      user: userId,
      activity_date: date
    }).sort({ start_time: 1 });

    let busyIntervals = [];
    let categoryBreakdown = {};

    activities.forEach(act => {
      const actStart = Math.max(dayStartMins, timeToMinutes(act.start_time));
      const actEnd = Math.min(dayEndMins, timeToMinutes(act.end_time));

      const actDuration = timeToMinutes(act.end_time) - timeToMinutes(act.start_time);
      categoryBreakdown[act.category] = (categoryBreakdown[act.category] || 0) + actDuration;

      if (actStart < actEnd) {
        busyIntervals.push({ start: actStart, end: actEnd, title: act.title });
      }
    });

    // เรียงตามเวลาเริ่ม
    busyIntervals.sort((a, b) => a.start - b.start);

    // รวมช่วงเวลาที่ทับซ้อนหรือต่อเนื่องกัน (Merge Busy Intervals)
    let mergedBusy = [];
    for (const interval of busyIntervals) {
      if (mergedBusy.length === 0) {
        mergedBusy.push({ start: interval.start, end: interval.end });
      } else {
        const prev = mergedBusy[mergedBusy.length - 1];
        if (interval.start <= prev.end) {
          prev.end = Math.max(prev.end, interval.end);
        } else {
          mergedBusy.push({ start: interval.start, end: interval.end });
        }
      }
    }

    // คำนวณหาช่องว่างระหว่างช่วงเวลาที่ไม่ว่าง (Calculate Free Slots)
    let freeSlots = [];
    let cursor = dayStartMins;
    let totalBusyMins = 0;

    for (const busy of mergedBusy) {
      if (busy.start > cursor) {
        const duration = busy.start - cursor;
        freeSlots.push({
          start_time: minutesToTime(cursor),
          end_time: minutesToTime(busy.start),
          duration_minutes: duration,
          formatted_duration: formatDuration(duration)
        });
      }
      totalBusyMins += (busy.end - busy.start);
      cursor = Math.max(cursor, busy.end);
    }

    if (cursor < dayEndMins) {
      const duration = dayEndMins - cursor;
      freeSlots.push({
        start_time: minutesToTime(cursor),
        end_time: minutesToTime(dayEndMins),
        duration_minutes: duration,
        formatted_duration: formatDuration(duration)
      });
    }

    const totalDayMins = dayEndMins - dayStartMins;
    const totalFreeMins = Math.max(0, totalDayMins - totalBusyMins);
    const freePercentage = Math.round((totalFreeMins / totalDayMins) * 100);
    const busyPercentage = 100 - freePercentage;

    // คำนวณข้อเสนอแนะความว่างด่วน (30, 60, 90, 120 นาที)
    const recommendations = [30, 60, 90, 120].map(mins => {
      const suitableSlots = freeSlots.filter(s => s.duration_minutes >= mins);
      return {
        requested_minutes: mins,
        available_count: suitableSlots.length,
        sample_slot: suitableSlots.length > 0 ? `${suitableSlots[0].start_time} - ${minutesToTime(timeToMinutes(suitableSlots[0].start_time) + mins)}` : null
      };
    });

    return res.json({
      date,
      day_settings: {
        day_start: dayStartStr,
        day_end: dayEndStr,
        total_day_minutes: totalDayMins,
        formatted_day_span: formatDuration(totalDayMins)
      },
      summary: {
        total_busy_minutes: totalBusyMins,
        formatted_busy: formatDuration(totalBusyMins),
        busy_percentage: busyPercentage,
        total_free_minutes: totalFreeMins,
        formatted_free: formatDuration(totalFreeMins),
        free_percentage: freePercentage,
        total_activities: activities.length
      },
      free_slots: freeSlots,
      recommendations,
      category_breakdown: categoryBreakdown
    });
  } catch (err) {
    console.error('Free time calculation error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการคำนวณเวลาว่าง' });
  }
});

// -------------------------------------------------------------
// GET /api/activities/week-summary - สรุปสถิติเวลาว่าง 7 วันในสัปดาห์
// -------------------------------------------------------------
router.get('/week-summary', async (req, res) => {
  const userId = req.session.user.id;
  let startDateStr = req.query.start_date;

  let startDate = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(startDate.getTime())) startDate = new Date();

  const day = startDate.getDay();
  const diffToMonday = startDate.getDate() - day + (day === 0 ? -6 : 1);
  startDate.setDate(diffToMonday);

  const dayNames = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
  const dayStartStr = req.query.day_start || '08:00';
  const dayEndStr = req.query.day_end || '22:00';
  const dayStartMins = timeToMinutes(dayStartStr);
  const dayEndMins = timeToMinutes(dayEndStr);
  const totalDayMins = Math.max(60, dayEndMins - dayStartMins);

  try {
    const weekData = [];

    for (let i = 0; i < 7; i++) {
      const curDate = new Date(startDate);
      curDate.setDate(startDate.getDate() + i);
      const dateStr = curDate.toISOString().split('T')[0];

      const acts = await Activity.find({
        user: userId,
        activity_date: dateStr
      }).sort({ start_time: 1 });

      let busyIntervals = [];
      acts.forEach(act => {
        const s = Math.max(dayStartMins, timeToMinutes(act.start_time));
        const e = Math.min(dayEndMins, timeToMinutes(act.end_time));
        if (s < e) busyIntervals.push({ start: s, end: e });
      });

      busyIntervals.sort((a, b) => a.start - b.start);
      let merged = [];
      for (const b of busyIntervals) {
        if (merged.length === 0) merged.push({ ...b });
        else {
          const last = merged[merged.length - 1];
          if (b.start <= last.end) last.end = Math.max(last.end, b.end);
          else merged.push({ ...b });
        }
      }

      const busyMins = merged.reduce((acc, cur) => acc + (cur.end - cur.start), 0);
      const freeMins = Math.max(0, totalDayMins - busyMins);
      const freePercent = Math.round((freeMins / totalDayMins) * 100);

      weekData.push({
        date: dateStr,
        day_name: dayNames[i],
        short_date: `${curDate.getDate()}/${curDate.getMonth() + 1}`,
        total_activities: acts.length,
        busy_minutes: busyMins,
        formatted_busy: formatDuration(busyMins),
        free_minutes: freeMins,
        formatted_free: formatDuration(freeMins),
        free_percentage: freePercent
      });
    }

    return res.json({
      week_start: startDate.toISOString().split('T')[0],
      days: weekData
    });
  } catch (err) {
    console.error('Week summary error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสัปดาห์' });
  }
});

// -------------------------------------------------------------
// GET /api/activities/export/csv - ส่งออกตารางกิจกรรมเป็นไฟล์ CSV
// -------------------------------------------------------------
router.get('/export/csv', async (req, res) => {
  const userId = req.session.user.id;
  const date = req.query.date;

  const filter = { user: userId };
  if (date) filter.activity_date = date;

  try {
    const list = await Activity.find(filter).sort({ activity_date: 1, start_time: 1 });

    let csv = '\uFEFF';
    csv += 'ลำดับ,ชื่อกิจกรรม,วันที่,เวลาเริ่ม,เวลาสิ้นสุด,หมวดหมู่,ระดับความสำคัญ,หมายเหตุ\n';

    const catLabels = {
      study: 'การเรียน',
      work: 'การทำงาน',
      health: 'สุขภาพ/กีฬา',
      leisure: 'พักผ่อน/ส่วนตัว',
      other: 'ทั่วไป'
    };

    const priLabels = {
      high: 'สูง',
      medium: 'ปกติ',
      low: 'ต่ำ'
    };

    list.forEach((item, idx) => {
      const cleanTitle = `"${(item.title || '').replace(/"/g, '""')}"`;
      const cleanNotes = `"${(item.notes || '').replace(/"/g, '""')}"`;
      const cat = catLabels[item.category] || item.category;
      const pri = priLabels[item.priority] || item.priority;

      csv += `${idx + 1},${cleanTitle},${item.activity_date},${item.start_time},${item.end_time},${cat},${pri},${cleanNotes}\n`;
    });

    const filename = date ? `schedule_${date}.csv` : 'schedule_all.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ error: 'ไม่สามารถส่งออกไฟล์ CSV ได้' });
  }
});

// -------------------------------------------------------------
// GET /api/activities - ดึงรายการกิจกรรมของผู้ใช้
// -------------------------------------------------------------
router.get('/', async (req, res) => {
  const userId = req.session.user.id;
  const { date, category } = req.query;

  const filter = { user: userId };
  if (date) filter.activity_date = date;
  if (category && category !== 'all') filter.category = category;

  try {
    const list = await Activity.find(filter).sort({ activity_date: 1, start_time: 1 });
    // Map _id to id for frontend compatibility
    const formatted = list.map(a => ({
      id: a._id.toString(),
      _id: a._id,
      user_id: a.user,
      title: a.title,
      activity_date: a.activity_date,
      start_time: a.start_time,
      end_time: a.end_time,
      category: a.category,
      priority: a.priority,
      notes: a.notes,
      created_at: a.created_at
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('List activities error:', err);
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลกิจกรรมได้' });
  }
});

// -------------------------------------------------------------
// POST /api/activities - สร้างกิจกรรมใหม่ (พร้อมตรวจสอบเวลาชน)
// -------------------------------------------------------------
router.post('/', async (req, res) => {
  const userId = req.session.user.id;
  const { title, activity_date, start_time, end_time, category, priority, notes } = req.body;

  if (!title || !activity_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อกิจกรรม วันที่ เวลาเริ่ม และเวลาสิ้นสุด' });
  }

  if (start_time >= end_time) {
    return res.status(400).json({ error: 'เวลาเริ่มกิจกรรมต้องมาก่อนเวลาสิ้นสุดกิจกรรม' });
  }

  try {
    // Conflict Checking via MongoDB
    const conflicts = await checkConflict(userId, activity_date, start_time, end_time);
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map(c => `"${c.title}" (${c.start_time} - ${c.end_time})`).join(', ');
      return res.status(409).json({
        error: `เวลาที่เลือกซ้อนทับกับกิจกรรมที่มีอยู่แล้ว: ${conflictNames}`,
        conflicts
      });
    }

    const created = await Activity.create({
      user: userId,
      title: title.trim(),
      activity_date,
      start_time,
      end_time,
      category: category || 'other',
      priority: priority || 'medium',
      notes: notes ? notes.trim() : ''
    });

    return res.status(201).json({
      message: 'บันทึกกิจกรรมเรียบร้อยแล้ว',
      activity: {
        id: created._id.toString(),
        ...created.toObject()
      }
    });
  } catch (err) {
    console.error('Create activity error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกกิจกรรม' });
  }
});

// -------------------------------------------------------------
// PUT /api/activities/:id - แก้ไขกิจกรรม
// -------------------------------------------------------------
router.put('/:id', async (req, res) => {
  const userId = req.session.user.id;
  const activityId = req.params.id;
  const { title, activity_date, start_time, end_time, category, priority, notes } = req.body;

  try {
    const existing = await Activity.findOne({ _id: activityId, user: userId });
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบกิจกรรมที่ต้องการแก้ไข' });
    }

    if (!title || !activity_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    if (start_time >= end_time) {
      return res.status(400).json({ error: 'เวลาเริ่มกิจกรรมต้องมาก่อนเวลาสิ้นสุดกิจกรรม' });
    }

    // Check conflict excluding current activity
    const conflicts = await checkConflict(userId, activity_date, start_time, end_time, activityId);
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map(c => `"${c.title}" (${c.start_time} - ${c.end_time})`).join(', ');
      return res.status(409).json({
        error: `เวลาที่แก้ไขซ้อนทับกับกิจกรรมเดิม: ${conflictNames}`,
        conflicts
      });
    }

    existing.title = title.trim();
    existing.activity_date = activity_date;
    existing.start_time = start_time;
    existing.end_time = end_time;
    existing.category = category || 'other';
    existing.priority = priority || 'medium';
    existing.notes = notes ? notes.trim() : '';
    await existing.save();

    return res.json({
      message: 'อัปเดตข้อมูลกิจกรรมเรียบร้อยแล้ว',
      activity: {
        id: existing._id.toString(),
        ...existing.toObject()
      }
    });
  } catch (err) {
    console.error('Update activity error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขกิจกรรม' });
  }
});

// -------------------------------------------------------------
// DELETE /api/activities/:id - ลบกิจกรรม
// -------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  const userId = req.session.user.id;
  const activityId = req.params.id;

  try {
    const deleted = await Activity.findOneAndDelete({ _id: activityId, user: userId });
    if (!deleted) {
      return res.status(404).json({ error: 'ไม่พบกิจกรรมที่ต้องการลบ' });
    }
    return res.json({ message: 'ลบกิจกรรมสำเร็จ' });
  } catch (err) {
    console.error('Delete activity error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบกิจกรรม' });
  }
});

module.exports = router;
