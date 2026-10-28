#!/usr/bin/env bash
# Applies the GitHub settings this repo's workflows rely on, then reads them
# back. Idempotent. Run it as soon as the workflows are on the default branch
# (for a repo made from this template: right after creating it):
#
#   scripts/github/setup-repo.sh [owner/repo]
#
# Needs a token that can administer the repository: a classic token with the
# `repo` scope held by an admin, or a fine-grained token with
# "Administration: read and write".
set -euo pipefail

repo=${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}
branch=$(gh api "repos/$repo" --jq .default_branch)
export branch

# Must equal the job names that report checks on a pull request.
required_checks='["Validate PR title", "verify", "e2e", "dependency-review"]'

echo "Configuring $repo ($branch)"

# Squash only: the checked PR title becomes the commit release-please reads.
gh api --silent --method PATCH "repos/$repo" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY \
  -F delete_branch_on_merge=true

gh api --silent --method PUT "repos/$repo/actions/permissions/workflow" \
  -f default_workflow_permissions=read \
  -F can_approve_pull_request_reviews=false

# SECURITY.md sends reporters to "Report a vulnerability".
gh api --silent --method PUT "repos/$repo/private-vulnerability-reporting"
# Also turns on the dependency graph; dependency-review.yml fails without it.
gh api --silent --method PUT "repos/$repo/vulnerability-alerts"
gh api --silent --method PUT "repos/$repo/automated-security-fixes"
gh api --silent --method PATCH "repos/$repo" \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'

# A solo maintainer cannot approve their own PR; with enforce_admins a
# required approval would block every merge. The PR and its checks still gate.
pushers=$(gh api "repos/$repo/collaborators?per_page=100" \
  --jq '[.[] | select(.permissions.push)] | length')
reviews=$([ "$pushers" -ge 2 ] && echo 1 || echo 0)

# strict=false: requiring branches to be up to date would make every open PR
# rebase and rerun CI after each merge, serializing parallel work. CI also
# runs on every push to the default branch.
gh api --silent --method PUT "repos/$repo/branches/$branch/protection" --input - <<JSON
{
  "required_status_checks": { "strict": false, "contexts": $required_checks },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": $reviews,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON

echo
echo "Read back:"
gh api "repos/$repo" --jq '"  merge: squash=\(.allow_squash_merge) merge=\(.allow_merge_commit) rebase=\(.allow_rebase_merge) title=\(.squash_merge_commit_title) delete_branch=\(.delete_branch_on_merge)",
  "  secret scanning: \(.security_and_analysis.secret_scanning.status), push protection: \(.security_and_analysis.secret_scanning_push_protection.status), dependabot fixes: \(.security_and_analysis.dependabot_security_updates.status)"'
gh api "repos/$repo/actions/permissions/workflow" --jq '"  workflow token: \(.default_workflow_permissions)"'
gh api "repos/$repo/private-vulnerability-reporting" --jq '"  private vulnerability reporting: \(.enabled)"'
gh api "repos/$repo/branches/$branch/protection" \
  --jq '"  \(env.branch) requires: \(.required_status_checks.contexts | join(", ")); approvals: \(.required_pull_request_reviews.required_approving_review_count); admins included: \(.enforce_admins.enabled)"'
