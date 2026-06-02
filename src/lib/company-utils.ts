import { differenceInDays, startOfDay, isValid } from 'date-fns';
import type { Company } from '@/lib/types';

export const getCompanyPriority = (company: Company) => {
    let score = 0;
    let level = 8;
    let label = 'Inactive';
    let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
    
    const today = startOfDay(new Date());
    const renewalDate = company.actual_renewal_date ? new Date(company.actual_renewal_date) : null;
    let daysToRenewal = Infinity;
    if (renewalDate && isValid(renewalDate)) {
        daysToRenewal = differenceInDays(startOfDay(renewalDate), today);
    }
    
    const isRenewalSoon = daysToRenewal <= 45 && daysToRenewal > -365;
    
    if (isRenewalSoon) {
       score = 100; level = 1; label = 'Renewal Soon'; badgeColor = 'bg-red-100 text-red-700 border-red-200';
    }
    else if (company.status === 'waiting_for_data') {
       score = 80; level = 2; label = 'Waiting Data'; badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
    }
    else if (company.status === 'request_meeting') {
       score = 70; level = 3; label = 'Pending Meeting'; badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
    }
    else if (company.status === 'call_back' || company.status === 'send_profile' || company.status === 'no_answer') {
       score = 60; level = 4; label = 'Follow-up'; badgeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
    else if (company.status === 'request_quotation') {
       score = 50; level = 5; label = 'Hot Lead'; badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
    }
    else if (!company.status || company.status === 'new') {
       score = 40; level = 6; label = 'New Lead'; badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
    }
    else if (company.status === 'renewed' || company.status === 'client') {
       score = 30; level = 7; label = 'In Progress'; badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    else {
       score = 10; level = 8; label = 'Inactive'; badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
    }

    if (daysToRenewal !== Infinity) {
        const timeScore = Math.max(0, 9 - (Math.abs(daysToRenewal) / 365 * 9));
        score += timeScore;
    }
    
    const createdDate = company.created_at ? new Date(company.created_at) : today;
    const daysSinceCreation = differenceInDays(today, createdDate);
    const creationScore = Math.max(0, 0.9 - (daysSinceCreation / 365 * 0.9));
    score += creationScore;

    return { score, level, label, badgeColor };
};
