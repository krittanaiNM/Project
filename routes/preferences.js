const express = require('express');
const router = express.Router();

// POST /api/preferences/theme - บันทึก Theme mode ลง Cookie
router.post('/theme', (req, res) => {
  const { theme } = req.body;
  const selectedTheme = theme === 'dark' ? 'dark' : 'light';

  res.cookie('user_theme', selectedTheme, {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 ปี
    httpOnly: false, // เพื่อให้ JavaScript ฝั่ง Client อ่านและสลับ DOM ได้ทันที
    sameSite: 'lax'
  });

  return res.json({ message: 'บันทึกการตั้งค่า Theme สำเร็จ', theme: selectedTheme });
});

// POST /api/preferences/schedule-hours - บันทึกช่วงเวลาทำงาน/เวลาเริ่ม-สิ้นสุดวันลง Cookie
router.post('/schedule-hours', (req, res) => {
  const { day_start, day_end, default_view } = req.body;

  if (day_start) {
    res.cookie('pref_day_start', day_start, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false });
  }
  if (day_end) {
    res.cookie('pref_day_end', day_end, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false });
  }
  if (default_view) {
    res.cookie('pref_default_view', default_view, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false });
  }

  return res.json({
    message: 'บันทึกการตั้งค่าตารางเวลาลง Cookie สำเร็จ',
    preferences: { day_start, day_end, default_view }
  });
});

module.exports = router;
