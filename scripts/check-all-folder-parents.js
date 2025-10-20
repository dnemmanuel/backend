import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function checkAllFolders() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const allFolders = await db.collection('folders').find({}).sort({ page: 1 }).toArray();

    console.log(`📁 Total folders: ${allFolders.length}\n`);
    console.log('=' .repeat(100));

    // Group by parent status
    const rootFolders = allFolders.filter(f => !f.parentFolder);
    const childFolders = allFolders.filter(f => f.parentFolder);

    console.log(`\n🌲 ROOT LEVEL FOLDERS (${rootFolders.length}):`);
    console.log('=' .repeat(100));
    rootFolders.forEach((f, index) => {
      console.log(`\n${index + 1}. ${f.name}`);
      console.log(`   Group: ${f.group}`);
      console.log(`   Page: ${f.page}`);
      console.log(`   Parent: ROOT (null)`);
    });

    console.log(`\n\n📂 CHILD FOLDERS (${childFolders.length}):`);
    console.log('=' .repeat(100));
    childFolders.forEach((f, index) => {
      const parent = allFolders.find(p => p._id.toString() === f.parentFolder.toString());
      console.log(`\n${index + 1}. ${f.name}`);
      console.log(`   Group: ${f.group}`);
      console.log(`   Page: ${f.page}`);
      console.log(`   Parent Folder ID: ${f.parentFolder}`);
      console.log(`   Parent Folder Name: ${parent ? parent.name : '❌ NOT FOUND'}`);
      if (parent) {
        console.log(`   Parent Page: ${parent.page}`);
      }
    });

    // Check for potential issues
    console.log('\n\n⚠️  POTENTIAL ISSUES:');
    console.log('=' .repeat(100));
    
    let issueCount = 0;
    
    // Check folders that look like they should have parents but don't
    rootFolders.forEach(f => {
      if (f.group !== 'gosl-payroll' && f.page.split('/').length > 3) {
        issueCount++;
        console.log(`\n${issueCount}. "${f.name}" is at ROOT but has nested path:`);
        console.log(`   Page: ${f.page}`);
        console.log(`   Group: ${f.group}`);
        console.log(`   Expected Parent: Should probably be nested under a parent folder`);
      }
    });

    // Check for orphaned folders (parent doesn't exist)
    childFolders.forEach(f => {
      const parent = allFolders.find(p => p._id.toString() === f.parentFolder.toString());
      if (!parent) {
        issueCount++;
        console.log(`\n${issueCount}. "${f.name}" has orphaned parent reference:`);
        console.log(`   Parent ID: ${f.parentFolder}`);
        console.log(`   ❌ Parent folder does not exist!`);
      }
    });

    if (issueCount === 0) {
      console.log('\n✅ No issues found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkAllFolders();
