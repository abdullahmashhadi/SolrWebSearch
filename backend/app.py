from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
SOLR_URL = "http://localhost:8983/solr/mycollection"
@app.route('/api/search', methods=['GET'])
def search():
    """Enhanced search endpoint that forwards queries to Solr"""
    query = request.args.get('q', '*:*')
    category = request.args.get('category', '')
    start = request.args.get('start', '0')
    rows = request.args.get('rows', '10')
    sort = request.args.get('sort', '')
    
    # For empty queries, show all results
    if not query or query.strip() == '':
        query = '*:*'
    
    # Build Solr query - use only fields we know exist
    if ':' in query:
        # If user specified fields (like category:java), use as-is
        solr_params = {
            'q': query,
            'start': start,
            'rows': rows,
            'wt': 'json',
            'hl': 'true',
            'hl.fl': 'title,category,author',  # Fields that exist in schema
            'hl.snippets': '3',
            'hl.fragsize': '200'
        }
    else:
        # If query doesn't specify fields, search across multiple fields that exist
        solr_params = {
            'q': f'title:({query})^10 OR category:({query})^8 OR author:({query})^5 OR _text_:({query})^2',
            'start': start,
            'rows': rows,
            'wt': 'json',
            'hl': 'true',
            'hl.fl': 'title,category,author',  # Fields that exist in schema
            'hl.snippets': '3',
            'hl.fragsize': '200'
        }
    
    # Add category filter if provided
    if category:
        solr_params['fq'] = f'category:{category}'
    
    # Add sorting if provided
    if sort:
        solr_params['sort'] = sort
    
    # Debug
    print(f"Solr query parameters: {solr_params}")
    
    # Execute query to Solr
    try:
        response = requests.get(f"{SOLR_URL}/select", params=solr_params)
        
        # Debug response status
        print(f"Solr response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error response from Solr: {response.text}")
            return jsonify({"error": "Error response from Solr", "response": {"numFound": 0, "docs": []}}), 500
            
        solr_data = response.json()
        return jsonify(solr_data)
    except Exception as e:
        print(f"Exception in search: {str(e)}")
        return jsonify({"error": str(e), "response": {"numFound": 0, "docs": []}}), 500
@app.route('/api/autocomplete', methods=['GET'])
def autocomplete():
    """Enhanced autocomplete endpoint for search suggestions"""
    term = request.args.get('term', '')
    
    if not term or term.strip() == '':
        return jsonify([])
    
    # Query both titles and content for autocomplete
    solr_params = {
        'q': f'title:({term}*)^10 OR content:({term}*)^5 OR category:({term}*)^8',
        'fl': 'title,category,id',
        'rows': 8,
        'wt': 'json'
    }
    
    try:
        response = requests.get(f"{SOLR_URL}/select", params=solr_params)
        data = response.json()
        
        suggestions = []
        term_lower = term.lower()
        
        # Extract titles and categories for autocomplete suggestions
        if 'response' in data and 'docs' in data['response']:
            seen = set()  # To avoid duplicates
            
            # First add exact category matches
            for doc in data['response']['docs']:
                if 'category' in doc and doc['category'].lower() == term_lower and 'category:'+doc['category'] not in seen:
                    suggestions.append({
                        'label': f"Category: {doc['category']}",
                        'value': f"category:{doc['category']}",
                        'category': 'category'
                    })
                    seen.add('category:'+doc['category'])
            
            # Then add title suggestions
            for doc in data['response']['docs']:
                if 'title' in doc and doc['title'] not in seen:
                    suggestions.append({
                        'label': doc['title'],
                        'value': doc['title'],
                        'category': 'title'
                    })
                    seen.add(doc['title'])
        
        # Always add the term itself if it's not already included
        if term not in [s['value'] for s in suggestions]:
            suggestions.append({
                'label': term,
                'value': term,
                'category': 'query'
            })
            
        return jsonify(suggestions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories', methods=['GET'])
def categories():
    """Get all available categories as facets from Solr"""
    solr_params = {
        'q': '*:*',
        'facet': 'true',
        'facet.field': 'category',
        'facet.limit': '30',
        'facet.mincount': '1',  # Only return categories that have at least one document
        'rows': 0,
        'wt': 'json'
    }
    
    try:
        response = requests.get(f"{SOLR_URL}/select", params=solr_params)
        data = response.json()
        
        # Debug output
        print("Categories response:", data)
        
        categories = []
        if 'facet_counts' in data and 'facet_fields' in data['facet_counts'] and 'category' in data['facet_counts']['facet_fields']:
            facet_data = data['facet_counts']['facet_fields']['category']
            # Solr returns facets as [term1, count1, term2, count2, ...]
            for i in range(0, len(facet_data), 2):
                if i+1 < len(facet_data) and facet_data[i+1] > 0:  # Only add if count > 0
                    categories.append({
                        'name': facet_data[i],
                        'count': facet_data[i+1]
                    })
        
        # Even if no categories found, add "All Categories"
        if not categories or len(categories) == 0:
            categories = [{"name": "All Categories", "count": 0}]
            
        return jsonify(categories)
    except Exception as e:
        print(f"Error in categories API: {str(e)}")
        return jsonify([{"name": "Error loading categories", "count": 0}]), 500

@app.route('/api/fields', methods=['GET'])
def fields():
    """Get schema fields for sorting options"""
    try:
        response = requests.get(f"{SOLR_URL}/schema/fields")
        data = response.json()
        
        sortable_fields = []
        if 'fields' in data:
            for field in data['fields']:
                # Only include sortable fields
                if field.get('stored', False) and field.get('type') not in ['text_general']:
                    sortable_fields.append({
                        'name': field['name'],
                        'type': field['type']
                    })
        
        return jsonify(sortable_fields)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)