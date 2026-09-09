# Raw incident notes - INC-2431

14:02 Alerts fire: checkout 5xx rate 0.2% -> 11%. Pager goes to Mei (primary).
14:04 Mei acks. Confirms in the dashboard: only the EU region.
14:09 Ravi joins. Notes the 14:00 deploy of payments-api v3.11.
14:11 Someone asks in the channel whether to roll back. No decision recorded.
14:18 Ravi finds a NullPointerException in the new currency-rounding path,
      triggered only when the cart total ends in .00 exactly.
14:22 Mei declares SEV1 (money at risk, EU checkout down for ~40% of carts).
14:24 Rollback started.
14:26 Rollback complete. Error rate back to 0.2% by 14:28.
14:31 Ravi opens a fix PR. Merged 15:10, deployed 15:24 behind a flag.

Notes:
- Nobody was formally incident commander until 14:22.
- The canary rollout did not abort: the canary carts happened to have
  non-.00 totals, so the error rate on the canary stayed at 0.1%.
- Status page was never updated. Two customers emailed support.
- The unit tests cover currency rounding but not the .00 boundary.
