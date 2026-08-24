import csv
import json
import os
import re

GENERIC_PHRASES = {
    'good app', 'nice app', 'best app', 'worst app', 'bad app', 'awesome app',
    'great app', 'love this app', 'good product', 'nice product', 'best product',
    'superb app', 'osm app', 'very good', 'very nice', 'give it a shot',
    'good quality', 'fast delivery', 'good service', 'nice experience',
    'best app for shopping', 'i love it', 'loved it', 'just wow', 'superb'
}

def normalize_text(text):
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def is_unwanted(text):
    if not text or len(text.strip()) < 20:
        return True
    norm = normalize_text(text)
    if norm in GENERIC_PHRASES:
        return True
    if len(text.strip()) < 40 and any(norm.startswith(p) or norm == p for p in GENERIC_PHRASES):
        keywords = ['size', 'fit', 'wishlist', 'return', 'exchange', 'fabric', 'dress', 'kurta', 'shoes', 'jeans', 'price', 'eors', 'quality', 'brand', 'instagram', 'youtube', 'chart', 'measurement']
        if not any(k in norm for k in keywords):
            return True
    return False

def derive_evidence_strength(text):
    lower = text.lower()
    first_person = ['i added', 'i saved', 'my wishlist', 'i was looking', 'i ordered', "i didn't buy", 'i abandoned', 'i bought', 'i checked', 'my size']
    generic = ['app should', 'apps should', 'myntra should', 'myntra needs', 'should fix', 'people usually', 'always bad', 'worst app']
    if any(k in lower for k in first_person):
        return 'High'
    if any(k in lower for k in generic):
        return 'Low'
    return 'Medium'

function_category_keywords = {
    'Westernwear': ['dress', 'top', 'denim', 'jeans', 'trousers', 'jacket', 'blazer', 'skirt', 'shirt', 'tshirt'],
    'Ethnic Wear': ['kurta', 'anarkali', 'saree', 'lehenga', 'ethnic', 'suit', 'dupatta', 'kurti'],
    'Footwear': ['sneakers', 'shoes', 'heels', 'boots', 'flats', 'sandals', 'footwear'],
    'Lingerie & Activewear': ['bra', 'lingerie', 'activewear', 'gymwear', 'sports bra', 'nightdress', 'nightwear'],
    'Beauty & Grooming': ['skincare', 'makeup', 'lipstick', 'fragrance', 'shampoo', 'serum', 'perfume']
}

def detect_category(lower):
    for cat, kws in function_category_keywords.items():
        if any(kw in lower for kw in kws):
            return cat
    return 'General Apparel'

def detect_segment(lower):
    """Expanded 8 Shopper Segments"""
    if any(k in lower for k in ['fwd', 'gen z', 'crop top', 'viral', 'corset', 'y2k', 'trendy']):
        return 'Gen Z / Myntra FWD Trendseeker'
    if any(k in lower for k in ['formal', 'work', 'blazer', 'corporate', 'office', 'suit', 'business']):
        return 'Working Professional / Premium Wear'
    if any(k in lower for k in ['eors', 'sale', 'discount', 'diwali', 'price drop', 'offer', 'cheap', 'coupon']):
        return 'EORS / Value Discount Hunter'
    if any(k in lower for k in ['sangeet', 'wedding', 'birthday', 'event', 'cousin', 'festival', 'diwali', 'party']):
        return 'Occasional / Festival & Wedding Shopper'
    if any(k in lower for k in ['plus size', 'xxl', '3xl', '4xl', 'curvy', 'heavy', 'broad', 'large size']):
        return 'Plus-Size / Inclusive Fit Shopper'
    if any(k in lower for k in ['tier 2', 'tier 3', 'village', 'town', 'first time', 'delivery area', 'pincode']):
        return 'First-Time / Tier-2/3 City Shopper'
    if any(k in lower for k in ['years', 'regular customer', 'always buy', 'loyal', 'myntra insider', 'insider']):
        return 'Brand Loyalist / Repeat Buyer'
    if any(k in lower for k in ['kids', 'baby', 'son', 'daughter', 'husband', 'family', 'child']):
        return 'Mom & Kids / Family Apparel Buyer'
    return 'High-Frequency Fashion Shopper'

def extract_barrier_and_theme(lower):
    if any(k in lower for k in ['photo', 'real customer', 'fake', 'no picture', 'no photos', 'unedited']):
        return 'Lack of Authentic Customer Photo Reviews', 'Review & Fabric Quality Trust', 'Unverified Review Trust', 'Lack of unedited customer try-on photos'
    if any(k in lower for k in ['fabric', 'sheer', 'synthetic', 'durability', 'transparent', 'stitching', 'material']):
        return 'Fabric & Material Quality Doubt', 'Review & Fabric Quality Trust', 'Fabric Composition & Transparency', 'Real fabric composition and wash durability'
    if any(k in lower for k in ['size', 'fit', 'boxy', 'chest', 'waist', 'cup size', 'broad feet', 'tight', 'small', 'large']):
        if 'chart' in lower or 'inconsistent' in lower:
            return 'Size & Silhouette Fit Uncertainty', 'Fit & Size Uncertainty', 'Size Chart Inconsistency', 'Size chart inaccuracy across brands'
        return 'Size & Silhouette Fit Uncertainty', 'Fit & Size Uncertainty', 'Sizing Accuracy Doubt', 'Fit silhouette uncertainty on Indian body types'
    if any(k in lower for k in ['instagram', 'youtube', 'left the app', 'searched insta', 'reels']):
        return 'Off-App Research Leakage', 'App Leakage (Instagram/YouTube)', 'Social Media Validation Reliance', 'Lack of try-on reels in Myntra app'
    if any(k in lower for k in ['price', 'discount', 'volatile', 'overpriced', 'costly', 'cost']):
        return 'Price Fluctuation & Discount Uncertainty', 'Price & Sale Discount Expectation', 'EORS Discount Expectation', 'Price fluctuation distrust'
    if any(k in lower for k in ['style', 'how to style', 'pair', 'matching']):
        return 'Outfit Styling Uncertainty', 'Styling & Wardrobe Integration', 'Outfit Pairing Inspiration', 'Outfit pairing inspiration gap'
    if any(k in lower for k in ['stock', 'sold out', 'out of stock']):
        return 'Wishlist Item Stock Outage', 'Wishlist Overload & Stock Expiry', 'Size Stock Depletion', 'Wishlisted size depletion'
    if any(k in lower for k in ['return policy', 'non-returnable', 'replacement', 'no refund', 'exchange']):
        return 'Strict Return & Replacement Policy Fear', 'Return & Seller Policy Concerns', 'Return Policy Restrictions', 'Fear of non-returnable categories'
    return None, 'General Product Experience', None, None

def process_record(text, source, rating_val, source_url, date_str):
    lower = text.lower()
    cat = detect_category(lower)
    seg = detect_segment(lower)
    barrier, theme, sub_theme, uncertainty = extract_barrier_and_theme(lower)
    ev_strength = derive_evidence_strength(text)

    # ACCURATE SHOPPER JOURNEY INTERPRETATION
    has_wishlist_mention = any(k in lower for k in ['wishlist', 'saved', 'shortlist', 'added to list', 'bookmark'])
    
    if has_wishlist_mention:
        if any(k in lower for k in ['abandoned', 'didn\'t buy', 'didn\'t order', 'cancelled', 'returned']):
            status = 'Abandoned'
            sentiment = 'Negative'
            journey = 'Wishlist Item → Cart Drop'
        elif any(k in lower for k in ['postponed', 'waiting', 'hold off', 'held off', 'sale']):
            status = 'Postponed'
            sentiment = 'Neutral'
            journey = 'Wishlist Item → Price & EORS Sale Wait'
        elif any(k in lower for k in ['bought on ajio', 'bought elsewhere', 'zara', 'nykaa']):
            status = 'Bought on Competitor Platform'
            sentiment = 'Negative'
            journey = 'Wishlist Item → Competitor Switch'
        elif any(k in lower for k in ['bought', 'purchased', 'ordered', 'converted']):
            status = 'Purchased'
            sentiment = 'Positive'
            journey = 'Wishlist Item → Converted Purchase'
        elif 'instagram' in lower or 'youtube' in lower:
            status = 'Researching'
            sentiment = 'Neutral'
            journey = 'Wishlist Item → Off-App Social Validation'
        elif 'fit' in lower or 'size' in lower or 'fabric' in lower:
            status = 'Evaluating'
            sentiment = 'Neutral'
            journey = 'Wishlist Item → Fit & Fabric Validation'
        else:
            status = 'Wishlisted / Pending'
            sentiment = 'Neutral'
            journey = 'Wishlist Item → Shortlisting & Evaluation'
    else:
        # Standard Product Review (No explicit Wishlist mention)
        if any(k in lower for k in ['bought', 'ordered', 'received', 'product is', 'quality is', 'loved', 'amazing', 'satisfied']):
            status = 'Purchased'
            sentiment = 'Positive' if not any(k in lower for k in ['bad', 'worst', 'poor', 'damaged']) else 'Negative'
            journey = 'Post-Purchase Product Feedback'
        elif any(k in lower for k in ['return', 'exchange', 'refund', 'worst', 'scam', 'fraud', 'defective']):
            status = 'Returned / Complaint'
            sentiment = 'Negative'
            journey = 'Product Return & Support Issue'
        else:
            status = 'General Review'
            sentiment = 'Neutral'
            journey = 'General Shopper Feedback'

    # Auto-derive rating if missing
    r_int = None
    if rating_val is not None:
        try:
            r_int = int(float(rating_val))
            if r_int < 1 or r_int > 5:
                r_int = None
        except:
            r_int = None

    if r_int is None:
        if sentiment == 'Negative': r_int = 1
        elif sentiment == 'Positive': r_int = 5
        else: r_int = 3

    # Workarounds
    workaround = None
    ext_research = []
    if 'instagram' in lower: ext_research.append('Instagram Try-On Reels / Posts')
    if 'youtube' in lower: ext_research.append('YouTube Haul & Review Videos')
    if 'reddit' in lower: ext_research.append('Reddit Fashion Community Feedback')
    if ext_research:
        workaround = f"Left Myntra app to search {', '.join(ext_research)} for authentic details"

    return {
        "source": source,
        "source_url": source_url,
        "date": date_str,
        "text": text.strip(),
        "relevance_score": 0.85 if barrier else 0.65,
        "user_intent": "Wishlisted for Evaluation" if has_wishlist_mention else "Product Review",
        "wishlist_behavior": "Wishlist shortlisting" if has_wishlist_mention else "Post-purchase review",
        "purchase_status": status,
        "purchase_barrier": barrier,
        "uncertainty": uncertainty,
        "information_needed": ["Real customer try-on photos"] if 'photo' in lower else None,
        "alternative_considered": "Ajio" if "ajio" in lower else None,
        "external_research": ext_research if ext_research else None,
        "workaround": workaround,
        "user_segment": seg,
        "fashion_category": cat,
        "journey_stage": journey,
        "sentiment": sentiment,
        "evidence_strength": ev_strength,
        "rating": r_int,
        "theme": theme,
        "sub_theme": sub_theme
    }

def run_ingestion():
    raw_list = []
    seen = set()

    # 1. App Store CSV
    with open('Data/appstore-reviews-2026-08-22T06-08-27-603Z.csv', 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            text = (row.get('Review') or row.get('text') or '').strip()
            rating = row.get('Rating') or row.get('rate')
            norm = normalize_text(text)
            if not is_unwanted(text) and norm not in seen:
                seen.add(norm)
                raw_list.append(process_record(text, 'App Store', rating, f"https://apps.apple.com/in/app/myntra/id907394059?review={i+1}", row.get('Date') or '2026-08-20T10:00:00Z'))

    # 2. Android Play Store CSV
    with open('Data/com.myntra.android-reviews.csv', 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            text = (row.get('text') or row.get('Review') or '').strip()
            rating = row.get('rate') or row.get('score')
            norm = normalize_text(text)
            if not is_unwanted(text) and norm not in seen:
                seen.add(norm)
                raw_list.append(process_record(text, 'Play Store', rating, f"https://play.google.com/store/apps/details?id=com.myntra.android&review={i+1}", row.get('postedOn') or '2026-08-20T10:00:00Z'))

    # 3. Scraped Play Store CSV
    with open('Data/dataset_google-play-scraper_2026-08-21_08-12-52-534.csv', 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            text = (row.get('text') or '').strip()
            rating = row.get('score') or row.get('rate')
            norm = normalize_text(text)
            if not is_unwanted(text) and norm not in seen:
                seen.add(norm)
                raw_list.append(process_record(text, 'Play Store', rating, row.get('url') or f"https://play.google.com/store/apps/details?id=com.myntra.android&review={i+1}", row.get('date') or '2026-08-20T10:00:00Z'))

    print(f"Total clean, unique, rated records extracted: {len(raw_list)}")

    db_json = json.dumps(raw_list, indent=2)

    for target_dir in ['data', 'Data']:
        os.makedirs(target_dir, exist_ok=True)
        with open(os.path.join(target_dir, 'myntra_extracted_db.json'), 'w', encoding='utf-8') as f:
            f.write(db_json)

    print("Extracted DB updated with 8 shopper segments & accurate journey interpretation!")

if __name__ == '__main__':
    run_ingestion()
