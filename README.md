<p align="center">
  <img src="assets/jujuba-icon.jpeg" alt="Jujuba" width="120" height="120" style="border-radius: 60px;" />
</p>

<h1 align="center">Jujuba</h1>
<p align="center"><strong>App de notas escolares do Colégio Ser</strong></p>

Cadastre suas matérias, lance as notas de AT, Objetiva, SAEP e Tarefa por trimestre e veja
a média calculada na hora — com a fórmula oficial do Ser — além de quanto falta tirar nas
notas em aberto para bater sua meta.

**Offline-first.** Suas notas ficam só no aparelho: sem conta, sem login, sem sincronização.

## Como usar

- **No navegador**: [ihpnull.github.io/JUJUBA](https://ihpnull.github.io/JUJUBA/)
- **No Android**: baixe o `.apk` em [Releases](../../releases) e instale no aparelho —
  passo a passo em [`docs/COMO-INSTALAR.md`](docs/COMO-INSTALAR.md)

## Métricas

Quantas vezes o `.apk` foi baixado: `npm run downloads`. Instalações, uso e
adoção de updates: painel do EAS. Detalhes das quatro fontes em
[`docs/METRICAS.md`](docs/METRICAS.md).

## Privacidade

**O que você cadastra é seu e não sai daqui.** Matérias, notas e meta ficam
salvas só no seu aparelho, num banco local. Não existe conta, login ou
sincronização, e nada disso é enviado para lugar nenhum.

**O que o app envia.** O Jujuba fala com dois serviços da Expo, e só com eles:

- consulta se existe atualização do app (`u.expo.dev`), ao abrir e ao voltar
  para o primeiro plano, no máximo uma vez por hora;
- registra que o app foi aberto (`i.expo.dev`), para sabermos quantas
  instalações existem. Vão nesse registro apenas: a versão do app, se é Android
  ou iOS, a versão do sistema e um número aleatório criado na instalação — nada
  que identifique você, e nenhuma nota.

Isso vale para o app Android. A versão web não envia nem esse registro.

O detalhamento campo a campo está em [`docs/METRICAS.md`](docs/METRICAS.md).

## Licença

MIT — ver [`LICENSE`](LICENSE).
