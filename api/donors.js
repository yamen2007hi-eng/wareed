const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const DEFAULT_BANKS = [
  {"id": "bank_zawiya_edu", "city": "الزاوية", "name": "مصرف الدم بمستشفى الزاوية التعليمي", "location": "الزاوية - مجمع الكليات والمستشفى التعليمي", "map_query": "Zawiya Teaching Hospital, Az Zawiyah, Libya", "phone": "", "fb_url": "https://www.facebook.com/search/top?q=مستشفى%20الزاوية%20التعليمي", "show_stock": true, "last_updated": "2026-10-28 08:30", "updated_by": "أخصائي المناوبة", "stock": {"O+": "high", "O-": "crit", "A+": "high", "A-": "low", "B+": "high", "B-": "low", "AB+": "high", "AB-": "crit"}},
  {"id": "bank_zawiya_kidney", "city": "الزاوية", "name": "مستشفى الكلى بالزاوية", "location": "الزاوية - المركز التخصصي لأمراض وجراحة الكلى", "map_query": "Kidney Hospital Az Zawiyah, Libya", "phone": "", "fb_url": "https://www.facebook.com/search/top?q=مستشفى%20الكلى%20الزاوية", "show_stock": false, "last_updated": "2026-10-28 08:30", "updated_by": "وحدة نقل الدم", "stock": {"O+": "high", "O-": "low", "A+": "high", "A-": "low", "B+": "high", "B-": "low", "AB+": "high", "AB-": "low"}},
  {"id": "bank_surman_general", "city": "صرمان", "name": "مستشفى صرمان العام", "location": "صرمان - الطريق الرئيسي", "map_query": "Surman General Hospital, Surman, Libya", "phone": "", "fb_url": "https://www.facebook.com/search/top?q=مستشفى%20صرمان%20العام", "show_stock": false, "last_updated": "2026-10-28 08:30", "updated_by": "بنك الدم", "stock": {"O+": "high", "O-": "crit", "A+": "high", "A-": "low", "B+": "high", "B-": "low", "AB+": "high", "AB-": "crit"}},
  {"id": "bank_sabratah_oncology", "city": "صبراتة", "name": "مصرف الدم بمعهد الأورام بصبراتة", "location": "صبراتة - بالقرب من الساحلي", "map_query": "Sabratha Oncology Teaching Hospital, Sabratha, Libya", "phone": "", "fb_url": "https://www.facebook.com/search/top?q=المعهد%20القومي%20لعلاج%20الأورام%20بصبراتة", "show_stock": true, "last_updated": "2026-10-28 08:30", "updated_by": "أخصائي نقل الدم", "stock": {"O+": "high", "O-": "crit", "A+": "high", "A-": "low", "B+": "high", "B-": "crit", "AB+": "high", "AB-": "crit"}},
  {"id": "bank_tripoli_central", "city": "طرابلس", "name": "مصرف الدم المركزي طرابلس (شارع الزاوية)", "location": "طرابلس - شارع الزاوية", "map_query": "Tripoli Central Hospital, Tripoli, Libya", "phone": "021-3605001", "fb_url": "https://www.facebook.com/search/top?q=مصرف%20الدم%20المركزي%20طرابلس", "show_stock": true, "last_updated": "2026-10-28 08:00", "updated_by": "إدارة مصرف الدم", "stock": {"O+": "high", "O-": "crit", "A+": "low", "A-": "crit", "B+": "high", "B-": "low", "AB+": "high", "AB-": "low"}},
  {"id": "bank_misrata_central", "city": "مصراتة", "name": "مصرف الدم المركزي مصراتة", "location": "مصراتة - المقاصبة", "map_query": "Central Blood Bank, Misrata, Libya", "phone": "", "fb_url": "https://www.facebook.com/search/top?q=مصرف%20الدم%20المركزي%20مصراتة", "show_stock": false, "last_updated": "2026-10-28 08:00", "updated_by": "شعبة الإمداد", "stock": {"O+": "high", "O-": "low", "A+": "high", "A-": "low", "B+": "high", "B-": "low", "AB+": "high", "AB-": "crit"}},
  {"id": "bank_benghazi_central", "city": "بنغازي", "name": "مصرف الدم المركزي بنغازي (الهواري)", "location": "بنغازي - منطقة الهواري", "map_query": "Central Blood Bank Benghazi, Benghazi, Libya", "phone": "", "fb_url": "https://www.facebook.com/search/top?q=مصرف%20الدم%20المركزي%20بنغازي", "show_stock": false, "last_updated": "2026-10-28 08:00", "updated_by": "المناوب الفني", "stock": {"O+": "high", "O-": "low", "A+": "high", "A-": "crit", "B+": "high", "B-": "low", "AB+": "high", "AB-": "crit"}},
  {"id": "bank_sabha_central", "city": "سبها", "name": "مصرف الدم المركزي سبها", "location": "سبها - قرب مركز سبها الطبي", "map_query": "Sebha Medical Center, Sabha, Libya", "phone": "", "fb_url": "https://www.facebook.com/search/top?q=مصرف%20الدم%20المركزي%20سبها", "show_stock": false, "last_updated": "2026-10-28 08:00", "updated_by": "فني بنك الدم", "stock": {"O+": "low", "O-": "crit", "A+": "low", "A-": "crit", "B+": "low", "B-": "crit", "AB+": "low", "AB-": "crit"}}
];

const DEFAULT_SOS = {
  visible: true,
  text: "مستشفى الزاوية التعليمي (قسم الحوادث): مطلوب وحدات دم فصيلة O- و AB+ بشكل عاجل.",
  blood: "O-"
};

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

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('sos', $1)
    ON CONFLICT (key) DO NOTHING;
  `, [JSON.stringify(DEFAULT_SOS)]);

  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('banks', $1)
    ON CONFLICT (key) DO NOTHING;
  `, [JSON.stringify(DEFAULT_BANKS)]);

  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('admin_phone', $1)
    ON CONFLICT (key) DO NOTHING;
  `, [JSON.stringify("0926497310")]);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initDB();

    if (req.method === 'GET') {
      const donorsRes = await pool.query('SELECT * FROM donors ORDER BY created_at DESC');
      const settingsRes = await pool.query('SELECT key, value FROM system_settings');

      let sos = DEFAULT_SOS;
      let banks = DEFAULT_BANKS;
      let adminPhone = "0926497310";

      settingsRes.rows.forEach(r => {
        if (r.key === 'sos') sos = r.value;
        if (r.key === 'banks') banks = r.value;
        if (r.key === 'admin_phone') adminPhone = r.value;
      });

      const donors = donorsRes.rows.map(r => ({
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

      return res.status(200).json({
        success: true,
        donors,
        sos,
        banks,
        adminPhone
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};
      const secret = (process.env.ADMIN_SECRET || 'yamen2007hi@gmail.com').trim();
      const adminHeader = req.headers['x-admin-secret'];
      const isAdmin = (adminHeader && adminHeader.trim() === secret) || (req.body.password && req.body.password.trim() === secret);

      if (action === 'admin_login') {
        const { password } = req.body;
        if (password && password.trim() === secret) {
          return res.status(200).json({ success: true, token: secret });
        }
        return res.status(401).json({ success: false, message: 'رمز الإدارة غير صحيح!' });
      }

      if (action === 'save_sos') {
        if (!isAdmin) return res.status(403).json({ success: false, message: 'غير مصرح.' });
        await pool.query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('sos', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [JSON.stringify(req.body.sos)]
        );
        return res.status(200).json({ success: true, message: 'تم حفظ وتحديث نداء الطوارئ للجميع بنجاح!' });
      }

      if (action === 'save_banks') {
        if (!isAdmin) return res.status(403).json({ success: false, message: 'غير مصرح.' });
        await pool.query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('banks', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [JSON.stringify(req.body.banks)]
        );
        return res.status(200).json({ success: true, message: 'تم حفظ وتحديث مصارف الدم للجميع بنجاح!' });
      }

      if (action === 'save_admin_phone') {
        if (!isAdmin) return res.status(403).json({ success: false, message: 'غير مصرح.' });
        await pool.query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('admin_phone', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [JSON.stringify(req.body.phone)]
        );
        return res.status(200).json({ success: true, message: 'تم حفظ رقم الإدارة للجميع بنجاح!' });
      }

      if (action === 'bulk_import') {
        if (!isAdmin) return res.status(403).json({ success: false, message: 'غير مصرح.' });
        const { records } = req.body;
        let addedCount = 0;
        let skippedCount = 0;
        for (const r of records) {
          const check = await pool.query('SELECT id FROM donors WHERE phone = $1', [r.phone]);
          if (check.rows.length > 0) {
            skippedCount++;
            continue;
          }
          const id = 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          const code = 'WRD-' + Math.floor(1000 + Math.random() * 9000);
          const createdAt = new Date().toISOString().split('T')[0];
          await pool.query(
            `INSERT INTO donors (id, code, blood, city, phone, preferred_time, last_donation_date, is_verified, pin, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [id, code, r.blood || 'O+', r.city || 'الزاوية', r.phone, '24/7', '', true, '1234', createdAt]
          );
          addedCount++;
        }
        return res.status(200).json({ success: true, addedCount, skippedCount });
      }

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

      if (action === 'donor_delete') {
        const { phone, pin } = req.body;
        const resDel = await pool.query('DELETE FROM donors WHERE phone = $1 AND pin = $2', [phone, pin]);
        if (resDel.rowCount === 0) {
          return res.status(403).json({ success: false, message: 'فشل الحذف: الرمز السري غير صحيح.' });
        }
        return res.status(200).json({ success: true, message: 'تم حذف حسابك نهائياً من المنظومة.' });
      }

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
