# Publicar o Jujuba na Play Store

A Play Store é a única fonte que dá **instalações e desinstalações reais**, sem
depender de telemetria dentro do app — o Play Console mostra isso por dia, por
versão do app e por modelo de aparelho. De quebra, some o passo a passo de
sideload do [`COMO-INSTALAR.md`](COMO-INSTALAR.md): quem instalar pela loja
recebe atualização sozinho.

O repositório já está preparado: o perfil `submit.production.android` do
[`eas.json`](../eas.json) manda para o track `internal`. O que falta é conta,
pagamento e chaves — coisas que só você pode fazer.

## O que você precisa antes de começar

- Conta de desenvolvedor Google Play — **US$ 25, pagamento único**, em
  [play.google.com/console/signup](https://play.google.com/console/signup).
- Verificação de identidade (documento). Para conta pessoal o Google costuma
  levar alguns dias, e desde 2023 exige teste fechado com **12 testadores por
  14 dias** antes de liberar produção — planeje isso com antecedência.
- EAS CLI logado: `npx eas login`.

## 1. Criar o app no Play Console

Crie o app com o nome **Jujuba** e o pacote `com.anonymous.jujuba` — é o
`android.package` do [`app.json`](../app.json).

> Vale trocar `com.anonymous.jujuba` por algo seu (ex.: `dev.ihpnull.jujuba`)
> **antes** do primeiro envio. Depois de publicado, o package name é definitivo:
> mudar exige criar outro app na loja e perder os números acumulados.

## 2. Conta de serviço para o EAS Submit

O envio automatizado precisa de uma chave de serviço:

1. Play Console → **Configurações** → **Acesso via API** → criar/vincular um
   projeto no Google Cloud.
2. Crie uma conta de serviço, dê a ela permissão de **Administrador de
   versões** no app.
3. Baixe o JSON da chave e salve como `play-service-account.json` na raiz do
   repositório.

Esse arquivo **não** vai para o Git — já está no [`.gitignore`](../.gitignore).
Ele dá poder de publicar em seu nome; se vazar, revogue a chave no Google Cloud.

## 3. Build e envio

```bash
npm run build          # eas build --profile production --platform android
npx eas submit --profile production --platform android --latest
```

O perfil `production` gera **AAB** (formato exigido pela Play), e não o `.apk`
das Releases do GitHub — os dois podem conviver.

## 4. Data Safety

A Play exige o formulário de segurança de dados. Preencha coerente com o que o
app faz hoje (ver [`METRICAS.md`](METRICAS.md) §2):

- **Notas, matérias, meta:** não coletados, não saem do aparelho.
- **App info and performance / Other app activity:** coletados. O
  `expo-insights` envia versão do app, plataforma, versão do sistema e um ID
  aleatório por instalação a cada abertura.
- **Device or other IDs:** coletados — o `eas_client_id`.
- Marque como **não vinculado à identidade** (não existe conta ou login) e
  **não compartilhado com terceiros** para fins de anúncio.

Declarar "nenhum dado coletado" aqui seria falso e é motivo de suspensão do app.

## 5. Depois de publicado

Play Console → **Estatísticas**: instalações, desinstalações, aparelhos ativos,
por versão e por dia. É o número que o download das Releases nunca vai dar.
