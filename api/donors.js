const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      blood TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      preferred_time TEXT DEFAULT '24/7',
      last_donation_date TEXT DEFAULT '',
      is_verified BOOLEAN DEFAULT false,
      pin TEXT DEFAULT '1234',
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDB();

    // جلب المتبرعين: إرسال الرقم للواجهة ليتم حجبه بالنجوم وكشفه فقط عند التعهد
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM donors ORDER BY created_at DESC');
      const donors = result.rows.map(r => ({
        id: r.id,
        code: r.code,
        blood: r.blood,
        city: r.city,
        phone: r.phone,
        preferredTime: r.preferred_time,
        lastDonationDate: r.last_donation_date,
        isVerified: r.is_verified,
        createdAt: r.created_at
      }));
      return res.status(200).json({ success: true, donors });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};

      // دخول الإدارة
      if (action === 'admin_login') {
        const { password } = req.body;
        const secret = (process.env.ADMIN_SECRET || 'yamen2007hi@gmail.com').trim();
        if (password && password.trim() === secret) {
          return res.status(200).json({ success: true, token: secret });
        }
        return res.status(401).json({ success: false, message: 'رمز الإدارة غير صحيح!' });
      }

      // تسجيل دخول المتبرع لملفه الشخصي برقم الهاتف + الـ PIN
      if (action === 'donor_login') {
        const { phone, pin } = req.body;
        const result = await pool.query('SELECT * FROM donors WHERE phone = $1 AND pin = $2', [phone, pin]);
        if (result.rows.length === 0) {
          return res.status(401).json({ success: false, message: 'رقم الهاتف أو الرمز السري (PIN) غير صحيح!' });
        }
        const d = result.rows[0];
        return res.status(200).json({
          success: true,
          donor: {
            id: d.id,
            code: d.code,
            blood: d.blood,
            city: d.city,
            phone: d.phone,
            preferredTime: d.preferred_time,
            lastDonationDate: d.last_donation_date
          }
        });
      }

      // تعديل بيانات الملف الشخصي للمتبرع
      if (action === 'donor_update') {
        const { phone, pin, blood, city, preferredTime, lastDonationDate } = req.body;
        const check = await pool.query('SELECT id FROM donors WHERE phone = $1 AND pin = $2', [phone, pin]);
        if (check.rows.length === 0) {
          return res.status(403).json({ success: false, message: 'فشل التعديل: الرمز السري غير صحيح.' });
        }
        await pool.query(
          `UPDATE donors SET blood = $1, city = $2, preferred_time = $3, last_donation_date = $4, updated_at = NOW()
           WHERE phone = $5 AND pin = $6`,
          [blood, city, preferredTime, lastDonationDate, phone, pin]
        );
        return res.status(200).json({ success: true, message: 'تم حفظ تعديلاتك بنجاح!' });
      }

      // حذف الملف الشخصي نهائياً
      if (action === 'donor_delete') {
        const { phone, pin } = req.body;
        const resDel = await pool.query('DELETE FROM donors WHERE phone = $1 AND pin = $2', [phone, pin]);
        if (resDel.rowCount === 0) {
          return res.status(403).json({ success: false, message: 'فشل الحذف: الرمز السري غير صحيح.' });
        }
        return res.status(200).json({ success: true, message: 'تم حذف حسابك نهائياً من المنظومة.' });
      }

      // تسجيل متبرع جديد
      const { blood, city, phone, preferredTime, lastDonationDate, pin } = req.body;
      if (!phone || !/^09\d{8}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'رقم هاتف غير صحيح (10 أرقام تبدأ بـ 09).' });
      }

      const existing = await pool.query('SELECT code FROM donors WHERE phone = $1', [phone]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'رقم الهاتف مسجل مسبقاً بالكود: ' + existing.rows[0].code
        });
      }

      const id = 'd_' + Date.now();
      const code = 'WRD-' + Math.floor(1000 + Math.random() * 9000);
      const createdAt = new Date().toISOString().split('T')[0];
      const donorPin = pin && pin.length >= 4 ? pin : '1234';

      await pool.query(
        `INSERT INTO donors (id, code, blood, city, phone, preferred_time, last_donation_date, is_verified, pin, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, code, blood || 'O+', city || 'الزاوية', phone, preferredTime || '24/7', lastDonationDate || '', false, donorPin, createdAt]
      );

      return res.status(201).json({
        success: true,
        message: 'تم التسجيل بنجاح!',
        donor: { id, code, blood, city, phone, preferredTime, lastDonationDate, createdAt, isVerified: false }
      });
    }

    // أوامر الإدارة (توثيق وحذف)
    if (req.method === 'PUT' || req.method === 'DELETE') {
      const adminHeader = req.headers['x-admin-secret'];
      const secret = (process.env.ADMIN_SECRET || 'yamen2007hi@gmail.com').trim();
      if (adminHeader !== secret) {
        return res.status(403).json({ success: false, message: 'غير مصرح.' });
      }
      if (req.method === 'PUT') {
        await pool.query('UPDATE donors SET is_verified = $1 WHERE id = $2', [req.body.isVerified, req.body.id]);
        return res.status(200).json({ success: true });
      }
      if (req.method === 'DELETE') {
        await pool.query('DELETE FROM donors WHERE id = $1', [req.body.id]);
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
