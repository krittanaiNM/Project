const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency performance
db.pragma('journal_mode = WAL');

// Initialize tables
function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Activities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      category TEXT DEFAULT 'general' CHECK(category IN ('study', 'work', 'health', 'leisure', 'other')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Index for fast search by user and date
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activities_user_date 
    ON activities(user_id, activity_date);
  `);

  // Seed default admin and sample student user if not exists
  const checkAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!checkAdmin) {
    const adminPass = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role) 
      VALUES (?, ?, ?, 'admin')
    `).run('admin', adminPass, 'System Administrator');
    console.log('Seeded default admin user: admin / admin123');
  }

  const checkStudent = db.prepare('SELECT id FROM users WHERE username = ?').get('student');
  if (!checkStudent) {
    const studentPass = bcrypt.hashSync('password123', 10);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role) 
      VALUES (?, ?, ?, 'user')
    `).run('student', studentPass, 'กฤตนัย นุ่มแก้ว');
    const studentId = result.lastInsertRowid;

    // Seed sample activities for today
    const today = new Date().toISOString().split('T')[0];
    const insertActivity = db.prepare(`
      INSERT INTO activities (user_id, title, activity_date, start_time, end_time, category, priority, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertActivity.run(studentId, 'เรียนวิชา Internet Programming', today, '09:00', '12:00', 'study', 'high', 'ห้อง Lab CS-402');
    insertActivity.run(studentId, 'พักรับประทานอาหารกลางวัน', today, '12:00', '13:00', 'leisure', 'medium', 'โรงอาหารกลาง');
    insertActivity.run(studentId, 'ทำรายงานกลุ่มและเขียนโค้ด Web App', today, '14:00', '16:30', 'work', 'high', 'ทำงานร่วมกับเพื่อนที่ห้องสมุด');
    insertActivity.run(studentId, 'ออกกำลังกาย วิ่งที่สนามกีฬา', today, '17:30', '18:30', 'health', 'medium', 'วิ่งรอบสนาม 5 รอบ');

    console.log('Seeded default sample user: student / password123 with sample activities');
  }
}

initDb();

module.exports = db;
