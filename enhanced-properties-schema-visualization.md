# Enhanced Properties Table Schema Visualization

## Current vs Enhanced Properties Table

Based on user preferences for apartment features, here's how the properties table would look with enhanced fields:

### Core Property Information
| Field | Type | Description | Hebrew |
|-------|------|-------------|---------|
| `id` | UUID | Unique identifier | - |
| `title` | VARCHAR(500) | Property title | כותרת |
| `description` | TEXT | Full description | תיאור |
| `price_per_month` | DECIMAL(10,2) | Monthly rent/sale price | מחיר |
| `currency` | VARCHAR(3) | Currency (₪, USD, etc) | מטבע |

### Location & Basic Info
| Field | Type | Description | Hebrew |
|-------|------|-------------|---------|
| `location_text` | VARCHAR(500) | Address/area text | כתובת |
| `latitude` | DECIMAL(10,7) | GPS coordinates | קו רוחב |
| `longitude` | DECIMAL(10,7) | GPS coordinates | קו אורך |
| `city` | VARCHAR(100) | City name | עיר |
| `neighborhood` | VARCHAR(100) | Neighborhood | שכונה |

### **🆕 ENHANCED FIELDS - User Priorities**

#### Physical Property Features
| Field | Type | Description | Hebrew | Priority |
|-------|------|-------------|---------|----------|
| `square_meters` | INTEGER | **Area in m²** | **שטח במ״ר** | ⭐⭐⭐ |
| `bedrooms` | INTEGER | **Number of rooms** | **מספר חדרים** | ⭐⭐⭐ |
| `floor` | INTEGER | **Floor number** | **קומה** | ⭐⭐ |
| `total_floors` | INTEGER | Building total floors | סה״כ קומות | ⭐ |

#### Essential Amenities
| Field | Type | Description | Hebrew | Priority |
|-------|------|-------------|---------|----------|
| `has_parking` | BOOLEAN | **Parking available** | **חנייה** | ⭐⭐⭐ |
| `has_elevator` | BOOLEAN | **Elevator in building** | **מעלית** | ⭐⭐ |
| `has_balcony_garden` | BOOLEAN | **Balcony/Garden** | **מרפסת/גינה** | ⭐⭐ |
| `has_safe_room` | BOOLEAN | **Protected room (Mamad)** | **ממ״ד** | ⭐⭐ |
| `is_furnished` | BOOLEAN | **Furnished apartment** | **מרוהטת** | ⭐⭐ |
| `pets_allowed` | BOOLEAN | **Pets allowed** | **בעלי חיים** | ⭐⭐ |

#### Neighborhood Features
| Field | Type | Description | Hebrew | Priority |
|-------|------|-------------|---------|----------|
| `near_shopping_centers` | BOOLEAN | **Near shopping centers** | **מרכזים מסחריים** | ⭐⭐ |
| `near_schools` | BOOLEAN | **Near educational institutions** | **מוסדות חינוך** | ⭐⭐ |
| `shopping_distance_meters` | INTEGER | Distance to nearest mall | מרחק למרכז קניות | ⭐ |
| `school_distance_meters` | INTEGER | Distance to nearest school | מרחק לבית ספר | ⭐ |

#### Financial Information
| Field | Type | Description | Hebrew | Priority |
|-------|------|-------------|---------|----------|
| `additional_payments` | DECIMAL(8,2) | **Monthly additional costs** | **תשלומים נוספים** | ⭐⭐⭐ |
| `house_committee_fee` | DECIMAL(8,2) | Building maintenance fee | ועד בית | ⭐⭐ |
| `property_tax` | DECIMAL(8,2) | Annual property tax | ארנונה | ⭐⭐ |
| `price_vs_area_ratio` | DECIMAL(8,2) | **Price per m² analysis** | **מחיר ביחס לאזור** | ⭐⭐⭐ |

### Existing Fields (Current Schema)
| Field | Type | Description | Hebrew |
|-------|------|-------------|---------|
| `listing_type` | VARCHAR(10) | rent/sale | סוג רישום |
| `source_platform` | VARCHAR(50) | yad2/yad1/etc | מקור |
| `is_active` | BOOLEAN | Still available | פעיל |
| `created_at` | TIMESTAMP | When added | נוצר בתאריך |
| `updated_at` | TIMESTAMP | Last updated | עודכן בתאריך |

## Sample Enhanced Properties Table Row

```sql
INSERT INTO properties (
  -- Core Info
  id, title, price_per_month, currency,
  
  -- Location
  location_text, city, neighborhood,
  
  -- 🆕 Physical Features (User Priorities)
  square_meters, bedrooms, floor, total_floors,
  
  -- 🆕 Essential Amenities (User Priorities)
  has_parking, has_elevator, has_balcony_garden, has_safe_room,
  is_furnished, pets_allowed,
  
  -- 🆕 Neighborhood Features (User Priorities)
  near_shopping_centers, near_schools,
  shopping_distance_meters, school_distance_meters,
  
  -- 🆕 Financial Details (User Priorities)
  additional_payments, house_committee_fee, property_tax,
  price_vs_area_ratio,
  
  -- Existing
  listing_type, source_platform, is_active
)
VALUES (
  -- Core Info
  'uuid-123', 'דירת 4 חדרים מרווחת בתל אביב', 8500.00, '₪',
  
  -- Location  
  'רחוב דיזנגוף 100, תל אביב', 'תל אביב', 'מרכז העיר',
  
  -- 🆕 Physical Features
  95, 4, 3, 8,  -- 95m², 4 rooms, 3rd floor, 8 floors total
  
  -- 🆕 Essential Amenities
  true, true, true, true, false, true,  -- parking✓, elevator✓, balcony✓, mamad✓, not furnished✗, pets ok✓
  
  -- 🆕 Neighborhood
  true, true, 200, 150,  -- near shopping✓, near schools✓, 200m to mall, 150m to school
  
  -- 🆕 Financial
  1200.00, 800.00, 400.00, 89.47,  -- additional 1200₪, committee 800₪, tax 400₪, 89.47₪/m²
  
  -- Existing
  'rent', 'yad2', true
);
```

## Database Migration Required

```sql
-- Add new columns to existing properties table
ALTER TABLE properties 
ADD COLUMN square_meters INTEGER,
ADD COLUMN has_parking BOOLEAN DEFAULT false,
ADD COLUMN has_elevator BOOLEAN DEFAULT false,
ADD COLUMN has_balcony_garden BOOLEAN DEFAULT false,
ADD COLUMN has_safe_room BOOLEAN DEFAULT false,
ADD COLUMN is_furnished BOOLEAN DEFAULT false,
ADD COLUMN pets_allowed BOOLEAN DEFAULT false,
ADD COLUMN near_shopping_centers BOOLEAN DEFAULT false,
ADD COLUMN near_schools BOOLEAN DEFAULT false,
ADD COLUMN shopping_distance_meters INTEGER,
ADD COLUMN school_distance_meters INTEGER,
ADD COLUMN additional_payments DECIMAL(8,2),
ADD COLUMN house_committee_fee DECIMAL(8,2),
ADD COLUMN property_tax DECIMAL(8,2),
ADD COLUMN price_vs_area_ratio DECIMAL(8,2);

-- Add indexes for filtering
CREATE INDEX idx_properties_square_meters ON properties(square_meters);
CREATE INDEX idx_properties_has_parking ON properties(has_parking);
CREATE INDEX idx_properties_has_elevator ON properties(has_elevator);
CREATE INDEX idx_properties_additional_payments ON properties(additional_payments);
CREATE INDEX idx_properties_price_ratio ON properties(price_vs_area_ratio);
```

## Benefits of Enhanced Schema

1. **🔍 Better Filtering**: Users can filter by all their priority criteria
2. **💰 True Cost Transparency**: Show total monthly cost including additional payments
3. **📊 Smart Comparisons**: Calculate price per m² and compare to area averages
4. **🎯 Targeted Search**: Match users with apartments that fit their exact needs
5. **📈 Market Analytics**: Analyze trends in amenities, pricing, and location preferences

This enhanced schema captures all the key factors Israeli renters care about when choosing an apartment!