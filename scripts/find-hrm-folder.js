import mongoose from 'mongoose';
import Folder from '../folder/folderModel.js';

async function findHRMFolder() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gosl_payroll');
    console.log('✅ Connected to database\n');

    // Count all folders
    const totalCount = await Folder.countDocuments();
    console.log(`📊 Total folders in database: ${totalCount}\n`);

    // Search for HRM folders
    const hrmFolders = await Folder.find({ 
      name: /hrm/i 
    });

    console.log(`📁 Folders with "HRM" in name (${hrmFolders.length}):`);
    hrmFolders.forEach(f => {
      console.log(`\n  ${f.name}`);
      console.log(`    ID: ${f._id}`);
      console.log(`    Page: ${f.page}`);
      console.log(`    Group: ${f.group}`);
      console.log(`    Parent Path: ${f.parentPath}`);
    });

    // Search for Agency Submissions
    const agencyFolders = await Folder.find({ 
      name: /agency/i 
    });

    console.log(`\n\n📁 Folders with "Agency" in name (${agencyFolders.length}):`);
    agencyFolders.forEach(f => {
      console.log(`\n  ${f.name}`);
      console.log(`    ID: ${f._id}`);
      console.log(`    Page: ${f.page}`);
      console.log(`    Group: ${f.group}`);
      console.log(`    Parent Path: ${f.parentPath}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findHRMFolder();
