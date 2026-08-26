<p align="center">
  <img src="assets/jujuba-icon.jpeg" alt="Jujuba" width="120" height="120" style="border-radius: 60px;" />
</p>

<h1 align="center">Jujuba</h1>
<p align="center"><strong>App de notas escolares do Colégio Ser</strong></p>

Cadastre suas matérias, lance as notas de AT, Objetiva, SAEP e Tarefa por trimestre e veja
a média calculada na hora — com a fórmula oficial do Ser — além de quanto falta tirar nas
notas em aberto para bater sua meta.

**Objetivo do ano.** Cada matéria mostra quantos dos 24 pontos você já garantiu (o 3º
trimestre vale dobrado), quanto ainda falta, e a menor nota que resolve em cada prova que
resta. Se um trimestre ficar abaixo da sua meta, o app diz quanto tirar na recuperação e
qual nota substituir para render mais.

**Offline-first.** Suas notas ficam só no aparelho: sem conta, sem login, sem sincronização.

## Como usar

- **No navegador**: [ihpnull.github.io/JUJUBA](https://ihpnull.github.io/JUJUBA/)
- **No Android**: baixe o `.apk` em [Releases](../../releases) e instale no aparelho —
  o aparelho pede para autorizar a instalação de fora da Play Store

## Feedback

Achou um problema ou tem uma ideia? O botão **Feedback**, no canto superior
direito da tela, abre um formulário no navegador — sem login e sem precisar de
conta em lugar nenhum. Vão junto apenas a versão do app e a plataforma
(Android, iOS ou web); nenhuma nota, matéria ou meta sai do aparelho. Cada
resposta vira uma issue neste repositório.

## Métricas

`npm run metricas` gera uma página com tudo junto: downloads do `.apk`, acessos
da versão web por dia, semana e mês, e o ponteiro para as instalações no painel
do EAS. Cada fonte também tem seu comando (`npm run downloads`,
`npm run acessos`).

## Privacidade

**O que você cadastra é seu e não sai daqui.** Matérias, notas e meta ficam
salvas só no seu aparelho, num banco local. Não existe conta, login ou
sincronização, e nada disso é enviado para lugar nenhum.

**O que o app envia.** No app Android, e só nele, o Jujuba fala com dois
serviços da Expo:

- consulta se existe atualização do app (`u.expo.dev`), ao abrir e ao voltar
  para o primeiro plano, no máximo uma vez por hora;
- registra que o app foi aberto (`i.expo.dev`), para sabermos quantas
  instalações existem. Vão nesse registro apenas: a versão do app, se é Android
  ou iOS, a versão do sistema e um número aleatório criado na instalação — nada
  que identifique você, e nenhuma nota.

**Na versão web**, no lugar desses dois, roda o contador de acessos do
GoatCounter — sem cookie e sem dado pessoal: ele guarda um hash de IP e
navegador com um sal que muda todo dia, só para não contar a mesma visita duas
vezes, e descarta o resto.

## Licença

MIT — ver [`LICENSE`](LICENSE).
