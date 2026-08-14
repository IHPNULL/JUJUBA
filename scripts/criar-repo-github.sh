#!/usr/bin/env bash
# Publica este diretorio como um repositorio PRIVADO no GitHub.
# Requer o GitHub CLI: https://cli.github.com  (brew install gh)
set -euo pipefail

NOME_REPO="${1:-jujuba}"

command -v gh >/dev/null || { echo "GitHub CLI (gh) nao encontrado."; exit 1; }
gh auth status >/dev/null 2>&1 || gh auth login

git init -b main
git add -A
git commit -m "feat: arquitetura inicial, motor de formula e ADRs"

gh repo create "$NOME_REPO" --private --source=. --remote=origin --push

# Protecao da branch main (opcional, requer plano compativel)
gh api -X PUT "repos/{owner}/$NOME_REPO/branches/main/protection" \
  -f "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "enforce_admins=true" \
  -F "required_status_checks=null" \
  -F "restrictions=null" 2>/dev/null || echo "Aviso: protecao de branch nao aplicada."

echo "Pronto: $(gh repo view "$NOME_REPO" --json url -q .url)"
