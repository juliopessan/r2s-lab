# Como testar a plataforma R2S Lab de ponta a ponta

Tudo abaixo roda no seu computador, sem GitHub e sem dado real. É um repositório só (`r2s-lab`):

```
r2s-lab/
├─ site/     landing page com o teaser
├─ 00-prework/, 05-encerramento/, squad/, tools/   o que o participante usa
└─ admin/    painel da coordenação (a lista do RH real nunca entra no git)
```

## 1. Landing page

```bash
cd r2s-lab/site
npm run serve
```

Abra o endereço impresso. Confira o teaser, o texto "R · 2 · S" e os botões de entrada.

## 2. Pre-work e pesquisa de satisfação

Abra no navegador (duplo clique ou o servidor local do VS Code), na raiz do repositório:

- `00-prework/index.html`: faça o pre-work, responda os quizzes e clique em **Exportar progresso**.
- `05-encerramento/pesquisa.html`: importe o arquivo exportado, responda a pesquisa e exporte de novo.

O arquivo gerado se chama `progress/<usuario>.json`. Num uso real ele vai para o repositório privado da pessoa.

## 3. Squad: dossiê, gates e verificador

Na raiz do repositório:

```bash
node tools/check-squad.mjs
```

O modelo intocado passa (pendência não é erro) e mostra "Gate atual: G0". Para ver uma squad em andamento, aponte para a de demonstração:

```bash
node tools/check-squad.mjs admin/tests/fixtures/squads/multiplicadores/squad
```

Você verá o gate atual (G3), o dossiê em 82%, o golden set (60 casos), a nota da squad (2.85) e o nível de cada pessoa. Teste os erros: marque um gate como `passed` em `squad/gates.json` com o documento ainda pendente e rode de novo; o verificador sai com código 1.

## 4. Certificado

Abra `05-encerramento/certificado.html`, preencha o nome, a data e o nível, e use **Imprimir ou salvar em PDF** (A4 paisagem). Nada sai do navegador.

## 5. Painel da coordenação com dados de demonstração

Na pasta `admin`:

```bash
npm run demo
```

Abra o endereço impresso. O painel mostra pessoas treinadas e faltantes, funil, satisfação, feedbacks e sugestões, squads, certificação e scorecard, tudo com dados sintéticos de `tests/fixtures/`.

## 6. Do arquivo exportado ao painel

1. Exporte o seu progresso (passo 2). O arquivo se chama `progress/<usuario>.json`.
2. Copie os dados de demonstração para uma pasta sua (`cp -r tests/fixtures minha-demo`).
3. Coloque o arquivo exportado em `minha-demo/progress/` e **acrescente uma linha com o seu usuário** em `minha-demo/roster.csv` (o painel só lê quem está na lista).
4. Gere o painel:

```bash
node src/build.mjs --fixtures minha-demo --roster minha-demo/roster.csv --out dist
```

5. Abra `dist/index.html`. Você deve aparecer em "Convidados" e, se terminou o pre-work, em "Concluíram o pre-work".

## O que só funciona com o GitHub real

- Leitura dos repositórios `r2s-lab-<usuario>` e `r2s-lab-squad-<nome>` pela API.
- A Action agendada que gera o painel (`.github/workflows/dashboard.yml`, que roda dentro de `admin/`) e o artefato privado de 7 dias.
- Os repositórios privados de cada pessoa e de cada squad.

## O que falta configurar antes do uso real

- **owner**: a organização ou o usuário do GitHub dono dos repositórios, em `config/lab.json` (hoje vazio).
- **LAB_READ_TOKEN**: token de leitura dos repositórios `r2s-lab-*`, guardado como secret do repositório de administração. Nunca no código.
- **A lista do RH**: guarde o conteúdo do CSV no secret `LAB_ROSTER_CSV`; o arquivo nunca entra no git, porque os participantes clonam este repositório.
- **A visibilidade** do repositório `juliopessan/r2s-lab` está privada. Os participantes precisam de acesso de leitura (convite ou organização) para clonar.
- **A pesquisa de satisfação**: confira o texto das perguntas, que foi reconstruído do documento original.
- **O diagnóstico oficial da semana 0**, que ainda não tem pontuação definida.
