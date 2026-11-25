# R2S Lab — Fase 1: landing, README do laboratório e formato da lista do RH — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a vitrine da marca (landing com o teaser), o README "comece aqui" do repositório do laboratório e o validador do formato da lista do RH, tudo testado e pronto para publicar assim que a organização do GitHub for definida.

**Architecture:** Três pastas irmãs em `/home/user`, cada uma um repositório Git independente, espelhando o desenho: `r2s-lab-site` (landing estática), `r2s-lab` (template do laboratório; já existe com `docs/`) e `r2s-lab-admin` (privado; validador da lista do RH). Sem build e sem framework: HTML, CSS e JS puros; testes com o runner nativo do Node e Playwright para o navegador.

**Tech Stack:** Node 22 (`node --test`, ESM), Playwright 1.63 (já instalado globalmente: `require('playwright')` funciona), ffmpeg (poster e áudio do vídeo), GitHub Actions para CI.

**Spec:** `docs/superpowers/specs/2026-11-15-r2s-lab-platform-design.md` (aprovado em 2026-11-15). Este plano cobre as linhas "Fase 1" do §8 e o §7.6 (landing). O pre-work, a pesquisa e o painel (Fase 2) terão plano próprio.

## Global Constraints

- **R2S é uma marca, não um código.** Nenhum comando, CLI ou exemplo de shell chamado `r2s`. Nome por extenso nos pontos de contato: `R2S Lab — Reskilling too Skilling`.
- Definição da marca, verbatim: "**R** de *Reskilling*, **2** de *too*, **S** de *Skilling*." O "2" é o laço entre quem faz reskilling e quem faz skilling no mesmo lab.
- **Não usar "Requirement-to-Solution"** em nenhum texto público (landing, README) até a pergunta aberta nº 3 do spec ser respondida.
- Visual do teaser: fundo escuro, laranja único, frases curtas. Tokens fixos: `--bg:#0E1116`, `--card:#151A21`, `--fg:#F2F4F7`, `--muted:#A8B0BC`, `--brand:#FF5800`.
- Acessibilidade: legendas em português no vídeo (narrado); contraste AA (≥ 4.5:1 em texto); sem animação obrigatória (`prefers-reduced-motion`).
- Landing: "Site estático (HTML/CSS/JS, sem framework necessário)", lockup `R2S LAB | Prática de Data & AI` **só no rodapé**.
- Vídeo: mp4 de 90 s, 1920×1080, narrado, 5.580.671 bytes (fonte em `docs/source-assets/R2S_Lab_teaser_90s_narrado_16x9.mp4`).
- Sem dado de cliente. **A lista do RH (dado pessoal) nunca entra em `r2s-lab-site` nem em `r2s-lab`**; vive só em `r2s-lab-admin`, privado.
- A organização do GitHub é desconhecida: nenhuma URL com organização inventada ou placeholder pode aparecer na página.
- Todo texto de interface em pt-BR; código, nomes de arquivo e testes em inglês.
- Commits: uma tarefa, um commit; mensagem no imperativo, em inglês.

## Review Focus

1. **Organização do GitHub ainda indefinida:** a seção "Como começar" nunca mostra `<ORG>` nem URL falsa; mostra aviso de "em breve" e troca para o comando real quando a organização for configurada (Task 8).
2. **CSV do RH exportado do Excel em pt-BR:** delimitador `;`, BOM UTF-8, acentos, CRLF, linhas em branco e e-mails com maiúsculas repetidos (Task 1).
3. **Vídeo não carrega ou JavaScript desligado:** o hero continua legível, com poster, link direto ao mp4 e link à transcrição (Tasks 5 e 9).
4. **Celular de 360 px:** sem rolagem horizontal e com controles do vídeo utilizáveis (Task 9).
5. **Pessoa com movimento reduzido ou que navega só por teclado:** conteúdo visível sem animação, link "Pular para o conteúdo" e foco visível (Task 9).

---

## File Structure

```
/home/user/r2s-lab-site/            landing estática
├─ index.html                       página única
├─ css/styles.css                   tokens e layout
├─ js/config.js                     export const GITHUB_ORG = ""
├─ js/main.js                       copiar comando, revelar ao rolar (melhoria progressiva)
├─ assets/teaser.mp4                cópia do teaser
├─ assets/teaser-poster.jpg         quadro do vídeo
├─ assets/teaser.pt-BR.vtt          legendas
├─ assets/teaser.pt-BR.txt          transcrição corrida
├─ tests/helpers/browser.cjs        servidor estático + Playwright
├─ tests/*.test.mjs                 um arquivo por tarefa
├─ package.json  .gitignore  .github/workflows/ci.yml

/home/user/r2s-lab/                 template do laboratório (já existe docs/)
├─ README.md                        marca + comece aqui
├─ tests/readme.test.mjs  package.json

/home/user/r2s-lab-admin/           privado
├─ src/roster.mjs                   parseRoster
├─ src/validate-roster.mjs          CLI de validação
├─ roster/roster.example.csv        dados sintéticos
├─ roster/README.md                 colunas e regras
├─ tests/roster.test.mjs  package.json
```

---

### Task 1: Validador da lista do RH (`r2s-lab-admin`)

**Files:**
- Create: `/home/user/r2s-lab-admin/package.json` (`"type":"module"`, `"scripts":{"test":"node --test tests/"}`)
- Create: `src/roster.mjs`, `src/validate-roster.mjs`, `roster/roster.example.csv`, `roster/README.md`
- Test: `tests/roster.test.mjs`

**Interfaces:**
- Produces:
  - `parseRoster(text: string): { rows: RosterRow[], errors: RosterError[] }`
  - `RosterRow = { nome: string, email: string, github: string, onda: number, squad: string | null, papelAtual: string, trilha: 'upskilling' | 'reskilling' | null, multiplicador: boolean }`
  - `RosterError = { line: number, field: string, message: string }` (`line` é a linha do arquivo, cabeçalho = 1; `message` em pt-BR)
  - CLI: `node src/validate-roster.mjs <caminho>` → exit 0 imprimindo `N pessoas válidas`; exit 1 listando `linha L, campo F: mensagem`.

**Formato (decisão do plano):** colunas obrigatórias `nome,email,github,onda,papel_atual,multiplicador`; opcionais `squad,trilha`. `papel_atual` ∈ {Data Engineer, BI / Analytics Developer, Data Scientist, Data Architect, ETL / DBA} (comparação sem diferenciar maiúsculas; o valor devolvido é o canônico). `trilha` ∈ {upskilling, reskilling} ou vazio. `multiplicador` ∈ {sim, nao}. `onda` inteiro ≥ 0. `github` casa `/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i`. E-mail e `github` únicos sem diferenciar maiúsculas.

- [ ] **Step 1: Write the failing tests** em `tests/roster.test.mjs`, com estes nomes e asserções:
  - `parses a valid comma file`: 2 linhas válidas → `errors` vazio; `rows[0]` deep-equals `{nome:'Ana Souza', email:'ana@exemplo.com', github:'anasouza', onda:0, squad:null, papelAtual:'Data Engineer', trilha:null, multiplicador:true}`.
  - `accepts semicolon, BOM, CRLF and accents`: texto `'﻿nome;email;github;onda;papel_atual;multiplicador\r\nJoão Conceição;joao@exemplo.com;joaoc;1;data engineer;nao\r\n\r\n'` → 1 linha, `nome === 'João Conceição'`, `papelAtual === 'Data Engineer'`, sem erros (linha em branco ignorada).
  - `flags duplicate email ignoring case`: e-mails `A@x.com` e `a@x.com` → um erro `{line:3, field:'email', message:'e-mail duplicado'}`.
  - `flags duplicate github handle` → erro `{field:'github', message:'usuário do GitHub duplicado'}` na segunda ocorrência.
  - `rejects invalid github handles`: `-joao`, `a_b` e um handle de 40 caracteres → três erros `field:'github'`.
  - `rejects unknown role, bad multiplier and bad wave`: `papel_atual='Analista'`, `multiplicador='talvez'`, `onda='1.5'` → três erros nos campos certos.
  - `reports missing required column once`: cabeçalho sem `email` → exatamente um erro `{line:1, field:'cabecalho'}` e `rows` vazio.
  - `rejects empty input` → um erro `{line:1, field:'cabecalho'}`.
  - `cli exits 0 on the example file and 1 on an invalid file` (via `node:child_process` `spawnSync`): saída do caso válido contém `pessoas válidas`; do inválido contém `linha 3, campo email`.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `cd /home/user/r2s-lab-admin && npm test`
  Expected: FAIL com "Cannot find module '../src/roster.mjs'".

- [ ] **Step 3: Implement `parseRoster` in `src/roster.mjs`**
  Remover BOM, detectar o delimitador pela primeira linha (`;` se houver mais `;` que `,`), dividir em `\r?\n`, aceitar aspas duplas simples em campos. Sem dependências externas.

- [ ] **Step 4: Implement `src/validate-roster.mjs`** que lê o arquivo (UTF-8), chama `parseRoster`, imprime e sai com 0/1 conforme a interface acima.

- [ ] **Step 5: Create `roster/roster.example.csv`** com 6 pessoas **sintéticas** (e-mails `@exemplo.com`) cobrindo os 5 papéis e 1 multiplicador, e `roster/README.md` com as colunas, as regras acima e o aviso "O arquivo real do RH fica **apenas** neste repositório privado e nunca é copiado para `r2s-lab` ou `r2s-lab-site`".

- [ ] **Step 6: Run tests to verify they pass**
  Run: `npm test`
  Expected: PASS (9 testes).

- [ ] **Step 7: Commit**
  ```bash
  git init && git add -A && git commit -m "feat: add roster parser and validator"
  ```

---

### Task 2: README do laboratório (`r2s-lab`)

**Files:**
- Create: `/home/user/r2s-lab/package.json`, `README.md`
- Test: `tests/readme.test.mjs`

**Interfaces:** Produces `README.md` com as seções, em ordem: `# R2S Lab`, `## R · 2 · S`, `## Comece aqui`, `## Estrutura do repositório`, `## Regras do lab`.

- [ ] **Step 1: Write the failing tests** (`readme.test.mjs`, lendo `README.md`):
  - `has the R·2·S narrative`: contém `R de **Reskilling**`, `2 de **too**` e `S de **Skilling**`, e o título `R2S Lab — Reskilling too Skilling`.
  - `has the start instructions`: um bloco ```` ```bash ```` contendo `git clone`, e o texto `VS Code`.
  - `lists the planned structure`: contém as pastas `00-prework/`, `05-encerramento/`, `templates/`, `starter-kits/`, `squad/`, `progress/`.
  - `has no command named r2s`: nenhuma linha casa `/^\s*\$?\s*r2s\s/m`.
  - `avoids the open-question wording`: não contém `Requirement-to-Solution`.
  - `keeps the teaser line`: contém `Menos curso. Mais lab.`

- [ ] **Step 2: Run to verify it fails**
  Run: `cd /home/user/r2s-lab && node --test tests/`
  Expected: FAIL (README ausente).

- [ ] **Step 3: Write `README.md`** em pt-BR. No bloco `git clone`, usar `git clone <endereço do repositório divulgado pela coordenação>` (sem organização inventada). Em "Regras do lab": sem dado de cliente, a pessoa nomeada responde por cada decisão, e o progresso individual é privado.

- [ ] **Step 4: Run to verify it passes**
  Run: `node --test tests/`
  Expected: PASS (6 testes).

- [ ] **Step 5: Commit**
  ```bash
  git init && git add -A && git commit -m "docs: add lab README with R2S narrative"
  ```

---

### Task 3: Esqueleto da landing e harness de testes (`r2s-lab-site`)

**Files:**
- Create: `/home/user/r2s-lab-site/package.json` (`"type":"module"`, script `test`, `"devDependencies":{"playwright":"1.63.0"}`), `index.html`, `css/styles.css`, `js/config.js`, `js/main.js`, `.gitignore` (`node_modules/`, `*.csv`, `roster*`)
- Create: `tests/helpers/browser.cjs`
- Test: `tests/scaffold.test.mjs`

**Interfaces:**
- Produces (`tests/helpers/browser.cjs`):
  - `startServer(root?: string): Promise<{ url: string, close(): Promise<void> }>` (servidor `node:http` estático com tipos corretos para `.mp4`, `.vtt`, `.js`, `.css`)
  - `withPage(opts: { viewport?, javaScriptEnabled?, reducedMotion?: 'reduce'|'no-preference', init?: string }, fn: (page, url) => Promise<void>): Promise<void>` (abre `chromium`, cria contexto, injeta `init` com `addInitScript`, fecha tudo ao fim)
- Produces (`index.html`): `<html lang="pt-BR">`, `<title>R2S Lab — Reskilling too Skilling</title>`, um `<main id="conteudo">`, um único `<h1>R2S Lab</h1>`.

- [ ] **Step 1: Write the failing test** `scaffold.test.mjs`: `page loads with lang, title and a single h1` → `html[lang]==='pt-BR'`, título exato acima, `h1` count 1 com texto `R2S Lab`, `main#conteudo` existe, sem erros de console.
- [ ] **Step 2: Run to verify it fails** — `npm install && node --test tests/` → FAIL (sem `index.html`).
- [ ] **Step 3: Implement** o harness, `index.html` mínimo, os tokens de cor em `css/styles.css` (`:root` com os valores das Global Constraints e `body{background:var(--bg);color:var(--fg)}`), `config.js` com `export const GITHUB_ORG = "";`.
- [ ] **Step 4: Run to verify it passes** — `node --test tests/` → PASS.
- [ ] **Step 5: Commit** — `git init && git add -A && git commit -m "feat: scaffold landing site and browser test harness"`

---

### Task 4: Ativos do vídeo: arquivo, poster, legendas e transcrição

**Files:**
- Create: `assets/teaser.mp4`, `assets/teaser-poster.jpg`, `assets/teaser.pt-BR.vtt`, `assets/teaser.pt-BR.txt`
- Test: `tests/assets.test.mjs`

**Interfaces:** Produces os quatro arquivos em `assets/`, usados pela Task 5.

- [ ] **Step 1: Write the failing tests** (`assets.test.mjs`, funções puras sobre arquivos):
  - `teaser.mp4 is the 5580671-byte source`: `statSync(...).size === 5580671` e o arquivo é idêntico ao da fonte (comparar SHA-256).
  - `poster is a 1920x1080 jpeg under 400 KB` (ler dimensões do cabeçalho JPEG ou por `ffprobe`).
  - `vtt is valid`: começa com `WEBVTT`; ≥ 15 cues; inícios estritamente crescentes; cada `fim > início`; último fim ≤ 91.5 s; cada cue com no máximo 2 linhas de ≤ 42 caracteres.
  - `transcript is non-empty and in Portuguese`: ≥ 300 caracteres e contém `lab`.
- [ ] **Step 2: Run to verify it fails** — `node --test tests/assets.test.mjs` → FAIL (arquivos ausentes).
- [ ] **Step 3: Copy and extract.**
  ```bash
  cp /home/user/r2s-lab/docs/source-assets/R2S_Lab_teaser_90s_narrado_16x9.mp4 assets/teaser.mp4
  ffmpeg -ss 21 -i assets/teaser.mp4 -frames:v 1 -q:v 3 assets/teaser-poster.jpg
  ffmpeg -i assets/teaser.mp4 -vn -ac 1 -ar 16000 /tmp/teaser.wav
  ```
  Conferir o poster visualmente (o quadro de 21 s deve mostrar "Menos curso. Mais lab."; se não, escolher outro quadro limpo).
- [ ] **Step 4: Generate captions and transcript** com uma ferramenta de transcrição disponível (a transcrição do ElevenLabs ou outra) sobre `/tmp/teaser.wav`, em português. Produzir `teaser.pt-BR.vtt` e `teaser.pt-BR.txt`. **A fala do vídeo é texto de marca:** marcar no commit que a revisão humana do texto é obrigatória antes de publicar, e apontá-la no resumo ao Julio.
- [ ] **Step 5: Run to verify it passes** — `node --test tests/assets.test.mjs` → PASS.
- [ ] **Step 6: Commit** — `git add assets tests && git commit -m "feat: add teaser video, poster, captions and transcript"`

---

### Task 5: Hero com o teaser

**Files:**
- Modify: `index.html`, `css/styles.css`
- Test: `tests/hero.test.mjs`

**Interfaces:** Produces `<section id="hero">` contendo o `<h1>`, a linha `Reskilling too Skilling` (classe `.tagline`) e o `<video id="teaser">`.

- [ ] **Step 1: Write the failing tests** (Playwright, `withPage`):
  - `video has controls, poster, captions and no autoplay`: `video#teaser[controls][playsinline][preload="metadata"]`; atributo `poster` termina em `assets/teaser-poster.jpg`; `source[type="video/mp4"][src$="assets/teaser.mp4"]`; `track[kind="captions"][srclang="pt-BR"][default]` com `src` terminando em `assets/teaser.pt-BR.vtt`; **sem** atributo `autoplay`.
  - `video loads metadata and lasts about 91 seconds`: após `loadedmetadata`, `video.duration` entre 91 e 92.
  - `fallback links exist`: dentro de `#hero` há links para `assets/teaser.mp4` e `assets/teaser.pt-BR.txt` (texto "Ler a transcrição").
  - `hero is readable with JavaScript disabled`: com `javaScriptEnabled:false`, `h1`, `.tagline` e o `video` estão visíveis.
- [ ] **Step 2: Run to verify it fails** — `node --test tests/hero.test.mjs` → FAIL.
- [ ] **Step 3: Implement** o hero: kicker `R2S Lab`, `h1` `R2S Lab`, `.tagline` `Reskilling too Skilling`, o vídeo em 16:9 com largura fluida e os dois links de apoio. Sem JavaScript.
- [ ] **Step 4: Run to verify it passes** — `node --test tests/hero.test.mjs` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add hero with accessible teaser video"`

---

### Task 6: Bloco R · 2 · S

**Files:**
- Modify: `index.html`, `css/styles.css`
- Test: `tests/brand.test.mjs`

**Interfaces:** Produces `<section id="marca" aria-labelledby="marca-titulo">` com `h2#marca-titulo` e uma lista `ul.rs` de três `li`, cada um com `.letter` e `.meaning`.

**Texto (proposta de copy, a aprovar pelo Julio):**
- `h2`: `R2S Lab — Reskilling too Skilling`
- R · Reskilling: `Quem muda de papel aprende fazendo, em um caso real.`
- 2 · too: `O mesmo laboratório recebe quem se recicla e quem se aprofunda.`
- S · Skilling: `Quem evolui no papel atual leva o caso até a decisão do negócio.`

- [ ] **Step 1: Write the failing tests:**
  - `shows the three letters in order`: `.letter` textos `['R','2','S']`; `.meaning` com as três frases acima, exatas.
  - `the 2 carries the brand accent`: cor computada do `.letter` do meio igual a `rgb(255, 88, 0)`; as outras duas igual a `rgb(242, 244, 247)`.
  - `group has an accessible name`: `section#marca` com nome acessível `R2S Lab — Reskilling too Skilling` (via `aria-labelledby`).
  - `uses no forbidden wording`: o texto da seção não contém `Requirement-to-Solution`.
- [ ] **Step 2: Run to verify it fails** — `node --test tests/brand.test.mjs` → FAIL.
- [ ] **Step 3: Implement** o bloco (letras grandes, o "2" com `color:var(--brand)` e um filete laranja como ponte).
- [ ] **Step 4: Run to verify it passes** — `node --test tests/brand.test.mjs` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add R2S brand narrative block"`

---

### Task 7: Os oito beats do teaser

**Files:**
- Modify: `index.html`, `css/styles.css`
- Test: `tests/beats.test.mjs`

**Interfaces:** Produces oito `<section class="beat" data-beat="1..8">`, cada uma com um `h2` e um `p.support`; o beat 7 contém `ul.roles` com 5 `li`; o beat 8 contém `ul.decisions` com 3 `li`.

**Texto (decisões do plano; o `h2` é a frase do teaser, verbatim):**

| # | `h2` | `p.support` |
|---|---|---|
| 1 | Menos curso. Mais lab. | Cada squad leva um requisito real do negócio até uma solução pronta para demonstrar, em vez de assistir a aulas. |
| 2 | 7 etapas. 5 gates. 12 semanas. | Intake, Discover, Frame Value, Design, Build, Evaluate e Pitch & Hand off. O avanço depende de evidência, não do calendário. Squads de 5 pessoas, com 6 horas protegidas por semana. |
| 3 | Prove o valor. | Nenhum caso entra sem patrocinador, métrica e baseline. No G1, o valor anual precisa superar 3× o custo anual de execução. |
| 4 | Escolha o mais barato que funciona. | Regra ou SQL antes de ML, ML antes de LLM, uma chamada de LLM antes de um agente. |
| 5 | Meça. | O golden set vem antes do primeiro prompt, e cada solução reporta o custo por transação. |
| 6 | Proteja. | Avaliação de impacto, red-team e uma pessoa nomeada como responsável por cada decisão do algoritmo. |
| 7 | A cada gate, um novo papel. | Os papéis giram a cada gate: |
| 8 | Demo day. O negócio decide. | Dez minutos para pedir uma decisão: |

`ul.roles`: Product Lead · Data Lead · AI Engineer · Eval & Risk Lead · Storyteller. `ul.decisions`: Escalar · Iterar · Encerrar.

- [ ] **Step 1: Write the failing tests:**
  - `renders eight beats in order with the exact headings` (comparar a lista de `h2` de `.beat` com a coluna `h2`).
  - `each beat has a support paragraph` com o texto exato da tabela.
  - `roles and decisions lists` com 5 e 3 itens, nessa ordem.
  - `beats appear after the brand block and before the start section`: posição no DOM.
- [ ] **Step 2: Run to verify it fails** — `node --test tests/beats.test.mjs` → FAIL.
- [ ] **Step 3: Implement** as oito seções em HTML semântico, estilo alinhado ao teaser (frase grande, filete laranja sob o `h2`).
- [ ] **Step 4: Run to verify it passes** — `node --test tests/beats.test.mjs` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add the eight teaser beats"`

---

### Task 8: "Como começar" (organização configurável) e rodapé

**Files:**
- Modify: `index.html`, `js/main.js`, `js/config.js` (sem alterar o valor `""`), `css/styles.css`
- Test: `tests/start.test.mjs`

**Interfaces:**
- Consumes: `GITHUB_ORG` de `js/config.js`; `window.__R2S_ORG__` (se definido, tem precedência; serve aos testes).
- Produces: `<section id="comecar">` com `#clone-status` (aviso) e, quando há organização, `code#clone-cmd` com `git clone https://github.com/<org>/r2s-lab.git` e `button#copy-cmd`. `<footer>` com o lockup `R2S LAB` · `Prática de Data & AI`.

- [ ] **Step 1: Write the failing tests:**
  - `without an organization shows the coming-soon notice`: `#clone-status` contém `Em breve: a coordenação vai divulgar o endereço do repositório.`; **não existe** `#clone-cmd`; o HTML da página não contém `<ORG>` nem `github.com//`.
  - `with an organization renders the real command`: com `init: "window.__R2S_ORG__='org-exemplo'"` → `#clone-cmd` com texto exato `git clone https://github.com/org-exemplo/r2s-lab.git`.
  - `copy button copies the command`: concede a permissão `clipboard-write`, clica `#copy-cmd`, lê a área de transferência e confere o comando; `#copy-msg` mostra `Copiado.`
  - `copy falls back when the clipboard is unavailable`: com `init` que apaga `navigator.clipboard`, o clique mostra `Não consegui copiar automaticamente. Selecione o texto e copie com Ctrl+C (ou Cmd+C).`
  - `footer holds the R2S lockup and no company name`: `footer` contém `R2S LAB` e `Prática de Data & AI`; nenhum nome de empresa aparece na página.
  - `lists the three steps`: `ol.steps` com 3 itens: clonar, abrir no VS Code, abrir o README.
- [ ] **Step 2: Run to verify it fails** — `node --test tests/start.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `renderStart(org: string): void` em `js/main.js` (monta ou remove `#clone-cmd` e o botão conforme `org`), chamado no carregamento do módulo; o HTML estático já traz o aviso "Em breve" para o caso sem JavaScript.
- [ ] **Step 4: Run to verify it passes** — `node --test tests/start.test.mjs` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add start section with configurable GitHub org and footer"`

---

### Task 9: Responsivo, acessibilidade, movimento reduzido e sem JavaScript

**Files:**
- Modify: `index.html` (link "Pular para o conteúdo", `:focus-visible`), `css/styles.css`, `js/main.js` (revelar ao rolar como melhoria progressiva)
- Test: `tests/a11y.test.mjs`

**Interfaces:** Consumes todas as seções das Tasks 5–8. Produces: `a.skip-link` como primeiro elemento focável, apontando para `#conteudo`.

- [ ] **Step 1: Write the failing tests:**
  - `no horizontal scroll at 360, 768 and 1280 px`: `document.documentElement.scrollWidth <= window.innerWidth` em cada largura.
  - `video is usable at 360 px`: largura do `#teaser` ≥ 320 px e altura ≥ 180 px.
  - `contrast meets AA`: função `contrast(fg, bg)` (fórmula WCAG) aplicada às cores computadas de: texto do corpo sobre o fundo; `.support`/`.muted` sobre o fundo; `.letter` laranja sobre o fundo; todos ≥ 4.5.
  - `reduced motion shows everything without animation`: com `reducedMotion:'reduce'`, todo `.beat` tem `opacity` 1 e `animation-name` `none`, e `video` sem `autoplay`.
  - `no JavaScript still shows all beats`: com `javaScriptEnabled:false`, os 8 `h2` dos beats estão visíveis (`opacity` 1).
  - `keyboard: skip link is first and focus is visible`: o primeiro `Tab` foca `a.skip-link`; `Enter` leva o foco ao `#conteudo`; o `outline-width` computado do elemento focado por teclado é > 0 (testar também o `video`).
- [ ] **Step 2: Run to verify it fails** — `node --test tests/a11y.test.mjs` → FAIL.
- [ ] **Step 3: Implement** as correções de layout e foco; o efeito de revelar só liga se `matchMedia('(prefers-reduced-motion: no-preference)')` e JavaScript estiverem ativos (o CSS padrão deixa tudo visível).
- [ ] **Step 4: Run to verify the whole suite passes** — `node --test tests/` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add responsive layout, a11y and reduced-motion support"`

---

### Task 10: Guardas de privacidade, de redação e CI

**Files:**
- Create: `tests/guards.test.mjs`, `.github/workflows/ci.yml`

- [ ] **Step 1: Write the failing tests** (`guards.test.mjs`):
  - `no roster or csv is tracked`: `git ls-files` não lista nenhum arquivo `*.csv` nem nome contendo `roster`.
  - `no forbidden wording in public files`: nenhum arquivo rastreado (`index.html`, `css`, `js`, `assets/*.txt`, `assets/*.vtt`) contém `Requirement-to-Solution`.
  - `no shell command named r2s`: nenhuma linha em `index.html` casa `/^\s*\$?\s*r2s\s/m`.
  - `no invented org`: `index.html` não contém `github.com/` seguido de `<`, de `ORG`, nem de uma organização literal (a única forma permitida é a montada em tempo de execução).
- [ ] **Step 2: Run to verify** — `node --test tests/guards.test.mjs` → deve passar se as tasks anteriores seguiram as restrições; qualquer falha é um defeito a corrigir na task de origem.
- [ ] **Step 3: Write `.github/workflows/ci.yml`:** em `push` e `pull_request`, `actions/checkout`, `actions/setup-node` com Node 22, `npm install`, `npx playwright install --with-deps chromium`, `npm test`.
- [ ] **Step 4: Verify the workflow file parses** — `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"` → sem erro.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "ci: add privacy and wording guards and CI workflow"`

---

## Fora deste plano

- **Publicação:** depende da organização do GitHub e da hospedagem (perguntas abertas nº 1 e nº 2). Quando definidas: criar os três repos privados na organização, definir `GITHUB_ORG` em `js/config.js` e publicar `r2s-lab-site`.
- **Revisão humana** da transcrição e da copy do bloco R·2·S antes de publicar.
- **Fase 2** (pre-work, pesquisa, painel v1): plano próprio, escrito depois da Fase 1.

## Auto-revisão

- **Cobertura do spec:** §8 Fase 1 (landing, README, formato da lista) → Tasks 1, 2 e 3–10. §2 marca → Tasks 2 e 6. §5 restrições (legendas, AA, movimento reduzido, sem dado de cliente) → Tasks 4, 9 e 10. §7.6 itens 1–5 → Tasks 5, 6, 7, 8. §4 antimetas (dado pessoal) → Tasks 1 e 10.
- **Consistência de tipos:** `RosterRow`, `RosterError`, `parseRoster`, `startServer`, `withPage` e `renderStart` têm uma definição única; as tarefas seguintes só os consomem.
- **Proporção:** o plano tem cerca de 2,5 vezes o tamanho do spec, quase todo em listas de testes e assinaturas; não há corpos de função.
