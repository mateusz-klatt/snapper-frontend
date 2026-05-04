# Security Policy

## Supported versions

Only the latest tagged release of `snapper-frontend` receives security fixes. Older versions are not maintained.

| Version                           | Supported |
| --------------------------------- | --------- |
| latest tag (`vX.Y.Z`) on `master` | ✅        |
| anything else                     | ❌        |

## Reporting a vulnerability

**Please do not open a public issue for security reports.**

Use GitHub's private vulnerability reporting:

1. Go to the [Security Advisories](https://github.com/mateusz-klatt/snapper-frontend/security/advisories) tab
2. Click **Report a vulnerability**
3. Include: affected version/commit, reproduction steps, observed impact, and (if known) suggested mitigation

If GitHub private reporting is not available to you, open an empty public issue titled "security contact request" — a maintainer will provide a private channel.

## What to expect

- Acknowledgement within 7 days
- Reasonable-effort fix or mitigation plan within 30 days for critical issues
- Coordinated disclosure — please do not publish details until a fix ships

## Out of scope

- Vulnerabilities in the upstream Snapper backend (report against the [`snapper`](https://github.com/mateusz-klatt/snapper) repo if it has its own policy, otherwise via the same private channel)
- Issues that require a privileged attacker on the local machine running the dev server
- Theoretical issues without a reproducible exploit
- Bugs in third-party dependencies — please report upstream first; we'll bump versions as fixes land

## Scope examples

In scope: XSS in rendered components, broken auth flows in shipped UI, leaked credentials in built artefacts, supply-chain risks in lockfile/build pipeline.

Out of scope: pure DoS via crafted input that the backend would reject anyway, dev-only conveniences (e.g. `make dev-lan` exposing the dev server on LAN — that is intentional opt-in).
