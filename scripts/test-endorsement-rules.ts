import { validateMemberAddition, calculateAge, validateNationalID, validateMobile } from '../src/lib/endorsement-validation';

function runTests() {
  console.log("=== Running Endorsement Validation Engine Tests ===");

  // 1. National ID checks
  console.log("\n1. Testing National ID extraction & verification:");
  
  // Egyptian National ID: 29505200101234
  // 1st digit: 2 = 1900s
  // DOB: 95-05-20 (May 20, 1995)
  // 13th digit: 3 (odd) = Male
  const nid1 = "29505200101234";
  const r1 = validateNationalID(nid1, "1995-05-20", "Male");
  console.log("Valid National ID check:", r1.isValid === true ? "PASS" : "FAIL", r1);

  // DOB mismatch
  const r2 = validateNationalID(nid1, "1995-05-21", "Male");
  console.log("DOB mismatch check (should fail):", r2.isValid === false ? "PASS" : "FAIL", r2.error);

  // Gender mismatch
  const r3 = validateNationalID(nid1, "1995-05-20", "Female");
  console.log("Gender mismatch check (should fail):", r3.isValid === false ? "PASS" : "FAIL", r3.error);

  // Mismatch century (first digit 3 = 2000s)
  const nid2 = "30208150101246"; // August 15, 2002, 13th digit 4 (even) = Female
  const r4 = validateNationalID(nid2, "2002-08-15", "Female");
  console.log("2000s Century DOB check:", r4.isValid === true ? "PASS" : "FAIL", r4);

  // 2. Mobile validation
  console.log("\n2. Testing Mobile number validation:");
  console.log("Valid mobile (01012345678):", validateMobile("01012345678") === true ? "PASS" : "FAIL");
  console.log("Invalid mobile (022345678):", validateMobile("022345678") === false ? "PASS" : "FAIL");
  console.log("Invalid mobile length (010123456789):", validateMobile("010123456789") === false ? "PASS" : "FAIL");

  // 3. Full member addition checks
  console.log("\n3. Testing full member validation rules:");

  const validEmployee = {
    member_name: "Test Employee",
    national_id: "29505200101234",
    date_of_birth: "1995-05-20",
    gender: "Male",
    relation: "Employee",
    mobile_number: "01012345678",
    plan_category: "Platinum"
  };

  const config = {
    plan: { min_age: 18, max_age: 60 },
    policy: { max_allowed_age: 65 },
    dependentRules: { child_max_age: 23 },
    existingNationalIds: ["29001010101234"],
    activeEmployees: []
  };

  const valResult1 = validateMemberAddition(validEmployee as any, config);
  console.log("Valid Employee validation:", valResult1.isValid === true ? "PASS" : "FAIL", valResult1.errors);

  // Underage for Plan
  const underageEmployee = {
    ...validEmployee,
    date_of_birth: "2010-05-20", // Age ~16
    national_id: "31005200101234"
  };
  const valResult2 = validateMemberAddition(underageEmployee as any, config);
  console.log("Underage employee for plan check (should fail):", valResult2.isValid === false ? "PASS" : "FAIL", valResult2.errors);

  // Overage for Plan
  const overageEmployee = {
    ...validEmployee,
    date_of_birth: "1955-05-20", // Age ~71
    national_id: "25505200101234"
  };
  const valResult3 = validateMemberAddition(overageEmployee as any, config);
  console.log("Overage employee for plan check (should fail):", valResult3.isValid === false ? "PASS" : "FAIL", valResult3.errors);

  // Spouse must be female check
  const maleSpouse = {
    ...validEmployee,
    relation: "Spouse",
    linked_main_member_id: "emp-1"
  };
  const configWithEmp = { ...config, activeEmployees: [{ id: "emp-1", member_name: "Emp One" }] };
  const valResult4 = validateMemberAddition(maleSpouse as any, configWithEmp);
  console.log("Male Spouse check (should fail):", valResult4.isValid === false ? "PASS" : "FAIL", valResult4.errors);

  // Child max age check (Age 25 > 23)
  const oldChild = {
    ...validEmployee,
    date_of_birth: "2001-05-20", // Age ~25
    national_id: "30105200101234",
    relation: "Child",
    linked_main_member_id: "emp-1"
  };
  const valResult5 = validateMemberAddition(oldChild as any, configWithEmp);
  console.log("Child max age check (should fail):", valResult5.isValid === false ? "PASS" : "FAIL", valResult5.errors);

  // Missing main member link check
  const orphanSpouse = {
    ...validEmployee,
    relation: "Spouse"
  };
  const valResult6 = validateMemberAddition(orphanSpouse as any, config);
  console.log("Orphan dependent check (should fail):", valResult6.isValid === false ? "PASS" : "FAIL", valResult6.errors);

  console.log("\n=== Validation Engine Tests Completed ===");
}

runTests();
