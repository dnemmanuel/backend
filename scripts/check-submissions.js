import mongoose from 'mongoose';
import Submission from '../submission/submissionModel.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dnemmanuel:1YYM7j8mABLL8n24@ncscluster.n9bbidc.mongodb.net/gosl_payroll';

async function checkSubmissions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const submissions = await Submission.find()
      .populate('submittedBy', 'username firstName lastName')
      .populate('currentFolder', 'name page')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`📊 Found ${submissions.length} submission(s):\n`);

    submissions.forEach(sub => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 Submission: ${sub.submissionNumber}`);
      console.log(`   Form Type: ${sub.formType}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Submitted By: ${sub.submittedBy?.username} (${sub.submittedBy?.firstName} ${sub.submittedBy?.lastName})`);
      console.log(`   Ministry: ${sub.submitterMinistry}`);
      console.log(`   Current Folder: ${sub.currentFolder?.name} (${sub.currentFolder?.page})`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log(`   Form Data: ${Object.keys(sub.formData).length} fields`);
      console.log('');
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkSubmissions();
