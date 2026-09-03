import dotenv from 'dotenv';
dotenv.config();

// Dynamically import dependencies AFTER dotenv.config() has loaded environment variables
async function runEmailTests() {
  const { verifySMTPConnection } = await import('../src/lib/email/nodemailer');
  const { sendEmail } = await import('../src/lib/email/email.service');
  const { sendMemberNotification } = await import('../src/lib/email/triggers/member-notifications');
  const { getPolicyExpiryHtml } = await import('../src/lib/email/templates/policy-expiry-template');

  console.log('--- Starting Gmail SMTP Notification System Test ---');
  console.log(`SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`SMTP User: ${process.env.SMTP_USER}`);

  // Test 1: Verify Connection
  console.log('\n[Test 1] Verifying SMTP Connection...');
  const isConnected = await verifySMTPConnection();
  if (!isConnected) {
    console.error('❌ Test 1 Failed: Cannot connect to Gmail SMTP. Check credentials in .env file.');
    process.exit(1);
  }
  console.log('✅ Test 1 Passed: SMTP connection verified.');

  const recipient = process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com';


  // Test 2: Member Added Email
  console.log('\n[Test 2] Sending Member Added Notification...');
  const memberAddRes = await sendMemberNotification({
    companyName: 'Acme Corporation Ltd.',
    memberName: 'Ahmed Hassan',
    action: 'Added',
    recipientEmail: recipient,
    details: {
      relation: 'Employee',
      department: 'Engineering',
      nationalId: '29810150109988',
    },
  });
  console.log(`Member Added Result:`, memberAddRes);
  if (memberAddRes.success) {
    console.log('✅ Test 2 Passed: Member Added email dispatched.');
  } else {
    console.error('❌ Test 2 Failed:', memberAddRes.error);
  }

  // Test 3: Member Deleted Email
  console.log('\n[Test 3] Sending Member Deleted Notification...');
  const memberDelRes = await sendMemberNotification({
    companyName: 'Acme Corporation Ltd.',
    memberName: 'Sara Mohamed',
    action: 'Deleted',
    recipientEmail: recipient,
  });
  console.log(`Member Deleted Result:`, memberDelRes);
  if (memberDelRes.success) {
    console.log('✅ Test 3 Passed: Member Deleted email dispatched.');
  } else {
    console.error('❌ Test 3 Failed:', memberDelRes.error);
  }

  // Test 4: Policy Expiry Reminder Email (90 Days)
  console.log('\n[Test 4] Sending 90-Day Policy Expiry Reminder...');
  const policyExpiryHtml = getPolicyExpiryHtml({
    policyNumber: 'POL-MED-2026-0089',
    companyName: 'Global Tech Solutions',
    expiryDate: '2026-12-02',
    daysRemaining: 90,
  });
  const policyExpiryRes = await sendEmail({
    to: recipient,
    subject: 'Policy Expiry Reminder - Global Tech Solutions',
    html: policyExpiryHtml,
    relatedType: 'policy',
  });
  console.log(`Policy Expiry Result:`, policyExpiryRes);
  if (policyExpiryRes.success) {
    console.log('✅ Test 4 Passed: Policy Expiry email dispatched.');
  } else {
    console.error('❌ Test 4 Failed:', policyExpiryRes.error);
  }

  console.log('\n--- All Email System Tests Completed ---');
}

runEmailTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
