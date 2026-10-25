const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'กรุณาระบุชื่อผู้ใช้งาน'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร']
  },
  password_hash: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: [true, 'กรุณาระบุชื่อ-นามสกุล'],
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
