import mongoose from 'mongoose';
import Folder from '../folder/folderModel.js';

async function checkHRMFolders() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gosl_payroll');
    console.log('✅ Connected to database\n');

    // Check HRM Public Service folder
    const hrmFolder = await Folder.findOne({ 
      page: '/gosl-payroll/hrm-public-service'
    });

    console.log('📁 HRM Public Service folder:');
    console.log(JSON.stringify({
      name: hrmFolder?.name,
      page: hrmFolder?.page,
      group: hrmFolder?.group,
      childGroup: hrmFolder?.childGroup,
      parentPath: hrmFolder?.parentPath,
      requiredPermissions: hrmFolder?.requiredPermissions,
      isActive: hrmFolder?.isActive,
      ministryFilter: hrmFolder?.ministryFilter
    }, null, 2));

    // Find children of HRM Public Service
    const children = await Folder.find({
      parentPath: '/gosl-payroll/hrm-public-service'
    });

    console.log(`\n📂 Children of HRM Public Service (${children.length}):`);
    children.forEach(child => {
      console.log(`\n  - ${child.name}`);
      console.log(`    Page: ${child.page}`);
      console.log(`    Group: ${child.group}`);
      console.log(`    ChildGroup: ${child.childGroup || 'none'}`);
      console.log(`    Permissions: ${child.requiredPermissions.join(', ')}`);
      console.log(`    Active: ${child.isActive}`);
      console.log(`    Ministry Filter: ${child.ministryFilter || 'none'}`);
    });

    // What the query SHOULD match
    console.log('\n\n🔍 Expected query for HRM Public Service children:');
    console.log('  parentPath: /gosl-payroll/hrm-public-service');
    console.log('  group: hrm-public-service (from childGroup)');
    console.log('  isActive: true');
    console.log('  No permission filter (s-admin bypass)');

    // Test the exact query
    const testQuery = {
      isActive: true,
      parentPath: '/gosl-payroll/hrm-public-service',
      group: 'hrm-public-service'
    };

    console.log('\n\n🧪 Testing query:', JSON.stringify(testQuery));
    const results = await Folder.find(testQuery);
    console.log(`   Found ${results.length} folders`);
    results.forEach(r => console.log(`   - ${r.name}`));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkHRMFolders();
