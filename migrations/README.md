# Database Migrations

This folder contains database migration scripts for the GOSL Payroll system.

## Available Migrations

### `remove-unique-name-index.js`
**Purpose:** Allow duplicate folder names in different locations

**When to run:** After deploying the updated `folderModel.js` that changes the folder name uniqueness constraint

**What it does:**
- Removes the old unique index on the `name` field
- Creates a new compound unique index on `name + parentFolder`
- Ensures folders can have the same name if they're in different parent folders

**How to run:**
```bash
cd backend
node migrations/remove-unique-name-index.js
```

**Expected output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📋 Current indexes on folders collection:
  - _id_: {"_id":1}
  - name_1: {"name":1} (UNIQUE)
  ...

🗑️  Dropping old unique index on 'name': name_1
✅ Old index dropped successfully

🔨 Creating compound unique index (name + parentFolder)...
✅ Compound unique index created successfully

📋 Final indexes on folders collection:
  - _id_: {"_id":1}
  - name_1_parentFolder_1_unique: {"name":1,"parentFolder":1} (UNIQUE)
  ...

✅ Migration completed successfully!
```

## General Migration Guidelines

1. **Always backup your database** before running migrations
2. **Run migrations in order** if multiple migrations exist
3. **Test on development/staging** before production
4. **Run only once** - migrations are designed to be idempotent but should only be run once
5. **Check the output** - ensure no errors occurred

## Troubleshooting

### Error: "Index already exists"
- The new index already exists. The migration is idempotent and will skip this step.

### Error: "Cannot create unique index"
- You have duplicate data that violates the new constraint
- Check for folders with the same name and same parentFolder
- Manually resolve duplicates before running migration

### Error: "Connection failed"
- Check your MongoDB connection string in `.env`
- Ensure MongoDB server is running
- Verify network connectivity

## Creating New Migrations

When creating new migrations:

1. Create a new file: `YYYYMMDD-description.js`
2. Use date prefix for ordering (e.g., `20251019-add-new-field.js`)
3. Make migrations idempotent (can be run multiple times safely)
4. Include rollback instructions in comments
5. Document what the migration does and why
6. Update this README with the new migration

## Migration Template

```javascript
/**
 * Migration: [Description]
 * 
 * [Detailed explanation of what this migration does and why]
 * 
 * Run: node backend/migrations/YYYYMMDD-description.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // Your migration code here

    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

migrate();
```
