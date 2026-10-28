# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest release | Yes |
| `main` | Yes |

Older releases are not supported; upgrade to the latest release.

## Reporting a vulnerability

**Do not open a public issue, pull request, or discussion for a security
problem.**

Report it privately through GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue in the advisory form.

If the button is not visible, private reporting is not enabled for your
account's view — contact a maintainer directly instead of filing publicly.

### What to include

- Affected version, commit, or branch
- The component involved (for example `apps/server`, `apps/web`, a `modules/*`
  package, or `packages/*`)
- Reproduction steps or a minimal proof of concept
- Impact: what an attacker gains, and the preconditions (auth, config,
  network position)
- Any suggested fix or mitigation
- Whether you intend to disclose publicly, and on what timeline

### What to expect

This is a volunteer-maintained project. Reports are handled on a best-effort
basis; **no response time is promised**. Valid reports are fixed on `main` and
in a release, and credit is given in the advisory unless you ask otherwise.

Please give us a reasonable window to ship a fix before public disclosure.
