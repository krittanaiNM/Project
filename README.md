

---

## ข้อมูลสมาชิกผู้จัดทำ
- **ชื่อ-นามสกุล:** นายกฤตนัย นุ่มแก้ว
- **รหัสนักศึกษา:** 674245049
- **หมู่เรียน:** 67/42

---

## วิธีการติดตั้งและรันโปรเจกต์

### ข้อกำหนดเบื้องต้น
- ติดตั้ง **Node.js** (เวอร์ชัน 18 ขึ้นไป แนะนำ v20 หรือ v22)

### ขั้นตอนการรัน
1. ติดตั้ง Dependencies (ถ้ายังไม่ได้ติดตั้ง):
   ```bash
   npm install
   ```
2. เริ่มต้นรันเซิร์ฟเวอร์:
   ```bash
   npm start
   ```
   *(หรือใช้ `npm run dev` สำหรับการพัฒนาแบบ Hot-reload)*
3. เปิดเว็บเบราว์เซอร์ไปที่:
   ```text
   http://localhost:3000
   ```
   
---


## เทคโนโลยีที่ใช้
- **Front-end:**
  - HTML5 (โครงสร้างหน้าเว็บแบบ Semantic)
  - CSS3 & Bootstrap 5 (Responsive Layout, ปรับแต่งสี และรองรับ Light/Dark Theme)
  - JavaScript (ES6+), Fetch API, DOM Manipulation
  - Bootstrap Icons
- **Back-end:**
  - Node.js (v20+)
  - Express.js (v4+)
  - `express-session` (Server-side Session Store)
  - `cookie-parser` (Client Cookie Management)
  - `mongoose` (ODM สำหรับจัดการฐานข้อมูล MongoDB)
  - `dotenv` (Environment Variables)
  - `bcryptjs` (Password Hashing)
- **Database:**
  - **Local MongoDB** (`mongodb://127.0.0.1:27017/timewise_scheduler`) ผ่าน Mongoose ODM พร้อมระบบ Embedded Local Mongo Fallback ทำให้รันได้ทันทีโดยไม่ต้องกังวลเรื่องการเปิดเซอร์วิส

---


## บัญชีผู้ใช้งานสำหรับทดสอบระบบ

Username : student
Password : password123

Username : admin
Password :admin123

*สามารถกดปุ่ม "สมัครสมาชิกใหม่" บนหน้าเว็บ เพื่อทดลองสร้างบัญชีของตนเองได้*


