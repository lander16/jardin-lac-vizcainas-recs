import json
import csv
import os
import random

def main():
    mapping_file = "data/koha_goodreads_mapping.json"
    interactions_file = "goodreads/goodreads_interactions.csv"
    book_map_file = "goodreads/book_id_map.csv"
    user_map_file = "goodreads/user_id_map.csv"
    output_file = "data/koha_checkouts.csv"
    
    if not os.path.exists(mapping_file):
        print(f"Error: {mapping_file} not found. Please run match_koha_goodreads.py first.")
        return
        
    if not os.path.exists(interactions_file):
        print(f"Error: {interactions_file} not found.")
        return
        
    print("Loading Koha-Goodreads mapping...")
    with open(mapping_file, 'r', encoding='utf-8') as f:
        mapping = json.load(f)
        
    work_to_koha = mapping['work_to_koha']
    
    # Map Goodreads book_id to Koha book details
    gr_book_to_koha = {}
    for work_id, koha_info in work_to_koha.items():
        for gr_bid in koha_info.get('gr_book_ids', []):
            gr_book_to_koha[gr_bid] = {
                'biblio_id': koha_info['biblio_id'],
                'title': koha_info['koha_title'],
                'description': koha_info.get('description', '')
            }
            
    matched_gr_ids = set(gr_book_to_koha.keys())
    print(f"Loaded {len(matched_gr_ids)} matched Goodreads book IDs.")
    
    # Load book CSV ID to real Goodreads book ID map
    print("Loading book ID map...")
    book_id_map = {}
    with open(book_map_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            book_id_map[row['book_id_csv']] = row['book_id']
            
    # Load user CSV ID to real Goodreads user ID map
    print("Loading user ID map...")
    user_id_map = {}
    with open(user_map_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            user_id_map[row['user_id_csv']] = row['user_id']
            
    # Scan interactions to count matched books read per user
    print("Scanning interactions to identify eligible users...")
    user_checkouts = {}  # user_csv_id -> list of (gr_book_id, rating)
    total_interactions = 0
    
    with open(interactions_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_interactions += 1
            if total_interactions % 20000000 == 0:
                print(f"  Scanned {total_interactions/1000000:.0f}M interactions...")
                
            user_csv_id = row['user_id']
            book_csv_id = row['book_id']
            is_read = row.get('is_read', '0')
            rating = row.get('rating', '0')
            
            # Only count books read or rated
            if is_read != '1' and rating == '0':
                continue
                
            real_book_id = book_id_map.get(book_csv_id)
            if not real_book_id or real_book_id not in matched_gr_ids:
                continue
                
            user_checkouts.setdefault(user_csv_id, []).append(real_book_id)
            
    print(f"Total users with at least 1 match: {len(user_checkouts)}")
    
    # Filter users with at least 10 matches
    eligible_users = {uid: books for uid, books in user_checkouts.items() if len(books) >= 10}
    print(f"Total eligible users (>= 10 matches): {len(eligible_users)}")
    
    if len(eligible_users) < 300:
        print("Warning: Less than 300 eligible users found. Selecting all of them.")
        selected_uids = list(eligible_users.keys())
    else:
        # Select 300 users randomly using a seed
        random.seed(42)
        selected_uids = random.sample(list(eligible_users.keys()), 300)
        
    print(f"Selected {len(selected_uids)} users.")
    
    # Write output CSV
    print(f"Writing checkouts to {output_file}...")
    
    # Seed dates for realistic dates
    date_random = random.Random(42)
    
    with open(output_file, mode='w', encoding='utf-8', newline='') as f:
        fieldnames = ['user_id', 'book_id', 'title', 'description', 'checkout_date']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for user_csv_id in selected_uids:
            # Map user_csv_id to real user MD5 ID
            real_user_id = user_id_map.get(user_csv_id, f"user_{user_csv_id}")
            
            # Write row for each book they read
            books_read = eligible_users[user_csv_id]
            for gr_bid in books_read:
                koha_info = gr_book_to_koha[gr_bid]
                
                # Plausible random checkout date in 2025/2026
                year = date_random.choice([2025, 2026])
                month = date_random.randint(1, 12)
                day = date_random.randint(1, 28)
                hour = date_random.randint(8, 20)
                minute = date_random.randint(0, 59)
                second = date_random.randint(0, 59)
                checkout_date = f"{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}"
                
                writer.writerow({
                    'user_id': real_user_id,
                    'book_id': koha_info['biblio_id'],
                    'title': koha_info['title'],
                    'description': koha_info['description'],
                    'checkout_date': checkout_date
                })
                
    print(f"Successfully generated {output_file}.")

if __name__ == "__main__":
    main()
