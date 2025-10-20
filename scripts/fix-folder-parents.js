import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function fixFolderParents() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('folders');

    // Find the parent folders
    const agdFinance = await collection.findOne({ name: 'AGD Finance', page: '/gosl-payroll/agd-finance' });
    const hrmPublicService = await collection.findOne({ name: 'HRM Public Service', page: '/gosl-payroll/hrm-public-service' });

    if (!agdFinance) {
      console.error('❌ AGD Finance folder not found!');
      return;
    }
    if (!hrmPublicService) {
      console.error('❌ HRM Public Service folder not found!');
      return;
    }

    console.log('📁 Parent Folders Found:');
    console.log(`  AGD Finance ID: ${agdFinance._id}`);
    console.log(`  HRM Public Service ID: ${hrmPublicService._id}`);
    console.log('');

    // Define the folders to fix
    const foldersToFix = [
      { 
        name: 'Payroll Submissions', 
        page: '/gosl-payroll/agd-finance/payroll-submissions',
        newParent: agdFinance._id 
      },
      { 
        name: 'Agency Submissions', 
        page: '/gosl-payroll/hrm-public-service/agency-submissions',
        newParent: hrmPublicService._id 
      },
      { 
        name: 'Payroll Pending', 
        page: '/gosl-payroll/hrm-public-service/payroll-pending',
        newParent: hrmPublicService._id 
      },
      { 
        name: 'Payroll Processed', 
        page: '/gosl-payroll/hrm-public-service/payroll-processed',
        newParent: hrmPublicService._id 
      },
      { 
        name: 'Payroll Rejected', 
        page: '/gosl-payroll/hrm-public-service/payroll-rejected',
        newParent: hrmPublicService._id 
      },
    ];

    console.log('🔧 Fixing folder parent relationships...\n');
    console.log('=' .repeat(100));

    let fixedCount = 0;

    for (const folderInfo of foldersToFix) {
      const folder = await collection.findOne({ name: folderInfo.name, page: folderInfo.page });
      
      if (!folder) {
        console.log(`\n⚠️  Folder "${folderInfo.name}" not found, skipping...`);
        continue;
      }

      const parentName = folderInfo.newParent.toString() === agdFinance._id.toString() 
        ? 'AGD Finance' 
        : 'HRM Public Service';

      console.log(`\n📝 Updating: ${folderInfo.name}`);
      console.log(`   Page: ${folderInfo.page}`);
      console.log(`   Old Parent: ${folder.parentFolder || 'null (ROOT)'}`);
      console.log(`   New Parent: ${folderInfo.newParent} (${parentName})`);

      // Update the folder
      const result = await collection.updateOne(
        { _id: folder._id },
        { 
          $set: { 
            parentFolder: folderInfo.newParent,
            parentPath: folderInfo.newParent.toString() === agdFinance._id.toString() 
              ? '/gosl-payroll/agd-finance'
              : '/gosl-payroll/hrm-public-service'
          } 
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`   ✅ Updated successfully!`);
        fixedCount++;
      } else {
        console.log(`   ⚠️  No changes made (already correct?)`);
      }
    }

    console.log('\n' + '=' .repeat(100));
    console.log(`\n✅ Migration complete! Fixed ${fixedCount} folder(s).`);
    console.log('\n📊 Summary:');
    console.log(`   Total folders processed: ${foldersToFix.length}`);
    console.log(`   Successfully updated: ${fixedCount}`);
    console.log(`   Skipped/Already correct: ${foldersToFix.length - fixedCount}`);

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
  }
}

fixFolderParents();
