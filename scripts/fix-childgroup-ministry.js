import mongoose from 'mongoose';
import Folder from '../folder/folderModel.js';

async function fixChildGroupMinistry() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gosl_payroll');
    console.log('✅ Connected to database\n');

    // Find all Fortnight and Main Payroll folders with childGroup="ministry"
    const foldersToFix = await Folder.find({
      childGroup: 'ministry'
    });

    console.log(`Found ${foldersToFix.length} folders with childGroup="ministry"\n`);

    for (const folder of foldersToFix) {
      console.log(`Updating: ${folder.name} (${folder.page})`);
      
      // Remove childGroup or set to null
      folder.childGroup = null;
      await folder.save();
      
      console.log(`  ✓ childGroup removed\n`);
    }

    console.log('✅ All folders updated!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixChildGroupMinistry();
