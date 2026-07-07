import json
import re
import os

def normalize_title(title):
    if not title:
        return ""
    # Remove punctuation, convert to lowercase, normalize whitespace
    norm = re.sub(r'[^\w\s]', '', title.lower().strip())
    return ' '.join(norm.split())

def main():
    koha_file = "data/koha/catalog.json"
    goodreads_books_file = "goodreads/goodreads_books.json"
    output_mapping_file = "data/koha_goodreads_mapping.json"
    
    if not os.path.exists(koha_file):
        print(f"Error: {koha_file} not found. Please run fetch_koha_catalog.py first.")
        return
        
    if not os.path.exists(goodreads_books_file):
        print(f"Error: {goodreads_books_file} not found.")
        return

    print("Loading Koha catalog...")
    with open(koha_file, 'r', encoding='utf-8') as f:
        koha_catalog = json.load(f)
        
    print(f"Loaded {len(koha_catalog)} Koha books.")
    
    # Map normalized titles to Koha books
    koha_titles = {}
    for book in koha_catalog:
        title = book.get('title', '').strip()
        if title:
            norm = normalize_title(title)
            koha_titles[norm] = book
            
    print(f"Indexed {len(koha_titles)} unique normalized Koha titles.")
    
    # Scan Goodreads books to match works and fetch descriptions
    print("Scanning Goodreads books for title matches and descriptions...")
    matched_work_ids = {}      # work_id -> Koha metadata + description
    work_id_to_gr_books = {}   # work_id -> list of GR book_ids
    total_scanned = 0
    match_count = 0
    
    with open(goodreads_books_file, 'r', encoding='utf-8') as f:
        for line in f:
            total_scanned += 1
            if total_scanned % 500000 == 0:
                print(f"  Scanned {total_scanned} books... found {match_count} matches so far.")
                
            try:
                gb = json.loads(line.strip())
            except:
                continue
                
            gr_title = gb.get('title', '').strip()
            gr_norm = normalize_title(gr_title)
            work_id = gb.get('work_id', '').strip()
            book_id = gb.get('book_id', '').strip()
            desc = gb.get('description', '').strip()
            
            # Map work_id to all of its book_ids
            if work_id and book_id:
                work_id_to_gr_books.setdefault(work_id, []).append(book_id)
                
            # Check for title match
            if gr_norm in koha_titles and work_id:
                if work_id not in matched_work_ids:
                    kb = koha_titles[gr_norm]
                    matched_work_ids[work_id] = {
                        'biblio_id': kb['biblio_id'],
                        'koha_title': kb['title'],
                        'koha_author': kb.get('author', ''),
                        'gr_title': gr_title,
                        'description': desc
                    }
                    match_count += 1
                else:
                    # Update description if we find a longer/better one
                    existing_desc = matched_work_ids[work_id].get('description', '')
                    if len(desc) > len(existing_desc):
                        matched_work_ids[work_id]['description'] = desc
                    
    print(f"\nScan completed. Scanned {total_scanned} books.")
    print(f"Found {len(matched_work_ids)} matched unique works.")
    
    # Expand to all GR book_ids under those works
    all_gr_book_ids = []
    work_to_koha = {}
    
    for work_id, koha_info in matched_work_ids.items():
        gr_bids = work_id_to_gr_books.get(work_id, [])
        all_gr_book_ids.extend(gr_bids)
        work_to_koha[work_id] = {
            'biblio_id': koha_info['biblio_id'],
            'koha_title': koha_info['koha_title'],
            'koha_author': koha_info['koha_author'],
            'description': koha_info.get('description', ''),
            'gr_book_ids': gr_bids
        }
        
    print(f"Total Goodreads book IDs (all editions/translations): {len(all_gr_book_ids)}")
    
    # Save the mapping
    mapping_data = {
        'work_to_koha': work_to_koha,
        'all_gr_book_ids': sorted(list(set(all_gr_book_ids)))
    }
    
    os.makedirs(os.path.dirname(output_mapping_file), exist_ok=True)
    with open(output_mapping_file, 'w', encoding='utf-8') as f:
        json.dump(mapping_data, f, indent=2, ensure_ascii=False)
        
    print(f"Mapping successfully saved to {output_mapping_file}")

if __name__ == "__main__":
    main()
