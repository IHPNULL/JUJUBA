# Métricas do Jujuba

Onde ver quantas pessoas baixaram, instalaram e usam o app. São quatro fontes
diferentes, medindo coisas diferentes — nenhuma delas sozinha responde tudo.

| Quero saber | Fonte | Precisão |
|---|---|---|
| Quantas vezes o `.apk` foi baixado | Releases do GitHub (`npm run downloads`) | Exata (downloads, não instalações) |
| Quantas instalações existem e estão ativas | EAS Insights (`expo-insights`) | Aproximada, só Android/iOS |
| Quantos aparelhos pegaram um update OTA | Painel do EAS Update | Aproximada |
| Instalações e desinstalações reais | Play Console (quando publicado) | Exata, só quem instalar pela Play |

## 1. Downloads das Releases

```bash
npm run downloads            # texto
npm run downloads -- --json  # JSON
```

Lê o `download_count` que o próprio GitHub mantém em cada arquivo publicado e
soma por release e no total. Não depende do app: é a API do GitHub.

Um download **não** é uma instalação. A mesma pessoa baixando duas vezes conta
duas; quem baixa e não instala também conta.

Repositório privado ou limite de requisições da API: exporte `GITHUB_TOKEN`
antes de rodar.

## 2. Instalações e uso — EAS Insights

O pacote `expo-insights` está instalado. Ele não tem API em JavaScript: basta
estar no projeto que o código nativo dispara um evento `APP_LAUNCH` a cada
abertura do app, para `https://i.expo.dev/v1/c/<projectId>`.

**O que é enviado, exatamente** (todos os campos, sem exceção):

| Campo | Conteúdo |
|---|---|
| `event_name` | sempre `APP_LAUNCH` |
| `eas_client_id` | UUID aleatório gerado na instalação e guardado no aparelho |
| `project_id` | o ID do projeto no EAS |
| `app_version` | ex.: `1.7.1` |
| `platform` | `android` ou `ios` |
| `os_version` | ex.: `34` |

Nenhum dado escolar sai do aparelho: matérias, notas e meta continuam só no
SQLite local, e não existe campo no evento que pudesse carregá-los. O
`eas_client_id` é o que permite contar instalações — cada aparelho vira um ID
estável, e a contagem de IDs únicos é a estimativa de instalações.

Onde ver: [expo.dev](https://expo.dev) → projeto `jujuba` → **Insights**.

Limites que valem saber:

- **Só Android e iOS.** A versão web não conta nada — o pacote não tem suporte
  a web.
- **Exige um build nativo novo.** É código nativo, então não vai por EAS
  Update; só entra em quem instalar um `.apk` gerado depois desta mudança.
- **Instalação ≠ pessoa.** Reinstalar gera um `eas_client_id` novo e conta como
  outra instalação; limpar os dados do app também. Desinstalação não é
  detectada — o número só sobe.

## 3. Adoção de updates OTA

O app já consulta `u.expo.dev` no cold launch e a cada volta ao primeiro plano
(com throttle de 1h) para saber se há atualização — ver
`src/presentation/shared/hooks/useAppUpdates.ts`. O painel do EAS Update mostra
a adoção de cada update publicado, o que serve como um segundo sinal de quantas
instalações estão ativas.

Onde ver: [expo.dev](https://expo.dev) → projeto `jujuba` → **Updates**.

## 4. Play Console

É a única fonte que dá instalação e **desinstalação** reais, por dia, por
versão e por aparelho, sem depender de nada dentro do app. Vale só para quem
instalar pela loja. Passo a passo em
[`PUBLICAR-NA-PLAY-STORE.md`](PUBLICAR-NA-PLAY-STORE.md).
