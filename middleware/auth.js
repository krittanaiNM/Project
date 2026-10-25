function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('json') || req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
    }
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('json') || req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
    }
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    if (req.xhr || req.headers.accept?.includes('json') || req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (เฉพาะ Admin เท่านั้น)' });
    }
    return res.status(403).send('Forbidden: Access denied');
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
