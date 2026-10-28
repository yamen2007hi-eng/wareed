import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  const query = `
    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      blood TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      preferred_time TEXT DEFAULT '24/7',
      last_donation_date TEXT DEFAULT '',
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDB();

    // 1. جلب المتبرعين من قاعدة البيانات
    if (req.method === 'GET') {
      const { blood, city, readiness } = req.query;
      let sql = 'SELECT * FROM donors WHERE 1=1';
      const params = [];

      if (blood) {
        params.push(blood);
        sql += ` AND blood = $${params.length}`;
      }
      if (city) {
        params.push(city);
        sql += ` AND city = $${params.length}`;
      }

      sql += ' ORDER BY created_at DESC';
      const { rows } = await pool.query(sql, params);

      const donors = rows.map(r => ({
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

      return res.status(200).json({ success: true, count: donors.length, donors });
    }

    // 2. تسجيل متبرع مع فحص ومنع تكرار رقم الهاتف
    if (req.method === 'POST') {
      const { code, blood, city, phone, preferredTime, lastDonationDate } = req.body;

      if (!phone || !blood || !city) {
        return res.status(400).json({ success: false, message: 'بيانات غير مكتملة' });
      }

      const checkExists = await pool.query('SELECT phone FROM donors WHERE phone = $1', [phone]);
      if (checkExists.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'رقم الهاتف مسجل بالفعل في المنظومة!' });
      }

      const id = 'd_' + Date.now();
      const insertSql = `
        INSERT INTO donors (id, code, blood, city, phone, preferred_time, last_donation_date, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const values = [id, code, blood, city, phone, preferredTime || '24/7', lastDonationDate || '', false];
      const result = await pool.query(insertSql, values);

      return res.status(201).json({ success: true, donor: result.rows[0] });
    }

    return res.status(405).json({ message: 'طريقة الطلب غير مدعومة' });
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في الاتصال بقاعدة البيانات', error: error.message });
  }
}
