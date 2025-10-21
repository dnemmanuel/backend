import mongoose from 'mongoose';
import Folder from '../folder/folderModel.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dnemmanuel:1YYM7j8mABLL8n24@ncscluster.n9bbidc.mongodb.net/gosl_payroll';
const SYSTEM_USER_ID = '68f191be46ad0e671d80b69e'; // s-admin user ID

// Complete PDX folder structure based on workflow diagrams
const folderStructure = {
  // HRM PUBLIC SERVICE - Agency Submissions (Intake)
  hrm_public_service: {
    path: '/gosl-payroll/hrm-public-service',
    children: {
      agency_submissions: {
        path: '/gosl-payroll/hrm-public-service/agency-submissions',
        children: {
          fortnight: {
            path: '/gosl-payroll/hrm-public-service/agency-submissions/fortnight',
            ministries: [
              'Housing', 'Equity', 'Infrastructure', 'Agriculture',
              'Physical_Dev', 'Health', 'Commerce', 'Sustainable_Dev',
              'Accountant_General'
            ]
          },
          main_payroll: {
            path: '/gosl-payroll/hrm-public-service/agency-submissions/main-payroll',
            ministries: [
              'Equity', 'Infrastructure', 'Agriculture', 'Physical_Dev',
              'Health', 'Commerce', 'Sustainable_Dev', 'Accountant_General',
              'Public_Service', 'Finance', 'Governor_General', 'National_Security',
              'Home_Affairs', 'Attorney_General', 'OPM', 'Education',
              'Audit', 'Electoral', 'Legislature', 'External_Affairs',
              'Justice', 'Labour', 'Services_Commission', 'Tourism', 'Youth_Sports'
            ],
            subfolders: {
              'Finance': ['Accountant_General', 'Customs_Excise', 'Inland_Revenue', 'Postal_Services'],
              'Home_Affairs': ['Fire_Service', 'Corrections'],
              'OPM': ['Printery']
            }
          }
        }
      },
      payroll_pending: {
        path: '/gosl-payroll/hrm-public-service/payroll-pending',
        periods: ['Fortnight', 'Main_Payroll']
      },
      payroll_rejected: {
        path: '/gosl-payroll/hrm-public-service/payroll-rejected',
        periods: ['Fortnight', 'Main_Payroll']
      },
      payroll_processed: {
        path: '/gosl-payroll/hrm-public-service/payroll-processed',
        periods: ['Fortnight', 'Main_Payroll']
      }
    }
  },
  
  // AGD FINANCE - Final Processing
  agd_finance: {
    path: '/gosl-payroll/agd-finance',
    children: {
      payroll_submissions: {
        path: '/gosl-payroll/agd-finance/payroll-submissions',
        periods: ['Fortnight', 'Main_Payroll']
      },
      payroll_processed: {
        path: '/gosl-payroll/agd-finance/payroll-processed',
        periods: ['Fortnight', 'Main_Payroll']
      },
      payroll_hr_review: {
        path: '/gosl-payroll/agd-finance/payroll-hr-review',
        periods: ['Fortnight', 'Main_Payroll']
      }
    }
  },
  
  // PAYROLL ARCHIVE
  payroll_archive: {
    path: '/gosl-payroll/payroll-archive',
    years: {
      '2025': {
        months: ['November_2025', 'December_2025']
      }
    }
  }
};

async function createFolder(data) {
  try {
    const existing = await Folder.findOne({ page: data.page });
    if (existing) {
      console.log(`  ✓ Folder exists: ${data.name}`);
      return existing;
    }

    const folder = new Folder(data);
    await folder.save();
    console.log(`  ✅ Created: ${data.name}`);
    return folder;
  } catch (error) {
    console.error(`  ❌ Error creating ${data.name}:`, error.message);
    return null;
  }
}

async function createPDXFolderStructure() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. CREATE HRM PUBLIC SERVICE STRUCTURE
    console.log('📁 Creating HRM Public Service Structure...\n');
    
    // Get HRM Public Service parent folder
    const hrmPublicService = await Folder.findOne({ page: '/gosl-payroll/hrm-public-service' });
    
    // Agency Submissions parent
    const agencySubmissions = await createFolder({
      name: 'Agency Submissions',
      page: '/gosl-payroll/hrm-public-service/agency-submissions',
      parentPath: '/gosl-payroll/hrm-public-service',
      parentFolder: hrmPublicService?._id,
      group: 'hrm-public-service',
      childGroup: 'agency-submissions',
      isActive: true,
      theme: 'blue',
      subtitle: 'Ministry payroll submissions',
      requiredPermissions: ['view_all_folders'],
      sortOrder: 1,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID
    });

    // Fortnight folder under Agency Submissions
    console.log('\n📂 Creating Fortnight period folder...');
    const fortnightParent = await createFolder({
      name: 'Fortnight',
      page: '/gosl-payroll/hrm-public-service/agency-submissions/fortnight',
      parentPath: '/gosl-payroll/hrm-public-service/agency-submissions',
      parentFolder: agencySubmissions?._id,
      group: 'agency-submissions',
      childGroup: 'fortnight',
      isActive: true,
      theme: 'green',
      subtitle: 'Fortnight submissions',
      requiredPermissions: ['view_all_folders'],
      sortOrder: 1,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID
    });

    // Fortnight ministries
    console.log('\n📋 Creating Fortnight ministry folders...');
    const fortnightMinistries = [
      'Housing', 'Equity', 'Infrastructure', 'Agriculture',
      'Physical_Dev', 'Health', 'Commerce', 'Sustainable_Dev',
      'Accountant_General'
    ];

    for (let i = 0; i < fortnightMinistries.length; i++) {
      const ministry = fortnightMinistries[i];
      await createFolder({
        name: ministry.replace(/_/g, ' '),
        page: `/gosl-payroll/hrm-public-service/agency-submissions/fortnight/${ministry.toLowerCase()}`,
        parentPath: '/gosl-payroll/hrm-public-service/agency-submissions/fortnight',
        parentFolder: fortnightParent?._id, // Set parent folder ObjectId
        group: 'fortnight',
        isActive: true,
        theme: 'teal',
        subtitle: `${ministry.replace(/_/g, ' ')} fortnight submissions`,
        ministryFilter: ministry.replace(/_/g, ' '),
        requiredPermissions: ['view_all_folders'],
        sortOrder: i + 1,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID
      });
    }

    // Main Payroll folder under Agency Submissions
    console.log('\n📂 Creating Main Payroll period folder...');
    const mainPayrollParent = await createFolder({
      name: 'Main Payroll',
      page: '/gosl-payroll/hrm-public-service/agency-submissions/main-payroll',
      parentPath: '/gosl-payroll/hrm-public-service/agency-submissions',
      parentFolder: agencySubmissions?._id,
      group: 'agency-submissions',
      childGroup: 'main-payroll',
      isActive: true,
      theme: 'orange',
      subtitle: 'Main payroll submissions',
      requiredPermissions: ['view_all_folders'],
      sortOrder: 2,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID
    });

    // Main Payroll ministries
    console.log('\n📋 Creating Main Payroll ministry folders...');
    const mainPayrollMinistries = [
      'Equity', 'Infrastructure', 'Agriculture', 'Physical_Dev',
      'Health', 'Commerce', 'Sustainable_Dev', 'Accountant_General',
      'Public_Service', 'Finance', 'Governor_General', 'National_Security',
      'Home_Affairs', 'Attorney_General', 'OPM', 'Education',
      'Audit', 'Electoral', 'Legislature', 'External_Affairs',
      'Justice', 'Labour', 'Services_Commission', 'Tourism', 'Youth_Sports'
    ];

    for (let i = 0; i < mainPayrollMinistries.length; i++) {
      const ministry = mainPayrollMinistries[i];
      await createFolder({
        name: ministry.replace(/_/g, ' '),
        page: `/gosl-payroll/hrm-public-service/agency-submissions/main-payroll/${ministry.toLowerCase()}`,
        parentPath: '/gosl-payroll/hrm-public-service/agency-submissions/main-payroll',
        parentFolder: mainPayrollParent?._id, // Set parent folder ObjectId
        group: 'main-payroll',
        isActive: true,
        theme: 'amber',
        subtitle: `${ministry.replace(/_/g, ' ')} main payroll submissions`,
        ministryFilter: ministry.replace(/_/g, ' '),
        requiredPermissions: ['view_all_folders'],
        sortOrder: i + 1,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID
      });
    }

    // 2. CREATE WORKFLOW FOLDERS (Pending, Rejected, Processed) under HRM
    console.log('\n📁 Creating HRM workflow folders...\n');
    const workflowFolders = [
      { name: 'Payroll Pending', slug: 'payroll-pending', theme: 'yellow', sortOrder: 2 },
      { name: 'Payroll Rejected', slug: 'payroll-rejected', theme: 'red', sortOrder: 3 },
      { name: 'Payroll Processed', slug: 'payroll-processed', theme: 'green', sortOrder: 4 }
    ];

    for (const wf of workflowFolders) {
      const parent = await createFolder({
        name: wf.name,
        page: `/gosl-payroll/hrm-public-service/${wf.slug}`,
        parentPath: '/gosl-payroll/hrm-public-service',
        parentFolder: hrmPublicService?._id,
        group: 'hrm-public-service',
        childGroup: wf.slug,
        isActive: true,
        theme: wf.theme,
        subtitle: `${wf.name} payroll items`,
        requiredPermissions: ['view_all_folders'],
        sortOrder: wf.sortOrder,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID
      });

      // Create Fortnight and Main Payroll subfolders
      for (const period of ['Fortnight', 'Main Payroll']) {
        await createFolder({
          name: period,
          page: `/gosl-payroll/hrm-public-service/${wf.slug}/${period.toLowerCase().replace(/\s+/g, '-')}`,
          parentPath: `/gosl-payroll/hrm-public-service/${wf.slug}`,
          parentFolder: parent?._id,
          group: wf.slug,
          isActive: true,
          theme: wf.theme,
          subtitle: `${period} - ${wf.name}`,
          requiredPermissions: ['view_all_folders'],
          sortOrder: period === 'Fortnight' ? 1 : 2,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID
        });
      }
    }

    // 3. CREATE AGD FINANCE STRUCTURE
    console.log('\n📁 Creating AGD Finance Structure...\n');
    
    // Get AGD Finance parent folder
    const agdFinance = await Folder.findOne({ page: '/gosl-payroll/agd-finance' });
    
    const agdFolders = [
      { name: 'Payroll Submissions', slug: 'payroll-submissions', theme: 'blue', sortOrder: 1 },
      { name: 'Payroll Processed', slug: 'payroll-processed', theme: 'green', sortOrder: 2 },
      { name: 'Payroll HR Review', slug: 'payroll-hr-review', theme: 'purple', sortOrder: 3 }
    ];

    for (const agd of agdFolders) {
      const parent = await createFolder({
        name: agd.name,
        page: `/gosl-payroll/agd-finance/${agd.slug}`,
        parentPath: '/gosl-payroll/agd-finance',
        parentFolder: agdFinance?._id,
        group: 'agd-finance',
        childGroup: agd.slug,
        isActive: true,
        theme: agd.theme,
        subtitle: `AGD ${agd.name}`,
        requiredPermissions: ['view_all_folders'],
        sortOrder: agd.sortOrder,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID
      });

      // Create Fortnight and Main Payroll subfolders
      for (const period of ['Fortnight', 'Main Payroll']) {
        await createFolder({
          name: period,
          page: `/gosl-payroll/agd-finance/${agd.slug}/${period.toLowerCase().replace(/\s+/g, '-')}`,
          parentPath: `/gosl-payroll/agd-finance/${agd.slug}`,
          parentFolder: parent?._id,
          group: agd.slug,
          isActive: true,
          theme: agd.theme,
          subtitle: `${period} - ${agd.name}`,
          requiredPermissions: ['view_all_folders'],
          sortOrder: period === 'Fortnight' ? 1 : 2,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID
        });
      }
    }

    // 4. CREATE PAYROLL ARCHIVE STRUCTURE
    console.log('\n📁 Creating Payroll Archive Structure...\n');
    
    // Get Payroll Archive parent folder
    const payrollArchive = await Folder.findOne({ page: '/gosl-payroll/payroll-archive' });
    
    const archiveYear = await createFolder({
      name: '2025',
      page: '/gosl-payroll/payroll-archive/2025',
      parentPath: '/gosl-payroll/payroll-archive',
      parentFolder: payrollArchive?._id,
      group: 'payroll-archive',
      childGroup: '2025',
      isActive: true,
      theme: 'grey',
      subtitle: '2025 archived payrolls',
      requiredPermissions: ['view_all_folders'],
      sortOrder: 1,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID
    });

    const months = ['November_2025', 'December_2025'];
    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      const monthFolder = await createFolder({
        name: month.replace(/_/g, ' '),
        page: `/gosl-payroll/payroll-archive/2025/${month.toLowerCase()}`,
        parentPath: '/gosl-payroll/payroll-archive/2025',
        parentFolder: archiveYear?._id,
        group: '2025',
        childGroup: month.toLowerCase(),
        isActive: true,
        theme: 'blue-grey',
        subtitle: `${month.replace(/_/g, ' ')} archive`,
        requiredPermissions: ['view_all_folders'],
        sortOrder: i + 1,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID
      });

      // Create Fortnight and Main Payroll subfolders
      for (const period of ['Fortnight', 'Main Payroll']) {
        await createFolder({
          name: period,
          page: `/gosl-payroll/payroll-archive/2025/${month.toLowerCase()}/${period.toLowerCase().replace(/\s+/g, '-')}`,
          parentPath: `/gosl-payroll/payroll-archive/2025/${month.toLowerCase()}`,
          parentFolder: monthFolder?._id,
          group: month.toLowerCase(),
          isActive: true,
          theme: 'blue-grey',
          subtitle: `${period} - ${month.replace(/_/g, ' ')}`,
          requiredPermissions: ['view_all_folders'],
          sortOrder: period === 'Fortnight' ? 1 : 2,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID
        });
      }
    }

    console.log('\n✅ PDX Folder Structure Created Successfully!\n');
    console.log('📊 Summary:');
    console.log('  - HRM Public Service: Agency Submissions with all ministries');
    console.log('  - HRM Workflow: Pending, Rejected, Processed (Fortnight/Main)');
    console.log('  - AGD Finance: Submissions, Processed, HR Review (Fortnight/Main)');
    console.log('  - Payroll Archive: 2025 (November, December with Fortnight/Main)');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating folder structure:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createPDXFolderStructure();
