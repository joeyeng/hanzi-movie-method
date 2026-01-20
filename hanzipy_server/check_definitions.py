import sqlite3

conn = sqlite3.connect('/app/public/hanzi_data.db')
cursor = conn.cursor()

for word in ['上', '个', '能']:
    print(f"\n=== {word} ===")
    cursor.execute("SELECT pinyin, definition, rank FROM word_definitions WHERE word = ? ORDER BY rank", (word,))
    rows = cursor.fetchall()
    for row in rows:
        print(f"  rank {row[2]}: {row[0]} - {row[1][:100]}{'...' if len(row[1]) > 100 else ''}")

conn.close()
