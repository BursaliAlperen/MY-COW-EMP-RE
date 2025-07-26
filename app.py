import sqlite3

# Veritabanına bağlan (dosya oluşturulur eğer yoksa)
conn = sqlite3.connect("veritabani.db")
cursor = conn.cursor()

# Tablo oluştur
cursor.execute("""
CREATE TABLE IF NOT EXISTS kullanicilar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isim TEXT,
    yas INTEGER
)
""")

# Veri ekle
cursor.execute("INSERT INTO kullanicilar (isim, yas) VALUES (?, ?)", ("Ahmet", 30))

# Verileri getir
cursor.execute("SELECT * FROM kullanicilar")
sonuclar = cursor.fetchall()
for satir in sonuclar:
    print(satir)

# Bağlantıyı kapat
conn.commit()
conn.close()
