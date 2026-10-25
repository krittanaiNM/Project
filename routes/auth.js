const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// POST /api/auth/register - สมัครสมาชิกใหม่ (MongoDB)
router.post('/register', async (req, res) => {
  const { username, password, full_name } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
  }

  const trimmedUser = username.trim().toLowerCase();
  if (trimmedUser.length < 3) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  try {
    const existing = await User.findOne({ username: trimmedUser });
    if (existing) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้งานนี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = await User.create({
      username: trimmedUser,
      password_hash: passwordHash,
      full_name: full_name.trim(),
      role: 'user',
      status: 'active'
    });

    // Auto login into session
    req.session.user = {
      id: newUser._id.toString(),
      username: newUser.username,
      full_name: newUser.full_name,
      role: newUser.role
    };

    return res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      user: req.session.user
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
});

// POST /api/auth/login - เข้าสู่ระบบ (MongoDB)
router.post('/login', async (req, res) => {
  const { username, password, remember_me } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  try {
    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // Save session
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      full_name: user.full_name,
      role: user.role
    };

    // Cookies: Remember username if checked
    if (remember_me) {
      res.cookie('remember_username', user.username, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: false
      });
    } else {
      res.clearCookie('remember_username');
    }

    return res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: req.session.user
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// POST /api/auth/logout - ออกจากระบบ
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'ไม่สามารถออกจากระบบได้' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'ออกจากระบบสำเร็จ' });
  });
});

// GET /api/auth/me - ตรวจสอบข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({
    authenticated: true,
    user: req.session.user
  });
});

// PUT /api/auth/profile - อัปเดตชื่อ-นามสกุล
router.put('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
  }

  const { full_name } = req.body;
  if (!full_name || full_name.trim().length === 0) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อ-นามสกุล' });
  }

  try {
    await User.findByIdAndUpdate(req.session.user.id, { full_name: full_name.trim() });
    req.session.user.full_name = full_name.trim();

    return res.json({
      message: 'อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว',
      user: req.session.user
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
  }
});

// PUT /api/auth/password - เปลี่ยนรหัสผ่าน
router.put('/password', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
  }

  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลรหัสผ่านให้ครบทุกช่อง' });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  try {
    const user = await User.findById(req.session.user.id);
    const isMatch = bcrypt.compareSync(current_password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    user.password_hash = newHash;
    await user.save();

    return res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
  }
});

module.exports = router;
