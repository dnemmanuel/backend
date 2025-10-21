import mongoose from 'mongoose';
import Folder from '../folder/folderModel.js';

async function setMinistryFoldersGroup() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gosl_payroll');
    console.log('✅ Connected to database\n');

    // Find all folders under Fortnight and Main Payroll in agency submissions
    const fortnightMainPaths = [
      '/gosl-payroll/hrm-public-service/agency-submissions/fortnight',
      '/gosl-payroll/hrm-public-service/agency-submissions/main-payroll'
    ];

    for (const parentPath of fortnightMainPaths) {
      const childFolders = await Folder.find({
        parentPath: parentPath
      });

      console.log(`Found ${childFolders.length} folders under ${parentPath}\n`);

      for (const folder of childFolders) {
        console.log(`Updating: ${folder.name}`);
        console.log(`  Current group: ${folder.group}`);
        
        // Update group to "ministry"
        folder.group = 'ministry';
        await folder.save();
        
        console.log(`  ✓ Updated group to: ministry\n`);
      }
    }

    console.log('✅ All ministry folders updated!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setMinistryFoldersGroup();
