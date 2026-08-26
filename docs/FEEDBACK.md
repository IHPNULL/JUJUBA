# Feedback

O botão de foguete no canto superior direito da tela abre um formulário no
navegador. Sem login, sem conta: o público do app é aluno, e exigir conta no
GitHub para relatar um problema é o mesmo que não ter canal nenhum.

O caminho completo:

```
botão no app  →  Google Forms  →  planilha de respostas
                       ↓
                  Apps Script  →  issue no repositório
```

## O que sai do aparelho

Só o que a pessoa digita, mais dois campos que o app preenche: **versão** e
**plataforma** (`android`, `ios` ou `web`). Nota, matéria e meta continuam no
SQLite local — não existe caminho no código que os leve ao formulário.

A URL é montada em
[`src/presentation/shared/feedback.ts`](../src/presentation/shared/feedback.ts).
É o único lugar do app que muda se o formulário mudar de endereço, e um teste
trava a garantia: a URL não carrega nenhum parâmetro além desses dois.

## O e-mail não vai para a issue

O formulário tem um campo de e-mail opcional, para quem quiser resposta. O
repositório é público, e endereço de aluno em issue pública fica indexado para
sempre — então o script copia tudo para a issue **menos** o e-mail. A issue diz
apenas que existe um; o endereço está na planilha de respostas.

## Montar o formulário

O formulário em uso tem estas perguntas. Os títulos importam: o script casa as
respostas pelo título exato, então mudar um título no formulário exige mudar a
constante correspondente no topo do script.

| Pergunta | Tipo | Obrigatória |
|---|---|---|
| `Isso é um problema ou uma ideia?` | múltipla escolha: Problema, Ideia, Outro | sim |
| `Conta o que aconteceu (ou o que você queria)` | parágrafo | sim |
| `Caso queira uma resposta adicione seu e-mail (Não obrigatório)` | resposta curta | não |
| `Versao` | resposta curta | não |
| `Plataforma` | múltipla escolha: App, Web | não |

Os dois últimos são preenchidos pelo app. O Google Forms não tem campo
realmente oculto: eles aparecem preenchidos e a pessoa pode editá-los. É o
preço de usar o Forms — vale tratar o que vem neles como pista, não como
verdade.

**Por que "Plataforma" é App/Web e não android/ios/web.** Prefill de múltipla
escolha só pega quando o valor bate exatamente com uma das opções, então o app
traduz `Platform.OS` para as opções que existem (`opcaoDePlataforma`, em
`feedback.ts`). Android e iOS caem os dois em "App" — a distinção se perde, e
com ela a pista de bug específico de um sistema. Para recuperá-la, troque
"Plataforma" para *resposta curta* no formulário e apague a tradução no código;
o app já manda `android`, `ios` ou `web`.

**Os IDs `entry.*`** vêm do link pré-preenchido do formulário: menu ⋮ → *Obter
link pré-preenchido* → preencha os campos → *Obter link*. Saem no formato
`.../viewform?usp=pp_url&entry.123456=x&entry.789012=y`, e são o que as
constantes `CAMPO_VERSAO` e `CAMPO_PLATAFORMA` guardam.

## Ligar ao GitHub

1. **Token.** No GitHub: *Settings → Developer settings → Personal access
   tokens → Fine-grained tokens*. Escopo: só o repositório `IHPNULL/JUJUBA`,
   permissão **Issues: Read and write**. Nada além disso — o token só precisa
   criar issue.
2. **Guardar o token.** No formulário: ⋮ → *Editor de scripts* → engrenagem
   (*Configurações do projeto*) → *Propriedades do script* → adicionar
   `GITHUB_TOKEN` com o valor. **Não** cole o token dentro do código: o Apps
   Script fica na sua conta, mas propriedade de script é o lugar certo, e o
   código deste repositório é público.
3. **Colar o script.** Copie
   [`scripts/feedback-para-issue.gs`](../scripts/feedback-para-issue.gs) no
   editor. Se os títulos das perguntas mudarem no formulário, mude as
   constantes no topo junto.
4. **Instalar o gatilho.** No editor: ícone de relógio (*Gatilhos*) → *Adicionar
   gatilho* → função `aoEnviarFormulario`, origem *Do formulário*, evento *Ao
   enviar formulário*. O Google vai pedir autorização uma vez.
5. **Rótulos.** O script marca `bug` para Problema e `enhancement` para Ideia.
   Se eles não existirem no repositório, o GitHub recusa a requisição inteira —
   o script então repete sem rótulo, para não perder o feedback. Criar os dois
   rótulos evita esse tropeço.

## Conferir

Envie uma resposta de teste pelo próprio botão do app. Deve aparecer uma issue
nova em minutos. Se não aparecer, o erro está em *Execuções*, no editor de
Apps Script — é lá que o `console.warn` do script escreve o motivo da recusa
do GitHub.

## Trocar o endereço do formulário

Uma linha: a constante `URL_FORMULARIO_FEEDBACK` em
[`src/presentation/shared/feedback.ts`](../src/presentation/shared/feedback.ts).
