# Excel File Structure Example

## File: DispatchSheet.xlsm

### Sheet: "Product Master"

| SKU | Short Product | Category | Super Category |
|-----|---------------|----------|----------------|
| POR001 | Wireless Mouse | Computer Accessories | Electronics |
| POR002 | Bluetooth Speaker | Audio Devices | Electronics |
| POR003 | Office Chair | Furniture | Home & Office |
| POR004 | Desk Lamp | Lighting | Home & Office |
| POR005 | USB Cable | Computer Accessories | Electronics |
| POR006 | Coffee Mug | Kitchenware | Home & Office |
| POR007 | Headphones | Audio Devices | Electronics |
| POR008 | Bookshelf | Furniture | Home & Office |

## Expected Database Structure After Import

### Super Categories Collection
```json
[
  { "_id": "...", "name": "Electronics", "createdAt": "...", "updatedAt": "..." },
  { "_id": "...", "name": "Home & Office", "createdAt": "...", "updatedAt": "..." }
]
```

### Categories Collection
```json
[
  { 
    "_id": "...", 
    "name": "Computer Accessories", 
    "superCategoryId": "electronics_id", 
    "createdAt": "...", 
    "updatedAt": "..." 
  },
  { 
    "_id": "...", 
    "name": "Audio Devices", 
    "superCategoryId": "electronics_id", 
    "createdAt": "...", 
    "updatedAt": "..." 
  },
  { 
    "_id": "...", 
    "name": "Furniture", 
    "superCategoryId": "home_office_id", 
    "createdAt": "...", 
    "updatedAt": "..." 
  },
  { 
    "_id": "...", 
    "name": "Lighting", 
    "superCategoryId": "home_office_id", 
    "createdAt": "...", 
    "updatedAt": "..." 
  },
  { 
    "_id": "...", 
    "name": "Kitchenware", 
    "superCategoryId": "home_office_id", 
    "createdAt": "...", 
    "updatedAt": "..." 
  }
]
```

### Products Collection
```json
[
  {
    "_id": "...",
    "sku": "POR001",
    "productName": "Wireless Mouse",
    "masterCartonSize": null,
    "categoryId": "computer_accessories_id",
    "isActive": true,
    "createdBy": "user_id",
    "createdAt": "...",
    "updatedAt": "..."
  },
  {
    "_id": "...",
    "sku": "POR002",
    "productName": "Bluetooth Speaker",
    "masterCartonSize": null,
    "categoryId": "audio_devices_id",
    "isActive": true,
    "createdBy": "user_id",
    "createdAt": "...",
    "updatedAt": "..."
  }
  // ... more products
]
```

## Notes

1. **SKU Format**: All SKUs will be converted to uppercase
2. **Unique Constraints**: 
   - Super Category names must be unique
   - Category names must be unique within each Super Category
   - Product SKUs must be unique
3. **Required Fields**: SKU, Product Name, Category, and Super Category are all required
4. **Optional Fields**: Master Carton Size is optional and will be null if not provided
5. **Duplicate Handling**: The script will skip existing records and report them
