import sqlite3
import os
import urllib.request
import gzip
import re

# Also check the raw CC-CEDICT data
CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz'

print("Downloading CC-CEDICT...")
response = urllib.request.urlopen(CEDICT_URL)
data = gzip.decompress(response.read()).decode('utf-8')
lines = [l for l in data.split('\n') if l and not l.startswith('#')]

pattern = re.compile(r'^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+(.+)$')

for word in ['上', '个', '能']:
    print(f"\n=== {word} (CC-CEDICT raw) ===")
    for line in lines:
        m = pattern.match(line)
        if m:
            trad, simp, pinyin, definition = m.groups()
            if simp == word:
                print(f"  [{pinyin}] {definition[:80]}{'...' if len(definition) > 80 else ''}")

# Also check the database
print("\n\n=== DATABASE CONTENTS ===")
db_path = os.path.join(os.path.dirname(__file__), 'public', 'hanzi_data.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

for word in ['上', '个', '能']:
    print(f"\n=== {word} ===")
    cursor.execute("SELECT pinyin, definition, rank FROM word_definitions WHERE word = ? ORDER BY rank", (word,))
    rows = cursor.fetchall()
    for row in rows:
        print(f"  rank {row[2]}: {row[0]} - {row[1][:100]}{'...' if len(row[1]) > 100 else ''}")

conn.close()
