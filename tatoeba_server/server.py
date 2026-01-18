"""
Tatoeba Chinese Example Sentences API Server
Serves example sentences from the Tatoeba SQLite database
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DB_PATH = '/app/sen_data.db'

def get_db_connection():
    """Get a database connection with row factory for dict-like access"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM examples")
        count = cursor.fetchone()[0]
        conn.close()
        return jsonify({
            'status': 'ok',
            'sentence_count': count
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/search', methods=['GET', 'POST'])
def search_sentences():
    """
    Search for example sentences containing a word or phrase
    GET params: q (query), limit (optional, default 5)
    POST body: { "query": "你好", "limit": 5 }
    Response: { "results": [...], "count": N }
    """
    if request.method == 'GET':
        query = request.args.get('q', '')
        limit = request.args.get('limit', 5, type=int)
    else:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Missing query parameter'}), 400
        query = data['query']
        limit = data.get('limit', 5)
    
    if not query:
        return jsonify({'error': 'Missing query parameter'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Search for sentences containing the query in simplified Chinese
        # Fetch extra to account for duplicates
        cursor.execute("""
            SELECT id, simplified, traditional, pinyin, english
            FROM examples
            WHERE simplified LIKE ?
            ORDER BY LENGTH(simplified) ASC
            LIMIT ?
        """, (f'%{query}%', limit * 3))
        
        rows = cursor.fetchall()
        conn.close()
        
        # Deduplicate by simplified text
        seen_simplified = set()
        sentences = []
        for row in rows:
            if row['simplified'] not in seen_simplified:
                seen_simplified.add(row['simplified'])
                sentences.append({
                    'id': row['id'],
                    'simplified': row['simplified'],
                    'pinyin': row['pinyin'],
                    'english': row['english']
                })
                if len(sentences) >= limit:
                    break
        
        return jsonify({
            'results': sentences,
            'count': len(sentences),
            'query': query
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/search/batch', methods=['POST'])
def search_sentences_batch():
    """
    Search for example sentences for multiple words/phrases
    Request body: { "queries": ["你好", "谢谢"], "limit": 3 }
    Response: { "results": { "你好": [...], "谢谢": [...] } }
    """
    data = request.get_json()
    if not data or 'queries' not in data:
        return jsonify({'error': 'Missing queries parameter'}), 400
    
    queries = data['queries']
    if not isinstance(queries, list):
        return jsonify({'error': 'Queries must be a list'}), 400
    
    limit = data.get('limit', 3)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        results = {}
        for query in queries:
            cursor.execute("""
                SELECT id, simplified, traditional, pinyin, english
                FROM examples
                WHERE simplified LIKE ?
                ORDER BY LENGTH(simplified) ASC
                LIMIT ?
            """, (f'%{query}%', limit * 3))
            
            rows = cursor.fetchall()
            
            # Deduplicate by simplified text
            seen_simplified = set()
            sentences = []
            for row in rows:
                if row['simplified'] not in seen_simplified:
                    seen_simplified.add(row['simplified'])
                    sentences.append({
                        'id': row['id'],
                        'simplified': row['simplified'],
                        'pinyin': row['pinyin'],
                        'english': row['english']
                    })
                    if len(sentences) >= limit:
                        break
            
            results[query] = sentences
        
        conn.close()
        
        return jsonify({
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/random', methods=['GET'])
def random_sentence():
    """
    Get a random example sentence
    Query params: ?count=5
    """
    count = request.args.get('count', 1, type=int)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, simplified, traditional, pinyin, english
            FROM examples
            ORDER BY RANDOM()
            LIMIT ?
        """, (count,))
        
        rows = cursor.fetchall()
        conn.close()
        
        sentences = [
            {
                'id': row['id'],
                'simplified': row['simplified'],
                'pinyin': row['pinyin'],
                'english': row['english']
            }
            for row in rows
        ]
        
        return jsonify({
            'sentences': sentences,
            'count': len(sentences)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Database exists: {os.path.exists(DB_PATH)}")
    print(f"Starting Tatoeba Example Sentences server on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
