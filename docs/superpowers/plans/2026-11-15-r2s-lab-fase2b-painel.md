# R2S Lab — Fase 2B: painel de controle v1 (cobertura, funil, satisfação e feedbacks) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar à coordenação um painel estático que responde "quantas pessoas foram treinadas, quantas faltam, qual a satisfação e quais os feedbacks", lendo os arquivos `progress/<usuario>.json` dos repositórios dos participantes e a lista do RH.

**Architecture:** Em `r2s-lab-admin` (privado), um coletor lê os arquivos pela API REST do GitHub (ou de uma pasta local, em modo offline), uma função pura agrega as métricas, e um `build` escreve `dist/data.js`/`data.json` mais uma página estática que as exibe. Uma GitHub Action agendada roda o build e guarda o resultado só como artefato privado (nada é publicado).

**Tech Stack:** Node 22 (`node --test`, ESM), `fetch` nativo, Playwright 1.63.0 global (harness copiado do site), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-15-r2s-lab-platform-design.md` (§7.4, §7.5 e §8, Fase 2). **Depende do contrato** `r2s-progress/1` definido no plano 2A (`docs/superpowers/plans/2026-11-15-r2s-lab-fase2a-prework-e-pesquisa.md`, Task 1).

## Definições do painel v1 (rulings do plano, a confirmar)

- **Funil v1 tem 4 estágios, os únicos calculáveis hoje:** Convidados (lista do RH) → Iniciaram (qualquer bloco, quiz ou autoavaliação) → Concluíram o pre-work (480 min) → Responderam a pesquisa.
- **"Treinados" no v1 = pre-work concluído.** Foundation, Practitioner e Lead (spec §7.4) dependem de Lab Zero, diagnóstico e notas do coach, que só existem nas fases 3 e 4. O painel diz isso na tela.
- **"Faltam" = convidados − concluíram o pre-work.** Meta de 100 vem de `config/lab.json`.
- **Privacidade:** o painel mostra o **texto** de todas as respostas abertas à coordenação, mas o **nome** só quando o consentimento é `nome`; `quotable` é verdadeiro para `anon` e `nome`. E-mail e nome da lista do RH **nunca** entram em `data.json`.

## Global Constraints

- Repositório **privado** `r2s-lab-admin`. O painel contém dado pessoal e **nunca** é publicado (nada de GitHub Pages); o build só gera artefato privado.
- Nenhuma requisição de rede feita pela página; nenhum script externo.
- Texto livre dos participantes é sempre exibido como **texto**, nunca como HTML.
- Visual do teaser: fundo escuro, laranja único; tokens `--bg:#0E1116`, `--card:#151A21`, `--fg:#F2F4F7`, `--muted:#A8B0BC`, `--brand:#FF5800`; contraste AA; sem rolagem horizontal a 360 px; `prefers-reduced-motion`.
- R2S é marca, não código; proibido "Requirement-to-Solution".
- Texto de interface em pt-BR; código, arquivos e testes em inglês.
- Um commit por tarefa; `node --test` sem argumento de diretório; sem dependências além do Node e do Playwright global.

## Review Focus

1. **Handle com maiúsculas diferentes** entre lista, nome do repositório e campo `github` do arquivo: casa sem diferenciar maiúsculas; se o campo do arquivo for de outra pessoa, vira erro de qualidade de dados (Tasks 3 e 4).
2. **Falha da API (403, 429, 500, rede) não pode virar "faltam":** só `404` significa "ainda não existe"; o resto vai para os erros (Task 4).
3. **Zero respondentes ou lista vazia:** sem `NaN`/`Infinity`; NPS e médias aparecem como `—` (Tasks 3 e 6).
4. **Texto livre com HTML** (`<img src=x onerror=…>`) aparece como texto, sem executar nada (Task 6).
5. **Vazamento de dado pessoal:** `data.json` sem e-mails; nomes só com consentimento `nome`; sem deploy público (Tasks 3, 5 e 7).

---

## File Structure

```
/home/user/r2s-lab-admin/
├─ config/lab.json               { owner, target, protectedHoursPerWeek, rosterPath }
├─ src/vendor/progress.cjs       cópia do contrato (lib/progress.js do r2s-lab)
├─ src/themes.mjs                themesFor
├─ src/aggregate.mjs             aggregate
├─ src/collect.mjs               collectProgress, githubFetchFile, localFetchFile
├─ src/build.mjs                 build (módulo) + CLI
├─ dashboard/index.html  dashboard/dashboard.css  dashboard/dashboard.js
├─ tests/fixtures/roster.csv     seis pessoas sintéticas
├─ tests/fixtures/progress/*.json
├─ tests/helpers/browser.cjs     harness (copiado do site)
├─ tests/*.test.mjs
├─ .github/workflows/dashboard.yml
```

---

### Task 1: Contrato vendorizado e fixtures sintéticas

**Files:**
- Create: `src/vendor/progress.cjs` (conteúdo de `/home/user/r2s-lab/lib/progress.js` mais um comentário de cabeçalho acrescentado: `// Copiado de r2s-lab/lib/progress.js (r2s-progress/1). Não edite aqui.`), `tests/fixtures/roster.csv`, `tests/fixtures/progress/<handle>.json`
- Test: `tests/contract.test.mjs`

**Interfaces — Consumes:** `SCHEMA_ID`, `PREWORK_BLOCKS`, `TOTAL_MIN`, `validateProgress`, `preworkMinutes`, `npsCategory`, `RATINGS` (plano 2A, Task 1). O contrato é CommonJS e este repo é ESM (`"type": "module"`), por isso a cópia usa a extensão `.cjs` e é importada com `import progress from '../src/vendor/progress.cjs'` (importação default de CommonJS).

**Fixtures** (lista: as 6 pessoas de `roster/roster.example.csv`, com os handles `anasouza`, `brunolima`, `carlamendes` na onda 0 e `diegoalves`, `elisarocha`, `fabionunes` na onda 1; só Ana é multiplicadora):
- `anasouza`: 13 blocos; pesquisa: `nps 10`, todas as notas 5, `hoursPerWeek 6`, `consent 'nome'`, abertas `melhor: "A mentoria com o coach foi o melhor momento."`, `mudar: "Mais tempo protegido para a squad."`, `aplicou: "Usei a regra do mais barato numa proposta."`.
- `brunolima`: 13 blocos; `nps 8`, todas as notas 4, `hoursPerWeek 8`, `consent 'anon'`, `melhor: "Os exercícios com casos reais."`, demais abertas vazias.
- `carlamendes`: 13 blocos; `nps 5`, todas as notas 3 exceto `carga: 2`, `hoursPerWeek 10`, `consent 'nao'`, `mudar: "A carga semanal passou de 6 horas."`, demais vazias.
- `diegoalves`: só os blocos `1.1` e `1.2`; sem pesquisa.
- `elisarocha`: **sem arquivo**.
- `fabionunes`: arquivo com `"schema": "r2s-progress/0"` (inválido).

- [ ] **Step 1: Write the failing tests** (`contract.test.mjs`): `vendored contract is r2s-progress/1`; `fixture files for ana, bruno, carla and diego are valid`; `fixture for fabio is invalid`; `there is no file for elisa`; `full fixtures add up to 480 minutes`.
- [ ] **Step 2: Run to verify it fails** — `cd /home/user/r2s-lab-admin && node --test`.
- [ ] **Step 3: Create** a cópia do contrato, o CSV e os JSON das fixtures exatamente como descrito.
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS (incluindo os 15 testes da lista do RH).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "test: vendor progress contract and add synthetic fixtures"`

---

### Task 2: Temas dos feedbacks

**Files:** Create `src/themes.mjs`; Test `tests/themes.test.mjs`

**Interfaces — Produces:** `THEMES: string[]` = `['carga','mentoria','conteudo','sponsor','ferramentas','demo','outros']`; `themesFor(text: string): string[]` (compara sem acentos e sem diferenciar maiúsculas, por radical; devolve os temas na ordem de `THEMES`; sem nenhuma correspondência → `['outros']`; vazio → `[]`).

Radicais: `carga` = carga, tempo, horas, ritmo, protegid · `mentoria` = mentor, coach · `conteudo` = conteudo, exercicio, modulo, material, aula, regra, caso · `sponsor` = sponsor, patrocinador · `ferramentas` = ferramenta, ambiente, sandbox, acesso, azure · `demo` = demo, pitch, painel.

- [ ] **Step 1: Write the failing tests:** `matches without accents or case` (`"A MENTORIA com o Coach"` → `['mentoria']`); `finds several themes in the order of THEMES` (`"Mais tempo para os exercícios"` → `['carga','conteudo']`); `falls back to outros` (`"Gostei muito"` → `['outros']`); `empty text has no theme` (`""` e `"   "` → `[]`); `the fixture texts map as expected` (as cinco frases das fixtures → `mentoria`; `carga`; `conteudo`; `conteudo`; `carga`).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement `themesFor`** (normalizar com `normalize('NFD')` removendo marcas diacríticas).
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add feedback theme tagging"`

---

### Task 3: Agregação das métricas

**Files:** Create `src/aggregate.mjs`; Test `tests/aggregate.test.mjs`

**Interfaces — Consumes:** `RosterRow` (lista do RH, `src/roster.mjs`), `Progress` (contrato), `themesFor` (Task 2).
**Interfaces — Produces:**
- `aggregate(input: { roster: RosterRow[], progressByHandle: Record<string, Progress>, missing: string[], errors: Array<{github: string, message: string}>, target: number, protectedHoursPerWeek: number, now: Date }): Metrics`
- `type Metrics = { generatedAt: string, target: number, totals: { invited: number, started: number, preworkDone: number, surveyDone: number, missing: number }, funnel: Array<{ key: 'invited'|'started'|'preworkDone'|'surveyDone', label: string, count: number }>, byWave: Array<{ onda: number, invited: number, started: number, preworkDone: number }>, multipliers: { invited: number, started: number, preworkDone: number }, satisfaction: { respondents: number, nps: number | null, promoters: number, passives: number, detractors: number, ratings: Record<string, number | null>, hoursPerWeek: { average: number | null, protected: number } }, feedback: Array<{ id: string, topic: 'melhor'|'mudar'|'aplicou', text: string, themes: string[], consent: string, author: string | null, quotable: boolean }>, dataQuality: { missingFiles: string[], errors: Array<{ github: string, message: string }> } }`
- Rótulos do funil: `Convidados`, `Iniciaram`, `Concluíram o pre-work`, `Responderam a pesquisa`. Chaves de `handle` em minúsculas. `ratings` com média de 1 casa decimal; `nps = round((promoters − detractors) / respondents × 100)`; `missing = invited − preworkDone`; `feedback.id` = `<github>:<topic>`; `author` = nome da lista **só** se `consent === 'nome'`; `quotable` = `consent` em `anon` ou `nome`; respostas abertas vazias não entram. Nenhum e-mail e nenhum nome (exceto o `author` acima) na saída.

- [ ] **Step 1: Write the failing tests** (com as fixtures da Task 1, carregadas e passadas à função; `now` fixo `2026-12-03T12:00:00Z`): `totals for the fixtures` (`invited 6, started 4, preworkDone 3, surveyDone 3, missing 3`); `funnel has four stages in order` (contagens `6,4,3,3` e os rótulos acima); `by wave` (onda 0: `3,3,3`; onda 1: `3,1,0`); `multipliers` (`1,1,1`); `nps and categories` (`promoters 1, passives 1, detractors 1, nps 0`); `rating averages` (`conteudo 4`, `carga 3.7`); `hours average and protected` (`8` e `6`); `feedback privacy` (5 entradas; a de Ana com `author 'Ana Souza'` e `quotable true`; a de Bruno com `author null` e `quotable true`; a de Carla com `author null` e `quotable false`); `feedback carries themes` (a frase da Carla → `['carga']`); `data quality lists missing files and errors` (`['elisarocha']` e o erro passado); `output has no emails` (`JSON.stringify` não contém `@exemplo.com` nem `Bruno Lima`); `empty input is safe` (roster vazio e nada coletado → todos os totais 0, `nps null`, cada média `null`, sem `NaN` na saída serializada); `no respondents gives null averages` (roster com 2 pessoas e sem pesquisas); `handles match ignoring case` (arquivo de `AnaSouza` casa com `anasouza` da lista).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement `aggregate`** com a regra "iniciou" = pelo menos um bloco, um quiz respondido (`answered > 0`) ou autoavaliação não nula; "concluiu" = `preworkMinutes(p) === TOTAL_MIN`.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: aggregate dashboard metrics"`

---

### Task 4: Coletor (GitHub REST e pasta local)

**Files:** Create `src/collect.mjs`; Test `tests/collect.test.mjs`

**Interfaces — Produces:**
- `type FetchFile = (owner: string, repo: string, path: string) => Promise<{ status: number, text?: string }>`
- `collectProgress(roster: RosterRow[], opts: { owner: string, fetchFile: FetchFile, concurrency?: number }): Promise<{ byHandle: Record<string, Progress>, missing: string[], errors: Array<{ github: string, message: string }> }>` — para cada pessoa busca `FetchFile(owner, 'r2s-lab-' + github, 'progress/' + github + '.json')`.
- `githubFetchFile(token: string): FetchFile` — `GET https://api.github.com/repos/{owner}/{repo}/contents/{path}` com `Authorization: Bearer <token>`, `Accept: application/vnd.github.raw+json`, `User-Agent: r2s-lab-dashboard`; devolve `{ status, text }`.
- `localFetchFile(dir: string): FetchFile` — lê `dir/<path>`; `404` se não existir (ignora `owner` e `repo`).

Regras: `404` → `missing`; `200` com JSON inválido → erro `JSON inválido`; falha de `validateProgress` → erro com as mensagens; `progress.github` diferente do `github` da lista (sem diferenciar maiúsculas) → erro `o arquivo é de outro usuário`; **qualquer outro status ou exceção → erro `falha ao ler (status N)` / `falha ao ler (<mensagem>)`, nunca `missing`**; `concurrency` padrão 5; `owner` vazio → lança `Error('owner não configurado')`.

- [ ] **Step 1: Write the failing tests** (com `FetchFile` falso): `reads each person's file from r2s-lab-<handle>` (verifica `owner`, `repo` e `path` pedidos); `404 means missing`; `403, 429 and 500 are errors, not missing`; `a thrown error is reported per person and does not stop the others`; `invalid json and invalid schema are errors`; `file of another user is an error`; `matching ignores case` (roster `AnaSouza`, arquivo `anasouza`); `respects the concurrency limit` (no máximo 2 chamadas simultâneas com `concurrency: 2`); `empty owner throws`; `localFetchFile reads the fixture folder` (as fixtures de `tests/fixtures/` dão o mesmo resultado esperado: 4 válidos, `elisarocha` ausente, `fabionunes` com erro); `githubFetchFile sends the headers` (com `globalThis.fetch` substituído: URL, `Authorization`, `Accept` e `User-Agent` corretos; o token **não** aparece na URL).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** o coletor com um pool de concorrência simples.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add progress collector for GitHub and local folders"`

---

### Task 5: Build e CLI

**Files:** Create `config/lab.json`, `src/build.mjs`; Test `tests/build.test.mjs`

**Interfaces:**
- Consumes: `parseRoster`/`decodeRoster` (lista do RH), `collectProgress`, `githubFetchFile`, `localFetchFile`, `aggregate`.
- Produces: `build(opts: { rosterPath: string, outDir: string, config: { owner: string, target: number, protectedHoursPerWeek: number }, fetchFile: FetchFile, now?: Date }): Promise<Metrics>` — escreve `outDir/data.json` (JSON) e `outDir/data.js` (`window.R2S_DATA = <json>;`) e copia `dashboard/*` para `outDir`.
- CLI: `node src/build.mjs [--roster <csv>] [--fixtures <pasta>] [--out <pasta>]`. Padrão: `--roster` = `rosterPath` do `config/lab.json`, `--out` = `dist`. Com `--fixtures <pasta>` usa `localFetchFile(<pasta>)` e **não** precisa de `owner` nem de token. Sem `--fixtures`: exige `owner` no config e `LAB_READ_TOKEN` no ambiente; se faltar algo, imprime a causa em pt-BR e sai com código 1. Erros na lista do RH → imprime `linha L, campo F: mensagem` e sai com 1.
- `config/lab.json` inicial: `{ "owner": "", "target": 100, "protectedHoursPerWeek": 6, "rosterPath": "roster/roster.csv" }`.

- [ ] **Step 1: Write the failing tests:** `build with fixtures writes data.json and data.js` (usar `tests/fixtures/roster.csv` e `tests/fixtures/`; `totals` = `6,4,3,3,3`; `data.js` começa com `window.R2S_DATA = ` e o JSON dentro dele é igual a `data.json`); `data.json has no emails`; `build copies the dashboard files`; `cli with fixtures exits 0` (via `spawnSync`); `cli without owner exits 1 and says why` (`owner não configurado`); `cli without token exits 1` (`LAB_READ_TOKEN`); `cli with an invalid roster exits 1 and lists the lines`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** `build` e a CLI.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add dashboard build and CLI"`

---

### Task 6: Página do painel

**Files:** Create `dashboard/index.html`, `dashboard/dashboard.css`, `dashboard/dashboard.js`, `tests/helpers/browser.cjs` (copiar do site; a raiz do servidor passa a ser um diretório recebido por parâmetro); Test `tests/dashboard.test.mjs`

**Interfaces — Consumes:** `window.R2S_DATA` (um `Metrics`). **Produces (DOM):** `#generated`, KPIs `#kpi-invited`, `#kpi-started`, `#kpi-done`, `#kpi-missing`, `#kpi-target`; funil `#funnel li` (4); `#nps`, `#ratings li` (8), `#hours`; `#feedback li`, filtros `button[data-theme]` (um por tema de `THEMES` mais `Todos`); `#quality`; `#scope-note`; `#error`.
**Texto fixo:** `#scope-note` = `Neste painel, "treinados" significa pre-work concluído. Foundation, Practitioner e Lead ainda não são medidos: chegam nas fases 3 e 4.` `#error` = `Não encontrei os dados do painel. Rode o build e abra o index.html gerado em dist/.`

- [ ] **Step 1: Write the failing tests** (a cada teste: `build()` com as fixtures num diretório temporário e `withPage` abrindo o `index.html` gerado): `shows the four numbers` (`6`, `4`, `3` e faltam `3`; meta `100`); `funnel rows show label and count` (`Convidados 6`, `Iniciaram 4`, `Concluíram o pre-work 3`, `Responderam a pesquisa 3`); `satisfaction block` (NPS `0`, nota de `Conteúdo e exercícios` `4,0`, de `Carga e ritmo semanal` `3,7`, horas `8,0 h por semana (protegidas: 6 h)`); `feedback shows text for everyone and names only with consent` (a frase da Ana com `Ana Souza`; as de Bruno e Carla sem nome e sem `Bruno Lima`/`Carla Mendes` em nenhum lugar da página); `the theme filter narrows the list` (clicar `carga` → só as frases de `carga`; clicar `Todos` → volta a 5); `data quality lists the missing and invalid handles` (`elisarocha` e `fabionunes`); `scope note is shown verbatim`; `html in free text is shown as text` (fixture extra com `<img src=x onerror="window.__pwned=1">` num feedback: `window.__pwned` fica `undefined` e o texto aparece literal); `empty data renders dashes, not NaN` (dados do `aggregate` vazio: NPS `—`, sem `NaN` nem `Infinity` na página); `missing data shows the error` (página sem `data.js`: `#error` visível com o texto acima); `no external requests`; `no horizontal scroll at 360 px`; `contrast meets AA` (corpo, `.muted`, laranja sobre o fundo); `reduced motion has no transitions`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** a página (script clássico; tudo via `textContent`; tema escuro; funil e notas como barras em CSS, sem biblioteca de gráficos; números em pt-BR com `Intl.NumberFormat`).
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add dashboard page"`

---

### Task 7: Workflow privado e guardas de privacidade

**Files:** Create `.github/workflows/dashboard.yml`, `tests/guards.test.mjs`; Modify `.gitignore` (acrescentar `dist/`)

- [ ] **Step 1: Write the failing tests** (`guards.test.mjs`): `workflow is private and read-only` (interpretar o YAML com `python3 -c` via `spawnSync` ou comparar o texto: `permissions` com só `contents: read`; sem nenhum passo `deploy-pages`, `gh-pages` ou `upload-pages-artifact`); `workflow reads the token from secrets` (`${{ secrets.LAB_READ_TOKEN }}`); `workflow keeps the artifact for 7 days` (`retention-days: 7`); `workflow runs on a schedule and on demand` (`schedule` e `workflow_dispatch`); `dist is ignored`; `only synthetic data is committed` (`roster/` só tem `roster.example.csv` e `README.md`; nenhum e-mail que não termine em `@exemplo.com` nos arquivos rastreados); `no forbidden wording` (nenhum `Requirement-to-Solution` em arquivos rastreados, exceto a pasta `docs/`).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Write the workflow:** `on: schedule (cron '0 11 * * 1-5')` e `workflow_dispatch`; `permissions: contents: read`; passos: `actions/checkout@v4`, `actions/setup-node@v4` (Node 22), `node src/build.mjs --out dist` com `env: LAB_READ_TOKEN: ${{ secrets.LAB_READ_TOKEN }}`, `actions/upload-artifact@v4` (`name: dashboard`, `path: dist`, `retention-days: 7`). Verificar que o YAML interpreta: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/dashboard.yml'))"`.
- [ ] **Step 4: Run to verify the whole suite passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "ci: add private dashboard workflow and privacy guards"`

---

## Fora deste plano

Publicação do painel (hospedagem com acesso restrito: pergunta aberta nº 2); GitHub App em vez de token pessoal (`LAB_READ_TOKEN` é um token de leitura de conteúdo dos repositórios `r2s-lab-*`); métricas das fases 3 e 4 (gates, % do dossiê, Foundation/Practitioner/Lead, presença, gasto de sandbox).

## Auto-revisão

- **Cobertura do spec:** §7.4 funil, satisfação, feedbacks e sugestões (o tema `mudar`) → Tasks 2, 3 e 6; §7.5 painel estático por Action agendada e acesso restrito → Tasks 5 e 7; §4 antimetas (dado pessoal) → Tasks 3 e 7; §8 Fase 2 (painel v1) → todas.
- **Consistência de tipos:** `Metrics`, `aggregate`, `FetchFile`, `collectProgress`, `build` e `themesFor` têm uma definição única; `RosterRow` e `Progress` vêm de código já existente ou do plano 2A.
- **Proporção:** cerca de uma vez e meia o spec; só testes e assinaturas, sem corpos de função.
