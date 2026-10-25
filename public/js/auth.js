document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');
  const loginAlert = document.getElementById('loginAlert');
  const registerAlert = document.getElementById('registerAlert');

  // Check for 'remember_username' cookie
  const rememberedUser = getCookie('remember_username');
  if (rememberedUser && document.getElementById('loginUsername')) {
    document.getElementById('loginUsername').value = rememberedUser;
    const rememberMeCheck = document.getElementById('rememberMe');
    if (rememberMeCheck) rememberMeCheck.checked = true;
  }

  // Handle Login Submit
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginAlert.classList.add('d-none');

      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      const remember_me = document.getElementById('rememberMe')?.checked || false;

      if (!username || !password) {
        showLoginAlert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'danger');
        return;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, remember_me })
        });

        const data = await res.json();
        if (res.ok) {
          showToast('เข้าสู่ระบบสำเร็จ กำลังพาไปยังแดชบอร์ด...', 'success');
          setTimeout(() => {
            if (data.user.role === 'admin') {
              window.location.href = '/admin';
            } else {
              window.location.href = '/dashboard';
            }
          }, 800);
        } else {
          showLoginAlert(data.error || 'เข้าสู่ระบบไม่สำเร็จ', 'danger');
        }
      } catch (err) {
        showLoginAlert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
      }
    });
  }

  // Handle Register Submit
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      registerAlert.classList.add('d-none');

      const full_name = document.getElementById('regFullName').value.trim();
      const username = document.getElementById('regUsername').value.trim();
      const password = document.getElementById('regPassword').value;
      const passwordConfirm = document.getElementById('regPasswordConfirm').value;

      if (!full_name || !username || !password) {
        showRegisterAlert('กรุณากรอกข้อมูลให้ครบทุกช่อง', 'danger');
        return;
      }

      if (password !== passwordConfirm) {
        showRegisterAlert('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'danger');
        return;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name, username, password })
        });

        const data = await res.json();
        if (res.ok) {
          showToast('สมัครสมาชิกสำเร็จ กำลังพาไปยังแดชบอร์ด...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 800);
        } else {
          showRegisterAlert(data.error || 'การสมัครสมาชิกไม่สำเร็จ', 'danger');
        }
      } catch (err) {
        showRegisterAlert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'danger');
      }
    });
  }

  function showLoginAlert(msg, type) {
    loginAlert.className = `alert alert-${type} mt-3`;
    loginAlert.textContent = msg;
    loginAlert.classList.remove('d-none');
  }

  function showRegisterAlert(msg, type) {
    registerAlert.className = `alert alert-${type} mt-3`;
    registerAlert.textContent = msg;
    registerAlert.classList.remove('d-none');
  }
});
