# Incident response

An incident is any unplanned event degrading service for users. Severity is set by the
first responder and can be raised by anyone at any time; it is never lowered without
the incident commander agreeing.

## Severities

- **SEV1** - the product is unusable for most users, or data is at risk. Page
  immediately. Executive update every 30 minutes.
- **SEV2** - a major feature is broken, or a subset of users are blocked. Page during
  business hours, ticket overnight.
- **SEV3** - degraded but usable. No page. Handled in the next working day.

## Roles

The **incident commander** coordinates and makes the call; they do not debug. The
**communications lead** writes updates for the status page. **Responders** debug.

One person may hold two roles in a SEV3 but never in a SEV1.

## Afterwards

A written retrospective is due within five working days. It is blameless: the question
is what made the mistake easy to make, not who made it.
