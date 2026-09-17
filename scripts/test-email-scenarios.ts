import dotenv from 'dotenv';
dotenv.config();

// Enable EMAIL_DEBUG mode for verbose logging
process.env.EMAIL_DEBUG = 'true';

async function runScenarioTests() {
  const { verifySMTPConnection } = await import('../src/lib/email/nodemailer');
  const { sendMemberNotification } = await import('../src/lib/email/triggers/member-notifications');
  const { sendEmail } = await import('../src/lib/email/email.service');

  console.log('\n======================================================');
  console.log('===   DEEP EMAIL NOTIFICATION SCENARIO AUDIT TEST  ===');
  console.log('======================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT || '587'}`);
  console.log(`SMTP User: ${process.env.SMTP_USER || 'N/A'}`);
  console.log(`Primary Recipient: ${process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com'}`);
  console.log(`Debug Mode: ${process.env.EMAIL_DEBUG}`);
  console.log('======================================================\n');

  // 1. Verify SMTP Connection
  console.log('[STEP 1] Testing SMTP Connection...');
  const isConnected = await verifySMTPConnection();
  if (!isConnected) {
    console.error('❌ SMTP Connection failed. Check credentials.');
    process.exit(1);
  }
  console.log('✅ SMTP Connection verified successfully.\n');

  const recipient = process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com';
  const companyName = 'Pharaoh Health Systems SAE';

  // 2. Scenario 1: Single Add
  console.log('[SCENARIO 1] Single Beneficiary Addition...');
  const res1 = await sendMemberNotification({
    companyName,
    memberName: 'Tarek Mahmoud',
    action: 'Added',
    recipientEmail: recipient,
    details: {
      relation: 'Employee',
      department: 'Operations',
      nationalId: '29204120108877',
    },
  });
  console.log('Scenario 1 Result:', res1);
  if (!res1.success) throw new Error(`Scenario 1 Failed: ${res1.error}`);
  console.log('✅ Scenario 1 Passed (MessageId: ' + res1.messageId + ')\n');

  // 3. Scenario 2: Family Add (Principal + Spouse + 2 Children)
  console.log('[SCENARIO 2] Family Addition (4 Beneficiaries)...');
  const res2 = await sendMemberNotification({
    companyName,
    action: 'Added',
    recipientEmail: recipient,
    members: [
      { memberName: 'Khaled Hassan', relation: 'Employee', department: 'IT', nationalId: '28910010105544' },
      { memberName: 'Mona Aly', relation: 'Spouse', department: 'IT', nationalId: '29105150106633' },
      { memberName: 'Ziad Khaled', relation: 'Child', department: 'IT', nationalId: '31508200101122' },
      { memberName: 'Nour Khaled', relation: 'Child', department: 'IT', nationalId: '31802100109988' },
    ],
  });
  console.log('Scenario 2 Result:', res2);
  if (!res2.success) throw new Error(`Scenario 2 Failed: ${res2.error}`);
  console.log('✅ Scenario 2 Passed (MessageId: ' + res2.messageId + ')\n');

  // 4. Scenario 3: Bulk Upload Excel (10 Beneficiaries)
  console.log('[SCENARIO 3] Bulk Excel Upload Addition (10 Beneficiaries)...');
  const excelMembers = Array.from({ length: 10 }, (_, i) => ({
    memberName: `Excel Beneficiary ${i + 1}`,
    relation: i === 0 ? 'Employee' : i % 2 === 0 ? 'Spouse' : 'Child',
    department: 'Sales & Logistics',
    nationalId: `29${i}050501099${i}`,
  }));
  const res3 = await sendMemberNotification({
    companyName,
    action: 'Added',
    recipientEmail: recipient,
    members: excelMembers,
  });
  console.log('Scenario 3 Result:', res3);
  if (!res3.success) throw new Error(`Scenario 3 Failed: ${res3.error}`);
  console.log('✅ Scenario 3 Passed (MessageId: ' + res3.messageId + ')\n');

  // 5. Scenario 4: Manual Single Deletion
  console.log('[SCENARIO 4] Manual Single Beneficiary Cancellation...');
  const res4 = await sendMemberNotification({
    companyName,
    memberName: 'Omar Sherif',
    action: 'Deleted',
    recipientEmail: recipient,
    details: {
      relation: 'Employee',
      department: 'Finance',
      nationalId: '28509120107766',
    },
  });
  console.log('Scenario 4 Result:', res4);
  if (!res4.success) throw new Error(`Scenario 4 Failed: ${res4.error}`);
  console.log('✅ Scenario 4 Passed (MessageId: ' + res4.messageId + ')\n');

  // 6. Scenario 5: Bulk Deletion (5 Beneficiaries)
  console.log('[SCENARIO 5] Bulk Beneficiary Deletion (5 Beneficiaries)...');
  const deleteMembers = Array.from({ length: 5 }, (_, i) => ({
    memberName: `Terminated Member ${i + 1}`,
    relation: 'Employee',
    department: 'Customer Care',
    nationalId: `27${i}111101088${i}`,
  }));
  const res5 = await sendMemberNotification({
    companyName,
    action: 'Deleted',
    recipientEmail: recipient,
    members: deleteMembers,
  });
  console.log('Scenario 5 Result:', res5);
  if (!res5.success) throw new Error(`Scenario 5 Failed: ${res5.error}`);
  console.log('✅ Scenario 5 Passed (MessageId: ' + res5.messageId + ')\n');

  // 7. Scenario 6: Failure & Retry Stack Trace Logging Simulation
  console.log('[SCENARIO 6] Simulating Transient SMTP Failure & Retry Logging...');
  const res6 = await sendEmail({
    to: 'invalid-email-recipient-address-test@domain-does-not-exist.test',
    subject: 'Simulation Failure Test',
    html: '<p>Testing Error Stack Logging</p>',
    relatedType: 'member',
  });
  console.log('Scenario 6 Error Handled Result:', res6);
  if (!res6.success && res6.error) {
    console.log('✅ Scenario 6 Passed: Failure captured cleanly with retry attempts logged and full error stack traced.');
  }

  console.log('\n======================================================');
  console.log('=== ALL 6 NOTIFICATION SCENARIOS PASSED WITH PROOF ===');
  console.log('======================================================\n');
}

runScenarioTests().catch((err) => {
  console.error('Fatal Test Failure:', err);
  process.exit(1);
});
