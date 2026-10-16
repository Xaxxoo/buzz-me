# Legal Checklist — Prize Rounds

This document lists every item that requires legal sign-off **before** the `PRIZE_ROUNDS_ENABLED` feature flag is turned on in any environment. See PRD requirement PR7.

The flag is OFF by default everywhere. Do not enable it until every item below is marked complete.

---

## Regulatory compliance

- [ ] Determine whether Prize Rounds qualify as a "contest of skill" (exempt from gambling regulation) under the laws of every jurisdiction where the app operates, starting with Nigeria
- [ ] Confirm compliance with Nigeria's National Lottery Regulatory Commission (NLRC) rules — skill-based contests with no entry fee may be exempt, but must be verified
- [ ] Check requirements under the Federal Competition and Consumer Protection Act (FCCPA)
- [ ] If operating outside Nigeria in future, review each country's contest/sweepstakes laws before enabling the flag there
- [ ] Confirm no purchase/entry-fee requirement is enforced at the code level (PR3) and documented in terms of service

## Official rules

- [ ] Draft official rules for Prize Rounds covering: eligibility (age, residency, university affiliation), how winners are determined (score + speed, no randomness), prize amounts, odds disclosure (if required), void-where-prohibited clause, dispute resolution
- [ ] Have official rules reviewed by legal counsel
- [ ] Confirm official rules are displayed on every Prize Round screen (PR5)
- [ ] Determine whether rules must be filed with any regulatory body before the contest runs

## Eligibility and age

- [ ] Set minimum age for Prize Round participation (18+ recommended) and implement age-gate check
- [ ] Determine whether university students under 18 should be excluded
- [ ] Decide whether unverified players (no institutional email) can participate
- [ ] List excluded jurisdictions (if any)

## Tax and reporting

- [ ] Determine tax withholding obligations for prize amounts in Nigeria (personal income tax)
- [ ] Determine whether the company must report prize payouts to tax authorities
- [ ] If prizes exceed a threshold, determine whether winner must provide a Tax Identification Number (TIN)
- [ ] Clarify whether prizes are paid in Naira only or multiple currencies

## Payment and KYC

- [ ] Choose a payment provider for payouts (bank transfer, mobile money, etc.)
- [ ] Determine KYC (Know Your Customer) requirements for winners — identity verification before payout
- [ ] Define maximum payout amounts and any per-player caps
- [ ] Set up a segregated prize fund or escrow so budgeted prize money is reserved before the round starts

## Terms of service and privacy

- [ ] Update the app's Terms of Service to include Prize Round rules, dispute resolution, and liability limitations
- [ ] Update the Privacy Policy to cover any additional data collected for Prize Rounds (e.g. payment info, TIN)
- [ ] Ensure compliance with the Nigeria Data Protection Act 2023 for prize-related personal data

## App store compliance

- [ ] Review Apple App Store guidelines on real-money contests (App Store Review Guideline 3.1.1 — contests of skill may be exempt from IAP requirement, but must be verified)
- [ ] Review Google Play Store policy on real-money contests
- [ ] Determine whether the app needs a different age rating when Prize Rounds are enabled

## Insurance and liability

- [ ] Determine whether prize indemnity insurance is needed
- [ ] Review liability for technical failures during a Prize Round (server crash, disconnections)
- [ ] Define a dispute resolution process for contested results

## Record keeping

- [ ] Set up audit log for all Prize Rounds: creation, scheduling, winner determination, payout approval/rejection
- [ ] Determine data retention period for prize records
- [ ] Ensure the winner determination algorithm is reproducible and auditable (PR2)

---

## Sign-off

| Reviewer | Role | Date | Approved |
|----------|------|------|----------|
| | Legal counsel | | [ ] |
| | Finance / tax | | [ ] |
| | Product lead | | [ ] |
| | Engineering lead | | [ ] |

**Do not enable `PRIZE_ROUNDS_ENABLED` until all checkboxes above are complete and all reviewers have signed off.**
