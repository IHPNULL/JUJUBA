# Métricas do Jujuba

Onde ver quantas pessoas baixaram, instalaram e usam o app. São quatro fontes
diferentes, medindo coisas diferentes — nenhuma delas sozinha responde tudo.

| Quero saber | Fonte | Precisão |
|---|---|---|
| Quantas vezes o `.apk` foi baixado | Releases do GitHub (`npm run downloads`) | Exata (downloads, não instalações) |
| Quantas instalações existem e estão ativas | EAS Insights (`expo-insights`) | Aproximada, só Android/iOS |
| Quantos aparelhos pegaram um update OTA | Painel do EAS Update | Aproximada |
| Instalações e desinstalações reais | Play Console (quando publicado) | Exata, só quem instalar pela Play |
| Acessos da versão web por dia/semana/mês | GoatCounter (`npm run acessos`) | Visitantes únicos por dia |

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

## 5. Acessos da versão web

O GitHub Pages serve arquivos estáticos e não guarda log nenhum, então contar
acesso exige medir no navegador. O `expo-insights` não serve aqui: ele é um
módulo nativo (`platforms: ["apple", "android"]`, e o JS dele é literalmente
`export default {}`), então não roda na web — nem se o site mudasse de
hospedagem.

A escolha foi o [GoatCounter](https://www.goatcounter.com): gratuito para uso
não comercial, sem cookies, sem coletar dado pessoal, e com API para ler os
números de fora do painel.

### Como está ligado

O snippet fica em [`public/index.html`](../public/index.html) — o Expo usa esse
arquivo como shell do export web no lugar do template interno. O código do site
está escrito lá direto (`jujuba.goatcounter.com`); é público por natureza, não
é segredo. Se você registrar outro nome no GoatCounter, esse é o único lugar
que muda.

O `count.js` ignora `localhost` e IPs de rede privada, então `npm run web` no
dia a dia não entra na contagem.

### Configuração inicial (uma vez)

1. Crie o site em [goatcounter.com](https://www.goatcounter.com) com o código
   `jujuba` — a URL vira `https://jujuba.goatcounter.com`. Se o nome estiver
   ocupado, escolha outro e ajuste o `data-goatcounter` do
   `public/index.html`.
2. No painel: **Settings → API** → gerar uma chave com permissão de leitura de
   estatísticas.
3. Guarde a chave fora do repositório. Ela é secreta — quem tiver ela lê todas
   as suas estatísticas.

### Ver os números

```bash
GOATCOUNTER_TOKEN=... npm run acessos              # últimos 90 dias
GOATCOUNTER_TOKEN=... npm run acessos -- --dias=30
GOATCOUNTER_TOKEN=... npm run acessos -- --json
```

Sai o total por dia (últimos 14), por semana (segunda a domingo) e por mês.
Variáveis aceitas: `GOATCOUNTER_TOKEN` (obrigatória), `GOATCOUNTER_CODE`
(padrão `jujuba`).

**O que o número significa.** O GoatCounter conta *visitantes únicos por dia*,
sem cookie: ele gera um hash a partir de IP, navegador e um sal que muda todo
dia, e descarta o resto. Some-se que a agregação por semana e por mês deste
script é a soma dos dias — então quem entra na segunda e na quarta conta duas
vezes no total da semana. É uma medida de movimento, não de pessoas distintas
no mês.

**Limite conhecido:** o `count.js` registra o carregamento da página. O Jujuba
é uma tela só, então na prática cada acesso é uma visita — mas navegação
interna futura não seria contada sem ajuste.
