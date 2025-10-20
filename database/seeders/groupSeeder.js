import Group from '../../models/groupModel.js';
import { logInfo } from '../../utils/logger.js';

export async function seedGroups() {
  try {
    const defaultGroups = [
      {
        name: 'Payroll Archive',
        code: 'payroll-archive',
        description: 'Monthly payroll archives and historical records',
        icon: 'archive',
        defaultTheme: 'blue',
        defaultPermissions: ['payroll_view'],
        sortOrder: 1,
        isActive: true,
        autoGeneration: {
          enabled: true,
          frequency: 'monthly',
          nameTemplate: '{month} {year}'
        }
      },
      {
        name: 'HRM Public Service',
        code: 'hrm-public-service',
        description: 'Human Resource Management department documents',
        icon: 'people',
        defaultTheme: 'green',
        defaultPermissions: ['view_folder'],
        sortOrder: 2,
        isActive: true,
        autoGeneration: {
          enabled: false,
          frequency: 'none',
          nameTemplate: ''
        }
      },
      {
        name: 'AGD Finance',
        code: 'agd-finance',
        description: 'Accountant General Department - Finance documents',
        icon: 'account_balance',
        defaultTheme: 'orange',
        defaultPermissions: ['view_folder'],
        sortOrder: 3,
        isActive: true,
        autoGeneration: {
          enabled: false,
          frequency: 'none',
          nameTemplate: ''
        }
      },
      {
        name: 'GOSL Payroll',
        code: 'gosl-payroll',
        description: 'Government of Saint Lucia Payroll System',
        icon: 'work',
        defaultTheme: 'blue',
        defaultPermissions: ['view_folder'],
        sortOrder: 0,
        isActive: true,
        autoGeneration: {
          enabled: false,
          frequency: 'none',
          nameTemplate: ''
        }
      }
    ];

    for (const groupData of defaultGroups) {
      await Group.findOneAndUpdate(
        { code: groupData.code },
        groupData,
        { upsert: true, new: true }
      );
      logInfo(`Group '${groupData.name}' seeded/updated`);
    }
    
    logInfo('✅ Groups seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding groups:', error);
    throw error;
  }
}
