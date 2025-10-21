import mongoose from 'mongoose';

async function listDatabases() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gosl_payroll');
    console.log('✅ Connected to MongoDB\n');

    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();

    console.log(`📊 Available databases (${databases.length}):\n`);
    
    for (const db of databases) {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    }

    console.log('\n📍 Currently connected to:', mongoose.connection.name);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listDatabases();
