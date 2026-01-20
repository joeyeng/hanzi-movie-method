import sqlite3
conn = sqlite3.connect('/app/../public/hanzi_data.db')
c = conn.cursor()
c.execute('SELECT word, pinyin, definition, rank FROM word_definitions WHERE word = ? ORDER BY rank', ('说',))
print('说 definitions:')
for r in c.fetchall():
    print(f'  rank {r[3]}: {r[1]} - {r[2][:60]}...')
