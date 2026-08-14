# Como instalar o Jujuba (Android)

O Jujuba não está na Play Store — é distribuído como um `.apk` direto, baixado dos
[Releases](../../../releases) deste repositório.

## Passo a passo

1. Abra a página de [Releases](../../../releases) **no navegador do próprio celular**
   (ou baixe no computador e transfira o arquivo `.apk` para o celular via cabo, e-mail
   ou qualquer app de transferência).
2. Toque no arquivo `.apk` da versão mais recente para baixar.
3. Ao tentar abrir o arquivo baixado, o Android provavelmente vai bloquear a instalação
   com uma mensagem sobre "fontes desconhecidas" ou "apps desconhecidos". Isso é
   normal — apps fora da Play Store sempre passam por essa checagem. Toque em
   **Configurações** na própria mensagem de aviso e libere a instalação para o app que
   você usou para abrir o arquivo (geralmente o navegador ou o gerenciador de
   arquivos).
4. Volte e toque no `.apk` de novo. Agora aparece a tela normal de instalação —
   toque em **Instalar**.
5. Pronto. O ícone do Jujuba aparece na tela de apps.

## Por que não tem versão iOS ainda?

Distribuir um `.apk` direto funciona no Android porque o sistema permite instalar
apps de qualquer origem (com a confirmação do passo 3 acima). No iPhone não existe
equivalente: toda instalação fora da App Store exige que o aparelho esteja cadastrado
antecipadamente (via TestFlight ou build ad hoc), o que não é possível fazer só
disponibilizando um arquivo para download. Uma build iOS instalável exigiria conta
Apple Developer paga e cadastro do UDID de cada aparelho — fora do escopo por agora.

## Atualizações

Depois de instalado, o app aplica pequenas atualizações sozinho via
[EAS Update](../README.md#atualizações-ota-eas-update) — quando uma nova versão de
JavaScript for publicada, um aviso aparece na tela pedindo para tocar em "Atualizar
agora". O app nunca reinicia sozinho: a atualização só é aplicada quando você toca no
aviso.

Atualizações que mudam código nativo (uma nova dependência, por exemplo) não chegam
por esse caminho — para essas, é preciso baixar um novo `.apk` dos Releases e instalar
por cima (o Android atualiza o app existente, não precisa desinstalar antes).
