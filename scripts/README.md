# Database Population Script

This script populates the database from an Excel file with product data.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Prepare your Excel file:**
   - Name it `products.xlsx`
   - Place it in the `scripts/` folder
   - The script will read the first/default worksheet
   - Required columns:
     - `SKU` - Product SKU (will be converted to uppercase)
     - `Product` - Product name
     - `Category` - Product category
     - `Super Category` - Super category for the product
     - `Origin` - Product origin (optional)

## Excel File Format

Your Excel file should look like this:

| SKU | Product | Category | Super Category | Origin |
|-----|---------|----------|----------------|--------|
| POR001 | Wireless Mouse | Computer Accessories | Electronics | China |
| POR002 | Bluetooth Speaker | Audio Devices | Electronics | Taiwan |
| POR003 | Office Chair | Furniture | Home & Office | India |
| POR004 | Desk Lamp | Lighting | Home & Office | China |

## Usage

1. **Place your Excel file:**
   ```
   scripts/
   ├── products.xlsx  ← Place your file here
   ├── populate-from-excel.js
   └── README.md
   ```

2. **Run the script:**
   ```bash
   npm run populate-excel
   ```

   Or directly:
   ```bash
   node scripts/populate-from-excel.js
   ```

## What the Script Does

1. **Reads Excel file** and validates data
2. **Creates Super Categories** (unique values from "Super Category" column)
3. **Creates Categories** (unique combinations of Category + Super Category)
4. **Creates Products** with proper category associations
5. **Handles duplicates** - skips existing records
6. **Provides detailed logging** of the process

## Output Example

```
🚀 Starting database population from Excel...

📁 Reading Excel file: /path/to/scripts/DispatchSheet.xlsm
📊 Read 150 rows from "Product Master" sheet
📋 Available sheets in Excel: Product Master, Dispatch Data, Summary
🧹 Cleaned data: 148 valid rows

🏷️ Creating super categories...
✅ Created super category: Electronics
✅ Created super category: Home & Office
ℹ️ Super category already exists: Electronics

📂 Creating categories...
✅ Created category: Computer Accessories (Electronics)
✅ Created category: Audio Devices (Electronics)
✅ Created category: Furniture (Home & Office)

📦 Creating products...
✅ Created product: POR001 - Wireless Mouse
✅ Created product: POR002 - Bluetooth Speaker
ℹ️ Product already exists: POR001

📊 Product creation summary:
✅ Successfully created: 145
❌ Errors: 3
📝 Total processed: 148

🎉 Database population completed successfully!
🔌 Database connection closed
```

## Error Handling

- **Invalid data rows** are skipped with warnings
- **Duplicate SKUs** are skipped (existing products won't be overwritten)
- **Missing categories** are reported as errors
- **Database connection issues** are handled gracefully

## Customization

To modify the script for different Excel formats:

1. **Change file path** in `populate-from-excel.js`:
   ```javascript
   const excelFilePath = path.join(__dirname, 'Your_File_Name.xlsx');
   ```

2. **Update column mapping** in the `cleanData` function:
   ```javascript
   const cleanData = (data) => {
     return data.map(row => ({
       sku: row['Your_SKU_Column']?.toString().trim().toUpperCase(),
       productName: row['Your_Product_Column']?.toString().trim(),
       category: row['Your_Category_Column']?.toString().trim(),
       superCategory: row['Your_SuperCategory_Column']?.toString().trim()
     }));
   };
   ```

## Troubleshooting

### Common Issues:

1. **"Cannot find module 'xlsx'"**
   - Run `npm install` to install dependencies

2. **"Excel file not found"**
   - Ensure `products.xlsx` is in the `scripts/` folder
   - Check the file name matches exactly

3. **"No valid data found"**
   - Check your Excel file has the correct column headers
   - Ensure data rows have values in all required columns

4. **Database connection errors**
   - Ensure MongoDB is running
   - Check your `.env` file has correct `MONGODB_URI`

### Getting Help:

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your Excel file format matches the requirements
3. Ensure all dependencies are installed
4. Check database connectivity
