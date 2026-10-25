require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

// MongoDB Connection
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const adminRoutes = require('./routes/admin');
const prefRoutes = require('./routes/preferences');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers & Cookie Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Express Session Setup
app.use(
  session({
    secret: 'daily_scheduler_super_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
  })
);

// Serve static assets (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// View Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/dashboard');
  }
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/preferences', prefRoutes);

// 404 Handler
app.use((req, res) => {
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(404).json({ error: 'ไม่พบเส้นทางที่ร้องขอ (404 Not Found)' });
  }
  res.status(404).send('<h1>404 Not Found</h1><p>ไม่พบหน้าที่คุณต้องการ</p><a href="/">กลับหน้าหลัก</a>');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในระบบเซิร์ฟเวอร์' });
});

// Start Server after connecting to MongoDB
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 เซิร์ฟเวอร์กำลังทำงานที่: http://localhost:${PORT}`);
    console.log(`🍃 ฐานข้อมูล:     Local MongoDB (Mongoose ODM)`);
    console.log(`📌 หน้าหลัก:      http://localhost:${PORT}/`);
    console.log(`📌 เข้าสู่ระบบ:   http://localhost:${PORT}/login`);
    console.log(`📌 แดชบอร์ด:     http://localhost:${PORT}/dashboard`);
    console.log(`📌 ผู้ดูแลระบบ:   http://localhost:${PORT}/admin`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('Fatal startup error:', err);
});

module.exports = app;
