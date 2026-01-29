# Kits Module Design & Architecture

## Overview
The Kits module allows users to create bundle packages of products. A Kit is a collection of Products with predefined quantities and a fixed price for the entire bundle.

## Current Architecture

### Backend (Express.js + MongoDB)

#### Kit Model (`server/models/Kit.js`)
```javascript
{
  name: String (unique, required),
  sku: String (auto-generated, unique),
  kit_id: Number (auto-incremented),
  description: String,
  price: Number (required, min: 0),
  products: [
    {
      product: ObjectId (ref: 'Product'),
      quantity: Number (min: 1)
    }
  ],
  shop: ObjectId (ref: 'ShopProfile'),
  createdBy: ObjectId (ref: 'User'),
  timestamps: true
}
```

#### API Routes (`server/routes/kits.js`)
| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/kits` | `kits:view` | Get all kits for a shop (requires shop query param) |
| GET | `/kits/:id` | `kits:view` | Get kit details with populated products |
| POST | `/kits` | `kits:create` | Create new kit (auto-generates SKU like `KIT-NAM-0001`) |
| PUT | `/kits/:id` | `kits:edit` | Update existing kit |
| DELETE | `/kits/:id` | `kits:delete` | Delete kit |

**SKU Format**: `KIT-{Name3Chars}-{AutoIncrement}`
- Example: `KIT-STU-0001` for a "Study Kit"

### Frontend (React TypeScript)

#### Components

**1. Kits List View (`src/components/Kits/Kits.tsx`)**
- Displays table of all kits with columns:
  - Name
  - SKU
  - Price (₹ formatted)
  - Products (bullet list with quantities)
  - Actions (Edit, Delete)
- Features:
  - Permission-based visibility (kits:create, kits:edit, kits:delete)
  - Delete with confirmation
  - Link to create/edit pages

**2. Kit Form (`src/components/Kits/KitForm.tsx`)**
- React Hook Form with dynamic field arrays
- Fields:
  - **Name** (required)
  - **Description** (optional)
  - **Price** (required, must be positive)
  - **Products** (required, min 1)
    - Dynamic rows with product dropdown + quantity input
    - Add/Remove product buttons
- Features:
  - Fetches available products on mount
  - Pre-populates form when editing
  - Auto-generates SKU on create (server-side)
  - Shows product names in dropdown

#### Service (`src/services/kitService.ts`)
```typescript
- getKits(shopId: string): Promise<Kit[]>
- getKitById(id: string): Promise<Kit>
- createKit(kitData: any): Promise<Kit>
- updateKit(id: string, kitData: any): Promise<Kit>
- deleteKit(id: string): Promise<void>
```

#### Type Definition (`src/types/models.ts`)
```typescript
interface Kit {
  _id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  products: {
    product: Product;  // Populated from Product model
    quantity: number;
    _id: string;
  }[];
  shop: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

## Data Flow

### Create Kit Flow
1. User navigates to `/kits/new`
2. KitForm loads available products via `getProducts()`
3. User fills form (name, description, price, products with quantities)
4. Submit → `createKit()` calls POST `/kits` with payload
5. Backend generates SKU and kit_id, saves to MongoDB
6. Redirect to `/kits` list

### Edit Kit Flow
1. User clicks edit on kit row
2. Navigate to `/kits/edit/:id`
3. KitForm fetches kit via `getKitById()` and pre-populates
4. User modifies fields
5. Submit → `updateKit()` calls PUT `/kits/:id`
6. Redirect to `/kits` list

### View Kits Flow
1. User navigates to `/kits`
2. Kits component fetches via `getKits(user.shop)`
3. Products within each kit are populated (name, price)
4. Display in table with edit/delete actions

## Current State & Observations

### ✅ Working Features
- Full CRUD operations for kits
- Product bundling with quantities
- Auto-SKU generation
- Permission-based access control
- Timestamp tracking (createdAt, updatedAt)
- Product population on API responses

### 🔧 Enhancement Opportunities

1. **Image/Visual Representation**
   - Add kit image field (like ProductForm now has)
   - Display thumbnail in list

2. **Category Management**
   - Add kit categories (e.g., "Engine Kits", "Maintenance Kits")
   - Filter by category in list view

3. **Pricing Intelligence**
   - Show total component cost vs selling price
   - Calculate margin percentage
   - Add discount pricing options

4. **Inventory Management**
   - Show total quantity of each component in kit
   - Stock-out warnings when components are low
   - Reserve quantity logic

5. **Search & Filter**
   - Search kits by name/SKU
   - Filter by price range, category
   - Sort options (newest, most used, price)

6. **Usage Analytics**
   - Track how many times kit is sold
   - Show in kit list (for sorting/filtering)
   - Revenue from kit sales

7. **Dynamic Pricing**
   - Suggest price based on component costs
   - Bulk discount tiers
   - Seasonal pricing

8. **Product Status in Kits**
   - Show if any component product is inactive/discontinued
   - Warn when editing inactive products

## Integration Points

- **Products Module**: Kits use products as components
- **Invoices/Bills**: Kits can be added as line items (similar to products)
- **Inventory**: Kit stock should sync with component availability
- **Shop Profile**: Kits are scoped per shop

## Permission Requirements
```
- kits:view   - View all kits
- kits:create - Create new kits
- kits:edit   - Edit existing kits
- kits:delete - Delete kits
```

