export interface MemberItemDetails {
  memberName: string;
  relation?: string;
  nationalId?: string;
  department?: string;
}

export interface MemberNotificationTemplateProps {
  companyName: string;
  action: 'Added' | 'Deleted';
  dateTime?: string;
  members: MemberItemDetails[];
}

export function getMemberNotificationHtml(props: MemberNotificationTemplateProps): string {
  const { companyName, action, dateTime, members } = props;
  const isAddition = action === 'Added';
  const actionColor = isAddition ? '#10B981' : '#EF4444';
  const actionBg = isAddition ? '#ECFDF5' : '#FEF2F2';
  const formattedDate = dateTime || new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium' });
  const count = members.length;

  const isSingle = count === 1;
  const singleMember = members[0] || { memberName: 'Unknown' };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Member ${action} Notification</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .container { max-width: 650px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; }
    .header { background: #0F172A; padding: 24px 32px; text-align: left; }
    .logo { color: #38BDF8; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .subtitle { color: #94A3B8; font-size: 13px; margin-top: 4px; }
    .body { padding: 32px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; color: ${actionColor}; background-color: ${actionBg}; margin-bottom: 20px; }
    h2 { font-size: 20px; margin-top: 0; color: #0F172A; }
    .info-card { background-color: #F1F5F9; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #64748B; font-size: 14px; }
    .value { font-weight: 600; color: #0F172A; font-size: 14px; text-align: right; }
    .table-container { margin: 20px 0; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
    table.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    table.data-table th { background-color: #F1F5F9; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #CBD5E1; }
    table.data-table td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; color: #0F172A; }
    table.data-table tr:last-child td { border-bottom: none; }
    .footer { background: #F8FAFC; padding: 20px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">IWIB System</div>
      <div class="subtitle">Client Portal Notification</div>
    </div>
    <div class="body">
      <span class="badge">Action: Member ${action} (${count})</span>
      <h2>Member ${action} Notification</h2>
      <p>A member record submission has been made on the client portal for <strong>${companyName}</strong>. Details of the update are below:</p>

      <div class="info-card">
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td class="label">Company Name:</td>
            <td class="value">${companyName}</td>
          </tr>
          <tr>
            <td class="label">Action Executed:</td>
            <td class="value" style="color: ${actionColor}; font-weight: bold;">Member ${action}</td>
          </tr>
          <tr>
            <td class="label">Total Beneficiaries:</td>
            <td class="value" style="font-weight: bold;">${count}</td>
          </tr>
          <tr>
            <td class="label">Date & Time:</td>
            <td class="value">${formattedDate}</td>
          </tr>
        </table>
      </div>

      ${isSingle ? `
      <div class="info-card" style="margin-top: 10px;">
        <h4 style="margin: 0 0 10px 0; color: #334155;">Beneficiary Details</h4>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td class="label">Beneficiary Name:</td>
            <td class="value">${singleMember.memberName}</td>
          </tr>
          ${singleMember.relation ? `
          <tr>
            <td class="label">Relation:</td>
            <td class="value">${singleMember.relation}</td>
          </tr>
          ` : ''}
          ${singleMember.department ? `
          <tr>
            <td class="label">Department:</td>
            <td class="value">${singleMember.department}</td>
          </tr>
          ` : ''}
          ${singleMember.nationalId ? `
          <tr>
            <td class="label">National ID / Passport:</td>
            <td class="value">${singleMember.nationalId}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      ` : `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Beneficiary Name</th>
              <th>Relation</th>
              <th>Department</th>
              <th>National ID</th>
            </tr>
          </thead>
          <tbody>
            ${members.map((m, i) => `
            <tr>
              <td>${i + 1}</td>
              <td style="font-weight: 600;">${m.memberName}</td>
              <td>${m.relation || '-'}</td>
              <td>${m.department || '-'}</td>
              <td>${m.nationalId || '-'}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `}

      <p style="font-size: 13px; color: #64748B; margin-top: 24px;">This is an automated alert generated by the IWIB Client Portal System.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} IWIB System / IWIB Insurance Management. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
}
