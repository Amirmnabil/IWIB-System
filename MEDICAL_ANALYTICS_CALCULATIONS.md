# Medical Utilization Analytics: Actuarial Calculation Logic

This document outlines the core actuarial formulas and data enrichment logic used in the IWIB Medical Utilization Analytics engine.

## 1. Time-Period Normalization
To ensure metrics are comparable across different policy durations, the system calculates the exact elapsed period from the data.

*   **Elapsed Days**: `Max(1, DifferenceInDays(Latest_Service_Date, Policy_Start_Date))`
*   **Elapsed Months**: `Elapsed_Days / 30.44` (where 30.44 is the standard actuarial month length)
*   **Total Policy Days**: `DifferenceInDays(Policy_End_Date, Policy_Start_Date)` (Typically 365 or 366)

---

## 2. Core Performance KPIs (Actuals)
These metrics represent the "as-of-today" state of the portfolio.

*   **Total Net Cost**: Sum of all `Net Amount` from approved claims.
*   **Total Transactions**: Count of unique approved claim IDs.
*   **Loss Ratio (Actual)**: `(Total_Net_Cost / Total_Annual_Premium) * 100`
*   **Utilization Rate**: `(Unique_Claimants / Total_Census_Members) * 100`

---

## 3. Forecasting & Renewal Projections
Used to predict year-end outcomes and next-year requirements.

*   **Current Run Rate (Daily)**: `Total_Net_Cost / Elapsed_Days`
*   **Projected Year-End Total**: `Current_Run_Rate * Total_Policy_Days`
*   **Forecasted Loss Ratio**: `(Projected_Year_End_Total / Total_Annual_Premium) * 100`
*   **Next Year Forecast (Renewal)**: `Projected_Year_End_Total * 1.20` (Applying a default 20% medical inflation buffer)

---

## 5. Clinical & Risk Heuristics

### Heuristic Risk Score (Per Claim)
Calculated to identify high-impact transactions.
*   **Base Score**: `Net_Amount / 5000`
*   **Age Factor**: `1.5` if Member Age > 50, otherwise `1.0`
*   **Chronic Factor**: `2.0` if claim is flagged as Chronic, otherwise `1.0`
*   **Final Score**: `Math.Round(Base_Score * Age_Factor * Chronic_Factor)`

### Episode Identification
Claims are grouped into "Episodes" to identify follow-up care and chronic management.
*   **Logic**: Claims for the same member, with the same diagnosis, occurring within **14 days** of each other are assigned the same `Episode ID`.

---

## 6. Data Enrichment & Linking
The system integrates the raw consumption file with the official Policy Census (PolicyMembers).

*   **Primary Key**: `Member_Code` or `Staff_Code`.
*   **Fallback**: Fuzzy Name Match (Name includes/is-included-in if length > 5).
*   **Enriched Fields**:
    *   `Gender`, `Location`, `Job Title`, `Department` are pulled directly from Census.
    *   `Age` is calculated via `CalculateAge(Date_of_Birth)` from Census.
