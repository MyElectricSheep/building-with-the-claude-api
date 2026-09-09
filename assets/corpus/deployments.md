# Deployments

Kestrel deploys on merge to `main`. There is no manual deploy button and no deploy
window - if the pipeline is green, the change ships.

## The pipeline

1. Unit tests and lint (about four minutes)
2. Integration tests against an ephemeral database (about nine minutes)
3. Build and push the image
4. Progressive rollout: 5% of traffic, then 50%, then 100%, ten minutes apart

A rollout aborts automatically if the error rate on the canary exceeds 0.5% or p99
latency exceeds 800ms.

## Rolling back

`kestrel rollback <service>` reverts to the previously deployed image. It takes about
90 seconds. Roll back first, investigate afterwards - a rollback is never the wrong
first move during an incident.

Database migrations are the exception. They are not reverted by a rollback, which is
why every migration must be backwards compatible with the previous release. Add a
column, deploy, backfill, deploy again, then drop the old column in a later release.
