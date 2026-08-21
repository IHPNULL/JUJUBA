#!/usr/bin/env bash
# Gera o APK e publica a release no GitHub, num comando só:
#
#   npm run release                     # usa a versão do package.json
#   npm run release -- v1.8.1           # força outra tag
#   npm run release -- --sem-desligar   # não desliga o computador no fim
#
# Build LOCAL de propósito: o `--local` compila na sua máquina e não consome a
# cota de builds do plano free do EAS. Mesmo assim as credenciais vêm do EAS,
# então o APK sai assinado com a mesma keystore de sempre — é isso que faz ele
# instalar por cima do app já instalado sem apagar as notas de ninguém.
#
# Pré-requisitos: JDK 17, ANDROID_HOME apontando para o SDK do Android, e
# login feito no `eas` e no `gh`. O script confere tudo antes de começar, para
# falhar em 2 segundos em vez de no meio de um build de 20 minutos.
set -euo pipefail

cd "$(dirname "$0")/.."

# O build local é longo; o padrão é desligar a máquina quando terminar, para
# poder deixar rodando e sair de perto. Só desliga se TUDO deu certo — com
# `set -e`, qualquer falha aborta antes de chegar lá.
DESLIGAR=1
ARGUMENTOS=()
for argumento in "$@"; do
  case "$argumento" in
    --sem-desligar) DESLIGAR=0 ;;
    *) ARGUMENTOS+=("$argumento") ;;
  esac
done

SEGUNDOS_ATE_DESLIGAR="${SEGUNDOS_ATE_DESLIGAR:-60}"

VERSAO="${ARGUMENTOS[0]:-v$(node -p "require('./package.json').version")}"
ARQUIVO="jujuba-$VERSAO.apk"

erro() { echo "✗ $1" >&2; exit 1; }
etapa() { echo ""; echo "→ $1"; }

etapa "Conferindo o ambiente"

command -v gh >/dev/null || erro "gh não encontrado. Instale com: brew install gh"
gh auth status >/dev/null 2>&1 || erro "gh não autenticado. Rode: gh auth login"
[ -n "${ANDROID_HOME:-}" ] || erro "ANDROID_HOME não definido — o build local precisa do SDK do Android."
command -v java >/dev/null || erro "java não encontrado. Instale com: brew install --cask temurin@17"

npx --yes eas-cli whoami >/dev/null 2>&1 || erro "EAS não autenticado. Rode: npx eas-cli login"

[ -z "$(git status --porcelain)" ] || erro "Working tree sujo. Commite ou descarte antes de publicar."

if git ls-remote --exit-code --tags origin "refs/tags/$VERSAO" >/dev/null 2>&1; then
  erro "A tag $VERSAO já existe. Suba a versão no package.json e no app.json antes de publicar."
fi

echo "✓ Tudo pronto para publicar $VERSAO"

etapa "Atualizando a main"
git checkout main
git pull origin main
npm ci

etapa "Rodando os mesmos portões do CI"
npm run lint
npm test -- --ci

etapa "Buildando o APK localmente (demora; a primeira vez baixa o Gradle)"
npx eas-cli build --profile apk --platform android --local --output "$ARQUIVO"

[ -s "$ARQUIVO" ] || erro "O build terminou mas $ARQUIVO não existe ou está vazio."
echo "✓ APK gerado: $(du -h "$ARQUIVO" | cut -f1)"

etapa "Publicando a release $VERSAO"
gh release create "$VERSAO" "$ARQUIVO" --title "Jujuba $VERSAO" --generate-notes

echo ""
echo "✓ Release publicada: $(gh release view "$VERSAO" --json url -q .url)"
echo "  Confira os downloads depois com: npm run downloads"

if [ "$DESLIGAR" -eq 0 ]; then
  exit 0
fi

# Contagem regressiva cancelável: desligar sem aviso é a forma clássica de
# alguém perder o que estava aberto em outra janela.
etapa "Desligando o computador em ${SEGUNDOS_ATE_DESLIGAR}s — Ctrl-C cancela"
for restante in $(seq "$SEGUNDOS_ATE_DESLIGAR" -1 1); do
  printf "\r  %ss... (Ctrl-C para cancelar)  " "$restante"
  sleep 1
done
printf "\n"

# `osascript` pede o desligamento ao sistema como o menu Apple faz: não exige
# sudo e deixa cada app salvar o que está aberto. O `sudo shutdown` é o plano
# B, e só vai funcionar se você já tiver sudo válido na sessão.
if command -v osascript >/dev/null; then
  osascript -e 'tell application "System Events" to shut down'
else
  sudo shutdown -h now
fi
