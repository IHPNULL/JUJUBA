# Development build no celular (Android, via cabo)

Guia para rodar o Jujuba no celular plugado no computador, com recarga
automática a cada alteração de código.

## Por que não é `expo run:android`

`npx expo run:android` compila o app nativo **na sua máquina** e exige o
Android SDK completo (Android Studio, Gradle, `ANDROID_HOME`). Esta máquina
não tem esse SDK instalado — só o `adb` avulso — então esse caminho falha.

O caminho que funciona: a compilação nativa roda **na nuvem** (EAS Build) e
gera um APK de desenvolvimento. Esse APK é instalado uma vez no aparelho e,
a partir daí, ele se conecta ao Metro rodando no seu computador. Todo o
ciclo de desenvolvimento depois disso é local e instantâneo.

A diferença entre esse APK e o de produção (o dos Releases) é o
`expo-dev-client`: ele embute o menu de desenvolvimento e faz o app buscar o
JavaScript do seu Metro em vez do bundle embutido.

## Preparar o aparelho (uma vez só)

1. **Ativar as Opções do desenvolvedor**: Configurações → Sobre o telefone →
   tocar **7 vezes** em "Número da versão".
2. **Ativar a depuração USB**: Configurações → Opções do desenvolvedor →
   **Depuração USB**.
3. Plugar o cabo. Na primeira conexão o celular mostra um diálogo
   "Permitir depuração USB?" — aceite (marque "Sempre permitir" para não
   repetir).

Confirme que o computador enxerga o aparelho:

```bash
adb devices
```

Precisa listar o aparelho com o status `device`. Se aparecer `unauthorized`,
o diálogo do passo 3 não foi aceito. Se não aparecer nada, tente outro cabo —
muitos cabos são só de carga e não transmitem dados.

## 1. Gerar o development build (nuvem, ~10 min)

Só precisa rodar de novo quando mudar código nativo (nova dependência com
parte nativa, mudança em `app.json`, etc.). Mudança só de JavaScript **não**
exige rebuild.

```bash
npm run dev:build
```

## 2. Instalar no aparelho plugado

```bash
npm run dev:install
```

Baixa o build mais recente e instala direto no aparelho conectado. Se houver
mais de um aparelho conectado, o comando pergunta em qual instalar.

Se preferir instalar um APK que já baixou:

```bash
adb install -r caminho/para/o.apk
```

## 3. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Esse comando faz duas coisas: `adb reverse tcp:8081 tcp:8081`, que faz o
celular alcançar o Metro do computador **pelo próprio cabo** (sem depender de
estarem na mesma rede Wi-Fi), e sobe o Metro em modo dev-client.

Com o servidor no ar, abra o app **Jujuba (dev)** no celular — ele conecta
sozinho. A partir daí, salvar um arquivo recarrega a tela na hora.

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev:build` | Compila o development build na nuvem (EAS) |
| `npm run dev:install` | Instala o build mais recente no aparelho plugado |
| `npm run dev:link` | `adb reverse` — liga o celular ao Metro pelo cabo |
| `npm run dev` | `dev:link` + Metro em modo dev-client |

## Problemas comuns

**O app abre mas fica na tela de "Development servers"** — o Metro não está
acessível. Confira se `npm run dev` está rodando e rode `npm run dev:link`
de novo (o `adb reverse` cai quando o cabo é desconectado).

**`adb devices` mostra `unauthorized`** — aceite o diálogo de depuração USB
na tela do celular. Se ele não aparecer mais, revogue as autorizações em
Opções do desenvolvedor → "Revogar autorizações de depuração USB" e replugue.

**Mudei uma dependência e o app quebrou** — se a dependência tem parte
nativa, o APK atual não a contém. Rode `npm run dev:build` de novo.

## iOS

Não coberto aqui: instalar build de desenvolvimento em iPhone exige conta
Apple Developer paga e cadastro do UDID do aparelho — mesma limitação
descrita em [`COMO-INSTALAR.md`](COMO-INSTALAR.md).
