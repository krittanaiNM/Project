const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Activity = require('../models/Activity');

let mongoServerInstance = null;

async function connectDB() {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timewise_scheduler';

  try {
    // 1. พยายามเชื่อมต่อไปยัง Local MongoDB Service ที่พอร์ต 27017
    console.log(`📡 กำลังเชื่อมต่อไปยัง Local MongoDB: ${primaryUri} ...`);
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 2500 // รอ 2.5 วินาที ถ้าไม่มี service ให้ fallback อัตโนมัติ
    });
    console.log(`✅ เชื่อมต่อ MongoDB Service สำเร็จ: ${primaryUri}`);
  } catch (err) {
    console.log(`⚠️ ไม่พบ Local MongoDB Service ที่พอร์ต 27017 หรือยังไม่ได้เปิด mongod`);
    console.log(`🚀 กำลังเปิด Embedded Local MongoDB อัตโนมัติ เพื่อให้ระบบทำงานได้ทันที...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServerInstance = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbName: 'timewise_scheduler'
        }
      });
      const localUri = mongoServerInstance.getUri();
      await mongoose.connect(localUri);
      console.log(`✅ เชื่อมต่อ Embedded Local MongoDB สำเร็จ: ${localUri}`);
    } catch (fallbackErr) {
      console.error('❌ ไม่สามารถเริ่มต้น MongoDB ได้:', fallbackErr.message);
      process.exit(1);
    }
  }

  // Seed default admin and sample student user
  await seedInitialData();
}

async function seedInitialData() {
  try {
    // 1. Seed Admin
    let admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      const adminPass = bcrypt.hashSync('admin123', 10);
      admin = await User.create({
        username: 'admin',
        password_hash: adminPass,
        full_name: 'System Administrator',
        role: 'admin',
        status: 'active'
      });
      console.log('🌱 Seeded default admin: admin / admin123');
    }

    // 2. Seed Student (นายกฤตนัย นุ่มแก้ว)
    let student = await User.findOne({ username: 'student' });
    if (!student) {
      const studentPass = bcrypt.hashSync('password123', 10);
      student = await User.create({
        username: 'student',
        password_hash: studentPass,
        full_name: 'นายกฤตนัย นุ่มแก้ว',
        role: 'user',
        status: 'active'
      });
      console.log('🌱 Seeded default student: student / password123 (นายกฤตนัย นุ่มแก้ว)');

      // Seed sample activities for today
      const today = new Date().toISOString().split('T')[0];
      await Activity.create([
        {
          user: student._id,
          title: 'เรียนวิชา Internet Programming',
          activity_date: today,
          start_time: '09:00',
          end_time: '12:00',
          category: 'study',
          priority: 'high',
          notes: 'ห้อง Lab CS-402'
        },
        {
          user: student._id,
          title: 'พักรับประทานอาหารกลางวัน',
          activity_date: today,
          start_time: '12:00',
          end_time: '13:00',
          category: 'leisure',
          priority: 'medium',
          notes: 'โรงอาหารกลาง'
        },
        {
          user: student._id,
          title: 'ทำโครงงาน Web Application (Node.js + MongoDB)',
          activity_date: today,
          start_time: '14:00',
          end_time: '16:30',
          category: 'work',
          priority: 'high',
          notes: 'ทำงานร่วมกับเพื่อนที่ห้องสมุด'
        },
        {
          user: student._id,
          title: 'ออกกำลังกาย วิ่งที่สนามกีฬา',
          activity_date: today,
          start_time: '17:30',
          end_time: '18:30',
          category: 'health',
          priority: 'medium',
          notes: 'วิ่งรอบสนาม 5 รอบ'
        }
      ]);
      console.log('🌱 Seeded sample activities for student on today');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

module.exports = { connectDB };
