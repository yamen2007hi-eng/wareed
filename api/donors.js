const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      blood TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      preferred_time TEXT DEFAULT '24/7',
      last_donation_date TEXT DEFAULT '',
      is_verified BOOLEAN DEFAULT false,
      created_at TEXT NOT NULL
    );
  `);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDB();

    // جلب جميع المتبرعين
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM donors ORDER BY created_at DESC, id DESC');
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

      // تسجيل دخول الإدارة الآمن
      if (action === 'admin_login') {
        const { password } = req.body;
        const secret = process.env.ADMIN_SECRET || 'yamen2007hi@gmail.com';
        if (password && password.trim() === secret.trim()) {
          return res.status(200).json({ success: true, token: secret.trim() });
        }
        return res.status(401).json({ success: false, message: 'خطأ: الرمز السري للإدارة غير صحيح!' });
      }

      // استيراد جماعي من الإدارة
      if (action === 'bulk_import') {
        const adminHeader = req.headers['x-admin-secret'];
        const secret = process.env.ADMIN_SECRET || 'yamen2007hi@gmail.com';
        if (adminHeader !== secret.trim()) {
          return res.status(403).json({ success: false, message: 'غير مصرح لك بهذه العملية' });
        }
        const { records } = req.body;
        if (!Array.isArray(records)) {
          return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
        }
        let addedCount = 0;
        let skippedCount = 0;

        for (const rec of records) {
          const check = await pool.query('SELECT id FROM donors WHERE phone = $1', [rec.phone]);
          if (check.rows.length > 0) {
            skippedCount++;
            continue;
          }
          const id = 'd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const code = 'WRD-' + Math.floor(1000 + Math.random() * 9000);
          const createdAt = new Date().toISOString().split('T')[0];
          await pool.query(
            `INSERT INTO donors (id, code, blood, city, phone, preferred_time, last_donation_date, is_verified, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, code, rec.blood || 'O+', rec.city || 'الزاوية', rec.phone, '24/7', '', true, createdAt]
          );
          addedCount++;
        }
        return res.status(200).json({ success: true, addedCount, skippedCount });
      }

      // تسجيل متبرع جديد ومنع التكرار
      const { blood, city, phone, preferredTime, lastDonationDate } = req.body;

      if (!phone || !/^09\d{8}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'يرجى إدخال رقم هاتف ليبي صحيح مكون من 10 أرقام ويبدأ بـ 09.'
        });
      }

      const existing = await pool.query('SELECT code FROM donors WHERE phone = $1', [phone]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'تنبيه: رقم الهاتف هذا مسجل مسبقاً في المنظومة الوطنية تحت الكود (' + existing.rows[0].code + ') ولا يمكن تكراره!'
        });
      }

      const id = 'd_' + Date.now();
      const code = 'WRD-' + Math.floor(1000 + Math.random() * 9000);
      const createdAt = new Date().toISOString().split('T')[0];

      await pool.query(
        `INSERT INTO donors (id, code, blood, city, phone, preferred_time, last_donation_date, is_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, code, blood || 'O+', city || 'الزاوية', phone, preferredTime || '24/7', lastDonationDate || '', false, createdAt]
      );

      const newDonor = {
        id,
        code,
        blood: blood || 'O+',
        city: city || 'الزاوية',
        phone,
        preferredTime: preferredTime || '24/7',
        lastDonationDate: lastDonationDate || '',
        isVerified: false,
        createdAt
      };

      return res.status(201).json({
        success: true,
        message: 'تم التسجيل بنجاح في قاعدة البيانات المركزية!',
        donor: newDonor
      });
    }

    // تفعيل / إلغاء تفعيل متبرع
    if (req.method === 'PUT') {
      const adminHeader = req.headers['x-admin-secret'];
      const secret = process.env.ADMIN_SECRET || 'yamen2007hi@gmail.com';
      if (adminHeader !== secret.trim()) {
        return res.status(403).json({ success: false, message: 'غير مصرح لك بهذه العملية' });
      }
      const { id, isVerified } = req.body;
      await pool.query('UPDATE donors SET is_verified = $1 WHERE id = $2', [isVerified, id]);
      return res.status(200).json({ success: true });
    }

    // حذف متبرع
    if (req.method === 'DELETE') {
      const adminHeader = req.headers['x-admin-secret'];
      const secret = process.env.ADMIN_SECRET || 'yamen2007hi@gmail.com';
      if (adminHeader !== secret.trim()) {
        return res.status(403).json({ success: false, message: 'غير مصرح لك بهذه العملية' });
      }
      const { id } = req.body;
      await pool.query('DELETE FROM donors WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (err) {
    console.error('Database Error:', err);
    return res.status(500).json({
      success: false,
      message: 'خطأ في الاتصال بقاعدة البيانات: ' + err.message
    });
  }
};
