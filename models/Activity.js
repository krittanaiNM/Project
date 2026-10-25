const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'กรุณาระบุชื่อกิจกรรม'],
    trim: true
  },
  activity_date: {
    type: String,
    required: [true, 'กรุณาระบุวันที่'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)']
  },
  start_time: {
    type: String,
    required: [true, 'กรุณาระบุเวลาเริ่ม'],
    match: [/^\d{2}:\d{2}$/, 'รูปแบบเวลาเริ่มไม่ถูกต้อง (HH:MM)']
  },
  end_time: {
    type: String,
    required: [true, 'กรุณาระบุเวลาสิ้นสุด'],
    match: [/^\d{2}:\d{2}$/, 'รูปแบบเวลาสิ้นสุดไม่ถูกต้อง (HH:MM)']
  },
  category: {
    type: String,
    enum: ['study', 'work', 'health', 'leisure', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Compound Index for fast lookup by user and activity date
activitySchema.index({ user: 1, activity_date: 1 });

module.exports = mongoose.model('Activity', activitySchema);
