const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Koneksi ke SQLite
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error(err.message);
  console.log('Terhubung ke database SQLite.');
});

// Buat tabel otomatis jika belum ada
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    template TEXT,
    dari TEXT,
    untuk TEXT,
    pesan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT,
    bintang INTEGER,
    komentar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// 1. API Buat Link Bucin Baru
app.post('/api/buat', (req, res) => {
  const { template, dari, untuk, pesan } = req.body;
  const id = Math.random().toString(36).substring(2, 7); // Kode acak 5 huruf

  db.run(
    `INSERT INTO links (id, template, dari, untuk, pesan) VALUES (?, ?, ?, ?, ?)`,
    [id, template, dari, untuk, pesan],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ url: `/v/${id}` });
    }
  );
});

// 2. API Ambil Semua Ulasan & Rata-rata Bintang
app.get('/api/ulasan', (req, res) => {
  db.all(`SELECT * FROM reviews ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 3. API Kirim Ulasan & Bintang Baru
app.post('/api/ulasan', (req, res) => {
  const { nama, bintang, komentar } = req.body;
  if (!nama || !bintang || !komentar) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi!' });
  }

  db.run(
    `INSERT INTO reviews (nama, bintang, komentar) VALUES (?, ?, ?)`,
    [nama, bintang, komentar],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// 4. Halaman Hasil Template Bucin (/v/:id)
app.get('/v/:id', (req, res) => {
  db.get(`SELECT * FROM links WHERE id = ?`, [req.params.id], (err, row) => {
    if (!row) return res.status(404).send('<h1>Waduh, link tidak ditemukan!</h1>');

    // Render tampilan sesuai template yang dipilih
    if (row.template === 'tombol-kabur') {
      res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Untuk ${row.untuk}</title>
          <style>
            body { font-family: sans-serif; text-align: center; background: #ffe6eb; padding: 50px 20px; overflow: hidden; }
            .card { background: white; padding: 30px; border-radius: 20px; max-width: 400px; margin: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            button { padding: 12px 24px; font-size: 16px; border: none; border-radius: 10px; cursor: pointer; margin: 10px; }
            #btnYa { background: #ff4d6d; color: white; font-weight: bold; }
            #btnEnggak { background: #ccc; position: absolute; transition: 0.2s; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Hai ${row.untuk} ❤️</h2>
            <p>${row.pesan}</p>
            <p><small>Dari: <b>${row.dari}</b></small></p>
            <button id="btnYa" onclick="alert('Yeay! Makasih udah mau nerima ❤️')">Mau / Iya</button>
            <button id="btnEnggak" onmouseover="kabur()" ontouchstart="kabur()">Enggak</button>
          </div>
          <script>
            function kabur() {
              const btn = document.getElementById('btnEnggak');
              btn.style.left = Math.random() * (window.innerWidth - 100) + 'px';
              btn.style.top = Math.random() * (window.innerHeight - 50) + 'px';
            }
          </script>
        </body>
        </html>
      `);
    } else if (row.template === 'surat-amplop') {
      res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Surat Rahasia untuk ${row.untuk}</title>
          <style>
            body { font-family: 'Georgia', serif; background: #fff0f3; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .surat { background: #fffdf7; padding: 35px; border: 2px dashed #ff758f; border-radius: 15px; max-width: 420px; text-align: center; box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
            .hidden { display: none; }
            button { background: #ff4d6d; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="surat">
            <div id="tutup">
              <h2>💌 Ada Surat Buat ${row.untuk}</h2>
              <button onclick="bukaSurat()">Buka Surat</button>
            </div>
            <div id="isi" class="hidden">
              <h3>Untuk ${row.untuk},</h3>
              <p style="line-height: 1.6;">"${row.pesan}"</p>
              <p><b>— ${row.dari}</b></p>
            </div>
          </div>
          <script>
            function bukaSurat() {
              document.getElementById('tutup').classList.add('hidden');
              document.getElementById('isi').classList.remove('hidden');
            }
          </script>
        </body>
        </html>
      `);
    } else {
      // Template 3: Voucher Bucin
      res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Voucher Spesial ${row.untuk}</title>
          <style>
            body { font-family: sans-serif; background: #2b2d42; color: white; text-align: center; padding: 50px 20px; }
            .voucher { background: linear-gradient(135deg, #ff4d6d, #ff758f); padding: 30px; border-radius: 16px; max-width: 400px; margin: auto; border: 3px dashed white; }
          </style>
        </head>
        <body>
          <div class="voucher">
            <h3>🎟️ VOUCHER SPESIAL</h3>
            <h1>${row.pesan}</h1>
            <p>Khusus untuk: <b>${row.untuk}</b></p>
            <p><small>Berlaku selamanya • Diberikan oleh ${row.dari}</small></p>
          </div>
        </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => console.log(`server on at http://localhost:${PORT}`));
