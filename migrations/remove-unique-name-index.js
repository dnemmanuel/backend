/**
 * Migration: Remove unique index on folder name field
 * 
 * This migration removes the old unique index on the 'name' field alone
 * and ensures the new compound unique index (name + parentFolder) is in place.
 * 
 * Run this ONCE after deploying the updated folderModel.js
 * 
 * Usage: node backend/migrations/remove-unique-name-index.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Get MongoDB URI from environment, and extract the correct database name
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/NCS';

async function migrateIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('folders');

    console.log('\n📋 Current indexes on folders collection:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Check if old unique index on 'name' exists
    const oldNameIndex = indexes.find(idx => 
      idx.key.name === 1 && 
      idx.unique === true && 
      !idx.key.parentFolder
    );

    if (oldNameIndex) {
      console.log(`\n🗑️  Dropping old unique index on 'name': ${oldNameIndex.name}`);
      await collection.dropIndex(oldNameIndex.name);
      console.log('✅ Old index dropped successfully');
    } else {
      console.log('\n✅ Old unique index on name not found (already removed or never existed)');
    }

    // Check if new compound index exists
    const compoundIndex = indexes.find(idx => 
      idx.key.name === 1 && 
      idx.key.parentFolder === 1 &&
      idx.unique === true
    );

    if (compoundIndex) {
      console.log('✅ Compound unique index (name + parentFolder) already exists');
    } else {
      console.log('\n🔨 Creating compound unique index (name + parentFolder)...');
      await collection.createIndex(
        { name: 1, parentFolder: 1 }, 
        { unique: true, name: 'name_1_parentFolder_1_unique' }
      );
      console.log('✅ Compound unique index created successfully');
    }

    console.log('\n📋 Final indexes on folders collection:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('  - Folders can now have the same name in different locations');
    console.log('  - Folders with the same name in the same parent folder are NOT allowed');
    console.log('  - Page paths remain globally unique');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

migrateIndexes();
