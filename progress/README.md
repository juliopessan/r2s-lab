# Seu progresso

Esta pasta guarda **o seu arquivo de progresso**, um JSON por pessoa, no **seu repositório privado**
(`r2s-lab-<seu-usuario>`). A coordenação lê esse arquivo para saber quantas pessoas já fizeram o pre-work
e como foi a pesquisa de satisfação. Este repositório (o template) nunca guarda progresso de ninguém.

## Como gerar e enviar

1. Abra `00-prework/index.html` (ou `05-encerramento/pesquisa.html`, no fim da turma) e use o botão **Exportar progresso**.
2. O navegador baixa um arquivo `<seu-usuario>.json`, com o usuário em minúsculas.
3. Mova o arquivo para esta pasta (`progress/`), no seu repositório privado.
4. Faça o commit e o push:

   ```bash
   git add progress/<seu-usuario>.json
   git commit -m "progresso do pre-work"
   git push
   ```

Para continuar em outro computador ou navegador, abra a página e use **Importar** com o arquivo que está aqui.

## O que vai no arquivo

Só o andamento dos 13 blocos do pre-work, os acertos de cada quiz, a autoavaliação das 8 competências e,
no fim da turma, as respostas da pesquisa. Os **textos que você digita nos exercícios** (prompt, case brief,
pedido) ficam apenas no seu navegador e nunca entram no arquivo.

O formato está descrito em `progress.schema.json` (versão `r2s-progress/1`). Não edite o arquivo à mão.
