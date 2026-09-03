export interface PolicyExpiryTemplateProps {
  policyNumber: string;
  companyName: string;
  expiryDate: string;
  daysRemaining?: number;
  reminderMessage?: string;
}

export function getPolicyExpiryHtml(props: PolicyExpiryTemplateProps): string {
  const { policyNumber, companyName, expiryDate, daysRemaining = 90, reminderMessage } = props;
  const message = reminderMessage || `This is a reminder that policy #${policyNumber} for ${companyName} is scheduled to expire in ${daysRemaining} days (${expiryDate}). Please contact your account executive or account manager to review renewal options.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Policy Expiry Reminder</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; }
    .header { background: #1E3A8A; padding: 24px 32px; text-align: left; }
    .logo { color: #60A5FA; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .subtitle { color: #93C5FD; font-size: 13px; margin-top: 4px; }
    .body { padding: 32px; }
    .warning-box { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 6px; margin-bottom: 24px; color: #92400E; font-size: 14px; font-weight: 500; }
    h2 { font-size: 20px; margin-top: 0; color: #0F172A; }
    .info-card { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .label { font-weight: 600; color: #64748B; font-size: 14px; }
    .value { font-weight: 600; color: #0F172A; font-size: 14px; text-align: right; }
    .footer { background: #F8FAFC; padding: 20px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">IWIB System</div>
      <div class="subtitle">Policy Renewal & Expiry Reminder</div>
    </div>
    <div class="body">
      <div class="warning-box">
        ⚠️ <strong>Action Required:</strong> Policy Expiration Notice (3 Months Warning)
      </div>

      <h2>Policy Expiry Reminder</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">${message}</p>

      <div class="info-card">
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td class="label">Policy Number:</td>
            <td class="value" style="font-family: monospace; color: #2563EB;">${policyNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td class="label">Company Name:</td>
            <td class="value">${companyName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td class="label">Expiration Date:</td>
            <td class="value" style="color: #DC2626;">${expiryDate}</td>
          </tr>
          <tr>
            <td class="label">Days Until Expiry:</td>
            <td class="value">${daysRemaining} Days</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748B;">Please ensure all necessary renewal documentation is submitted prior to expiration to maintain uninterrupted coverage.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Antigravity Systems / IWIB Insurance Management. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
}
