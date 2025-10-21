import mongoose from 'mongoose';
import Folder from '../folder/folderModel.js';

async function checkAgencyFolders() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gosl_payroll');
    console.log('✅ Connected to database\n');

    // Find Agency Submissions and its children
    const agencySubmissions = await Folder.findOne({ 
      name: /agency.*submission/i 
    });

    if (agencySubmissions) {
      console.log('📁 Agency Submissions folder:');
      console.log(`   ID: ${agencySubmissions._id}`);
      console.log(`   Name: ${agencySubmissions.name}`);
      console.log(`   Page: ${agencySubmissions.page}`);
      console.log(`   Parent Path: ${agencySubmissions.parentPath}`);
      console.log('');

      // Find children of Agency Submissions
      const children = await Folder.find({
        parentPath: agencySubmissions.page
      }).sort('name');

      console.log(`📂 Direct children of Agency Submissions (${children.length}):`);
      for (const child of children) {
        console.log(`   - ${child.name}`);
        console.log(`     ID: ${child._id}`);
        console.log(`     Page: ${child.page}`);
        console.log(`     Parent Path: ${child.parentPath}`);
        
        // Find grandchildren
        const grandchildren = await Folder.find({
          parentPath: child.page
        }).sort('name');
        
        if (grandchildren.length > 0) {
          console.log(`     └─ Children (${grandchildren.length}):`);
          for (const gc of grandchildren) {
            console.log(`        - ${gc.name} (${gc.page})`);
            console.log(`          Ministry Filter: ${gc.ministryFilter || 'None'}`);
          }
        }
        console.log('');
      }
    } else {
      console.log('❌ Agency Submissions folder not found!');
      
      // Search for any folder with "agency" in name
      const agencyFolders = await Folder.find({ 
        name: /agency/i 
      }).select('name page parentPath');
      
      console.log('\n🔍 Folders with "agency" in name:');
      agencyFolders.forEach(f => {
        console.log(`   - ${f.name} (${f.page})`);
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAgencyFolders();
