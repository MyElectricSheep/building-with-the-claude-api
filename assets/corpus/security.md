# Security basics

## Credentials

Secrets never go in source control, in a ticket, in Slack, or in a screenshot. They go
in the secret manager, referenced by name. If you have ever pasted a credential
somewhere it should not be, rotate it - do not reason about whether it was seen.

Personal access tokens expire after 90 days. Service credentials rotate automatically.

## Access

Access is least-privilege and time-bounded. Production access expires after twelve
months and is reviewed quarterly. Requesting access you do not need is a policy
violation even if you never use it.

## Reporting

Report anything suspicious to `security@` within one hour of noticing it, even if you
are not sure. A false alarm costs ten minutes. A delayed real report costs considerably
more.

There is no penalty for reporting your own mistake. There is a penalty for hiding one.
