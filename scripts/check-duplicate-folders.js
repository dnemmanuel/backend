import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function checkDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const folders = await db.collection('folders').find({ name: 'Payroll Processed' }).toArray();

    console.log(`📁 Found ${folders.length} folder(s) named "Payroll Processed":\n`);
    
    folders.forEach((f, index) => {
      console.log(`Folder #${index + 1}:`);
      console.log(`  _id: ${f._id}`);
      console.log(`  Name: ${f.name}`);
      console.log(`  Parent Folder: ${f.parentFolder || 'null (ROOT LEVEL)'}`);
      console.log(`  Group: ${f.group}`);
      console.log(`  Page: ${f.page}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkDuplicates();
