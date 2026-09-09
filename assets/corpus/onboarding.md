# Onboarding a new engineer

New engineers get a laptop on day one and production access at the end of week two.
The gap is deliberate: the first fortnight is spent on the local stack.

## Day one

Clone `kestrel-monorepo` and run `make bootstrap`. It installs the toolchain, seeds a
local Postgres, and runs the smoke tests. If `make bootstrap` fails, it is almost always
a stale Docker volume - `make nuke` then retry.

Your buddy is assigned in the onboarding ticket. Ask them anything. The expectation is
that you interrupt them, not that you struggle quietly.

## Week one

Ship one small change end to end. It does not matter what. The point is to walk the
whole path: branch, PR, review, merge, deploy, verify in staging.

## Production access

Requested through ticket type `ACCESS-PROD`, approved by your manager and one member of
the platform team. Access is scoped per service, never blanket. Requests are reviewed
every quarter and expire after twelve months.
