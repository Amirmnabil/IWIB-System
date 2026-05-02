/**
 * @fileOverview Pricing Matrix for SME Medical Plans.
 * Contains age-based lookup tables for Employee, Spouse, and Child premiums.
 */

export type PricingStyle = 'AXA_001' | 'AXA_002' | 'AXA_003' | 'AXA_004' | 'AXA_005' | 'SARWA_001' | 'SARWA_002' | 'SARWA_003' | 'SARWA_004' | 'METLIFE_001' | 'METLIFE_002' | 'METLIFE_003' | 'METLIFE_004';

export interface PricePoint {
  emp: number;
  spouse: number;
  child: number;
}

// Map Plan IDs to their respective pricing styles based on the provided data patterns
export const PLAN_PRICING_STYLE_MAP: Record<string, PricingStyle> = {
  // AXA Group (Many others share AXA_001 style in the provided data)
  "AXA-001": 'AXA_001', "AXA-002": 'AXA_002', "AXA-003": 'AXA_003', "AXA-004": 'AXA_004', "AXA-005": 'AXA_005',
  "Arop-001": 'AXA_001', "Arop-002": 'AXA_001', "Arop-003": 'AXA_001',
  "Chubb-001": 'AXA_001', "Chubb-002": 'AXA_001', "Chubb-003": 'AXA_001', "Chubb-004": 'AXA_001',
  "GIG-001": 'AXA_001', "GIG-002": 'AXA_001', "GIG-003": 'AXA_001', "GIG-004": 'AXA_001', "GIG-005": 'AXA_001', "GIG-006": 'AXA_001', "GIG-007": 'AXA_001',
  "Labno swiss-001": 'AXA_001', "Labno swiss-002": 'AXA_001', "Labno swiss-003": 'AXA_001', "Labno swiss-004": 'AXA_001', "Labno swiss-005": 'AXA_001', "Labno swiss-006": 'AXA_001',
  "Misr Insurance Takaful-001": 'AXA_001', "Misr Insurance Takaful-002": 'AXA_001', "Misr Insurance Takaful-003": 'AXA_001', "Misr Insurance Takaful-004": 'AXA_001', "Misr Insurance Takaful-005": 'AXA_001',
  "Sarwa Life-001": 'AXA_001', "Sarwa Life-002": 'AXA_001', "Sarwa Life-003": 'AXA_001', "Sarwa Life-004": 'AXA_001', "Sarwa Life-005": 'AXA_001', "Sarwa Life-006": 'AXA_001',
  "Kaf-001": 'AXA_001', "Kaf-002": 'AXA_001', "Kaf-003": 'AXA_001', "Kaf-004": 'AXA_001', "Kaf-005": 'AXA_001',
  
  // Sarwa General Group
  "Sarwa General -001": 'SARWA_001', "Sarwa General -002": 'SARWA_002', "Sarwa General -003": 'SARWA_003', "Sarwa General -004": 'SARWA_004',
  
  // MetLife Group
  "Metlife-001": 'METLIFE_001', "Metlife-002": 'METLIFE_002', "Metlife-003": 'METLIFE_003', "Metlife-004": 'METLIFE_004',
};

export const getPremium = (style: PricingStyle, age: number, type: 'Employee' | 'Spouse' | 'Child'): number => {
  switch (style) {
    case 'AXA_001':
      if (age <= 5) return type === 'Child' ? 4687 : 0;
      if (age <= 10) return type === 'Child' ? 3824 : 0;
      if (age <= 15) return type === 'Child' ? 4497 : 0;
      if (age <= 17) return type === 'Child' ? 5691 : 0;
      if (age <= 20) return type === 'Employee' ? 6055 : 5691;
      if (age <= 25) return type === 'Employee' ? 7536 : 7173;
      if (age <= 30) return type === 'Employee' ? 9526 : 9103;
      if (age <= 35) return type === 'Employee' ? 10991 : 10568;
      if (age <= 40) return type === 'Employee' ? 13153 : 12622;
      if (age <= 45) return type === 'Employee' ? 14840 : 14018;
      if (age <= 50) return type === 'Employee' ? 18882 : 17514;
      if (age <= 55) return type === 'Employee' ? 25382 : 23183;
      if (age <= 60) return type === 'Employee' ? 29645 : 26382;
      return type === 'Employee' ? 41949 : 36525;

    case 'AXA_002':
      if (age <= 5) return type === 'Child' ? 3750 : 0;
      if (age <= 10) return type === 'Child' ? 3059 : 0;
      if (age <= 15) return type === 'Child' ? 3598 : 0;
      if (age <= 17) return type === 'Child' ? 4553 : 0;
      if (age <= 20) return type === 'Employee' ? 4916 : 4553;
      if (age <= 25) return type === 'Employee' ? 6102 : 5738;
      if (age <= 30) return type === 'Employee' ? 7705 : 7283;
      if (age <= 35) return type === 'Employee' ? 8877 : 8455;
      if (age <= 40) return type === 'Employee' ? 10628 : 10098;
      if (age <= 45) return type === 'Employee' ? 12036 : 11215;
      if (age <= 50) return type === 'Employee' ? 15379 : 14012;
      if (age <= 55) return type === 'Employee' ? 20745 : 18547;
      if (age <= 60) return type === 'Employee' ? 24369 : 21106;
      return type === 'Employee' ? 34644 : 29220;

    case 'AXA_003':
      if (age <= 4) return type === 'Child' ? 2773 : 0;
      if (age <= 9) return type === 'Child' ? 2263 : 0;
      if (age <= 14) return type === 'Child' ? 2661 : 0;
      if (age <= 17) return type === 'Child' ? 3367 : 0;
      if (age <= 20) return type === 'Employee' ? 3731 : 3367;
      if (age <= 25) return type === 'Employee' ? 4608 : 4244;
      if (age <= 30) return type === 'Employee' ? 5809 : 5386;
      if (age <= 35) return type === 'Employee' ? 6675 : 6253;
      if (age <= 40) return type === 'Employee' ? 7999 : 7468;
      if (age <= 45) return type === 'Employee' ? 9116 : 8294;
      if (age <= 50) return type === 'Employee' ? 11730 : 10363;
      if (age <= 55) return type === 'Employee' ? 15916 : 13717;
      if (age <= 60) return type === 'Employee' ? 18873 : 15610;
      return type === 'Employee' ? 27035 : 21611;

    case 'AXA_004':
      if (age <= 5) return type === 'Child' ? 3018 : 0;
      if (age <= 10) return type === 'Child' ? 2438 : 0;
      if (age <= 15) return type === 'Child' ? 2886 : 0;
      if (age <= 17) return type === 'Child' ? 3160 : 0;
      if (age <= 20) return type === 'Employee' ? 3421 : 3160;
      if (age <= 25) return type === 'Employee' ? 4173 : 3912;
      if (age <= 30) return type === 'Employee' ? 5178 : 4860;
      if (age <= 35) return type === 'Employee' ? 5901 : 5583;
      if (age <= 40) return type === 'Employee' ? 7107 : 6680;
      if (age <= 45) return type === 'Employee' ? 8107 : 7389;
      if (age <= 50) return type === 'Employee' ? 10445 : 9181;
      if (age <= 55) return type === 'Employee' ? 14220 : 12124;
      if (age <= 60) return type === 'Employee' ? 16835 : 13676;
      return type === 'Employee' ? 24282 : 18961;

    case 'AXA_005':
      if (age <= 4) return type === 'Child' ? 2596 : 0;
      if (age <= 9) return type === 'Child' ? 2096 : 0;
      if (age <= 14) return type === 'Child' ? 2482 : 0;
      if (age <= 17) return type === 'Child' ? 2717 : 0;
      if (age <= 20) return type === 'Employee' ? 2978 : 2717;
      if (age <= 25) return type === 'Employee' ? 3625 : 3364;
      if (age <= 30) return type === 'Employee' ? 4498 : 4179;
      if (age <= 35) return type === 'Employee' ? 5120 : 4801;
      if (age <= 40) return type === 'Employee' ? 6172 : 5745;
      if (age <= 45) return type === 'Employee' ? 7073 : 6354;
      if (age <= 50) return type === 'Employee' ? 9160 : 7895;
      if (age <= 55) return type === 'Employee' ? 12522 : 10427;
      if (age <= 60) return type === 'Employee' ? 14920 : 11762;
      return type === 'Employee' ? 21628 : 16306;

    case 'SARWA_001':
      if (age <= 17) return 6153;
      if (age <= 24) return 5678;
      if (age <= 29) return 7195;
      if (age <= 34) return 7788;
      if (age <= 39) return 9316;
      if (age <= 44) return 10653;
      if (age <= 49) return 15358;
      if (age <= 54) return 19579;
      if (age <= 59) return 28995;
      return 40179;

    case 'SARWA_002':
      if (age <= 17) return 5318;
      if (age <= 24) return 4904;
      if (age <= 29) return 6210;
      if (age <= 34) return 6719;
      if (age <= 39) return 8033;
      if (age <= 44) return 9180;
      if (age <= 49) return 13225;
      if (age <= 54) return 16855;
      if (age <= 59) return 24952;
      return 34573;

    case 'SARWA_003':
      if (age <= 17) return 3768;
      if (age <= 24) return 3492;
      if (age <= 29) return 4435;
      if (age <= 34) return 4809;
      if (age <= 39) return 5762;
      if (age <= 44) return 6607;
      if (age <= 49) return 9550;
      if (age <= 54) return 12184;
      if (age <= 59) return 18063;
      return 25030;

    case 'SARWA_004':
      if (age <= 17) return 2621;
      if (age <= 24) return 2448;
      if (age <= 29) return 3123;
      if (age <= 34) return 3398;
      if (age <= 39) return 4086;
      if (age <= 44) return 4708;
      if (age <= 49) return 6838;
      if (age <= 54) return 8737;
      if (age <= 59) return 12983;
      return 17991;

    case 'METLIFE_001':
      if (age <= 20) return type === 'Employee' ? 7287 : 6880;
      if (age <= 25) return type === 'Employee' ? 7522 : 7115;
      if (age <= 30) return type === 'Employee' ? 8387 : 7911;
      if (age <= 35) return type === 'Employee' ? 9429 : 8953;
      if (age <= 40) return type === 'Employee' ? 12123 : 11522;
      if (age <= 45) return type === 'Employee' ? 15984 : 15067;
      if (age <= 50) return type === 'Employee' ? 24487 : 22966;
      if (age <= 55) return type === 'Employee' ? 34357 : 31855;
      return type === 'Employee' ? 46837 : 40019;

    case 'METLIFE_002':
      if (age <= 20) return type === 'Employee' ? 4030 : 3623;
      if (age <= 25) return type === 'Employee' ? 4154 : 3747;
      if (age <= 30) return type === 'Employee' ? 4642 : 4166;
      if (age <= 35) return type === 'Employee' ? 5191 : 4715;
      if (age <= 40) return type === 'Employee' ? 6669 : 6068;
      if (age <= 45) return type === 'Employee' ? 8852 : 7935;
      if (age <= 50) return type === 'Employee' ? 13616 : 12095;
      if (age <= 55) return type === 'Employee' ? 19279 : 16777;
      return type === 'Employee' ? 27894 : 21076;

    case 'METLIFE_003':
      if (age <= 20) return type === 'Employee' ? 2903 : 2473;
      if (age <= 25) return type === 'Employee' ? 2987 : 2557;
      if (age <= 30) return type === 'Employee' ? 3346 : 2843;
      if (age <= 35) return type === 'Employee' ? 3721 : 3218;
      if (age <= 40) return type === 'Employee' ? 4777 : 4141;
      if (age <= 45) return type === 'Employee' ? 6385 : 5415;
      if (age <= 50) return type === 'Employee' ? 9865 : 8255;
      if (age <= 55) return type === 'Employee' ? 14098 : 11449;
      return type === 'Employee' ? 18271 : 14384;

    case 'METLIFE_004':
      if (age <= 20) return type === 'Employee' ? 853 : 810;
      if (age <= 25) return type === 'Employee' ? 881 : 838;
      if (age <= 30) return type === 'Employee' ? 982 : 931;
      if (age <= 35) return type === 'Employee' ? 1105 : 1054;
      if (age <= 40) return type === 'Employee' ? 1428 : 1356;
      if (age <= 45) return type === 'Employee' ? 1901 : 1774;
      if (age <= 50) return type === 'Employee' ? 2935 : 2704;
      if (age <= 55) return type === 'Employee' ? 4148 : 3750;
      return type === 'Employee' ? 5310 : 4711;

    default:
      return 0;
  }
};
