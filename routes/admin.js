const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const { requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(requireAdmin);

// GET /api/admin/stats - สถิติภาพรวมระบบ (MongoDB Aggregation)
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalActivities = await Activity.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active', role: 'user' });

    // Category distribution using MongoDB Aggregation Pipeline
    const categoryStats = await Activity.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const categories = categoryStats.map(c => ({
      category: c._id,
      count: c.count
    }));

    return res.json({
      totalUsers,
      totalActivities,
      activeUsers,
      categories,
      avgActivitiesPerUser: totalUsers > 0 ? (totalActivities / totalUsers).toFixed(1) : 0
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลสถิติได้' });
  }
});

// GET /api/admin/users - รายชื่อผู้ใช้ พร้อมระบบค้นหาและนับกิจกรรม (MongoDB)
router.get('/users', async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (search && search.trim() !== '') {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [{ username: reg }, { full_name: reg }];
    }

    if (status && ['active', 'inactive'].includes(status)) {
      filter.status = status;
    }

    const users = await User.find(filter).sort({ created_at: -1 });

    // ดึงจำนวนกิจกรรมของแต่ละคน
    const usersWithCounts = await Promise.all(
      users.map(async u => {
        const actCount = await Activity.countDocuments({ user: u._id });
        return {
          id: u._id.toString(),
          _id: u._id,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          status: u.status,
          created_at: u.created_at,
          activity_count: actCount
        };
      })
    );

    return res.json(usersWithCounts);
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'ไม่สามารถดึงรายชื่อผู้ใช้ได้' });
  }
});

// PATCH /api/admin/users/:id/status - เปลี่ยนสถานะผู้ใช้ (เปิด/ระงับบัญชี)
router.patch('/users/:id/status', async (req, res) => {
  const targetId = req.params.id;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'สถานะไม่ถูกต้อง (ต้องเป็น active หรือ inactive)' });
  }

  // ป้องกันไม่ให้แอดมินระงับบัญชีของตนเอง
  if (targetId === req.session.user.id) {
    return res.status(400).json({ error: 'ไม่สามารถระงับการใช้งานบัญชีของตนเองได้' });
  }

  try {
    const updated = await User.findByIdAndUpdate(targetId, { status }, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้ที่ต้องการเปลี่ยนสถานะ' });
    }
    return res.json({ message: `เปลี่ยนสถานะเป็น ${status} สำเร็จ` });
  } catch (err) {
    console.error('Update user status error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้' });
  }
});

module.exports = router;
