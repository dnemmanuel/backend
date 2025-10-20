import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gosl_payroll';

async function fixFolderIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('📁 Database:', mongoose.connection.db.databaseName);

    const db = mongoose.connection.db;
    
    // List all collections
    console.log('\n📚 Available collections:');
    const collections = await db.listCollections().toArray();
    collections.forEach(coll => console.log(`  - ${coll.name}`));
    
    // Find the folders collection (might be 'folders' or 'Folders')
    const folderCollection = collections.find(c => c.name.toLowerCase() === 'folders');
    
    if (!folderCollection) {
      console.log('\n⚠️  No "folders" collection found in database');
      console.log('This might be a new database or folders haven\'t been created yet.');
      console.log('The indexes will be created automatically when the first folder is saved.');
      console.log('\n✅ Nothing to fix - indexes will be correct from the start.');
      return;
    }
    
    const collection = db.collection(folderCollection.name);

    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Check if the old unique index on 'name' exists
    const oldIndex = indexes.find(idx => idx.name === 'name_1' && idx.unique === true);
    
    if (oldIndex) {
      console.log('\n⚠️  Found old unique index on "name" field');
      console.log('🗑️  Dropping index: name_1');
      await collection.dropIndex('name_1');
      console.log('✅ Old index dropped successfully');
    } else {
      console.log('\n✅ Old unique index on "name" does not exist (already removed)');
    }

    // Verify compound index exists
    const compoundIndex = indexes.find(idx => 
      idx.key.name === 1 && idx.key.parentFolder === 1 && idx.unique === true
    );

    if (!compoundIndex) {
      console.log('\n⚠️  Compound index does not exist');
      console.log('🔨 Creating compound unique index on { name: 1, parentFolder: 1 }');
      await collection.createIndex(
        { name: 1, parentFolder: 1 }, 
        { unique: true, name: 'name_1_parentFolder_1' }
      );
      console.log('✅ Compound index created successfully');
    } else {
      console.log('\n✅ Compound unique index already exists');
    }

    console.log('\n📋 Updated indexes:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.unique ? '(unique)' : '');
    });

    console.log('\n✅ Index migration completed successfully!');
    console.log('You can now create folders with the same name in different parent folders.');

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
  }
}

fixFolderIndexes();
