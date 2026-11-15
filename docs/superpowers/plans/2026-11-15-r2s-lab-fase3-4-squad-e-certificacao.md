# R2S Lab — Fases 3 e 4: jornada da squad, avaliação, certificação e scorecard — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar a plataforma para teste de ponta a ponta: a squad preenche o dossiê e os gates no VS Code, o coach registra a avaliação, e o painel mostra squads, certificação por nível e o scorecard do programa; mais a página do certificado e um demo local.

**Architecture:** Contratos novos em JSON (`r2s-squad/1`, `r2s-assessment/1`) em bibliotecas UMD no repo `r2s-lab` (a mesma técnica da fase 2). Um verificador em Node confere o `gates.json` contra os documentos. O repo `r2s-lab-admin` copia os contratos, coleta os repositórios das squads, agrega squads, certificação e scorecard, e o painel ganha três seções.

**Tech Stack:** HTML/CSS/JS puros; Node 22 (`node --test`); Playwright 1.63.0 global; sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-11-15-r2s-lab-fase3-4-design.md` (contratos, regras e decisões) e o spec da plataforma (§7, §8). Os repos estão nas branches `fase-3-4`: `/home/user/r2s-lab` (parte A) e `/home/user/r2s-lab-admin` (parte B).

## Global Constraints

- R2S é marca, não código: nenhum comando chamado `r2s`. Proibido "Requirement-to-Solution" em texto público.
- Tema escuro do teaser, laranja único; tokens `--bg:#0E1116 --card:#151A21 --fg:#F2F4F7 --muted:#A8B0BC --brand:#FF5800 --field:#667084`; contraste AA; foco visível; sem animação obrigatória; sem rolagem horizontal a 360 px. O **certificado** é sempre em papel claro.
- Sem requisição de rede nas páginas; scripts clássicos (sem módulos ES); `localStorage` sempre em `try/catch`.
- Contratos: `schema` `r2s-squad/1` e `r2s-assessment/1`; marcador de campo pendente `[preencher]`; `[opcional]` não conta.
- Painel: nenhum e-mail nos dados; texto de participante só por `textContent`; certificação por usuário do GitHub, sem nome.
- Um commit por tarefa; a suite inteira (`node --test`, sem argumento de diretório) precisa sair com código 0 antes de cada commit.

## Review Focus

1. **Gate aprovado sem evidência:** um `gates.json` com gate `passed` mas dossiê pendente, golden set pequeno ou ordem trocada precisa falhar no verificador, com mensagem em pt-BR (A1, A3).
2. **Valores no limite:** valor anual exatamente 3× o custo de run não passa; prova de conhecimento 70% passa; nota final 3,0 passa e 2,99 não (A1, A4).
3. **Dados ausentes ou incompletos no painel:** squad sem repositório, sem `assessment.json`, com documento faltando ou com membros fora da lista do RH; nada de `NaN`; métrica sem dado vira "não medido" (B2, B3, B5).
4. **Texto da squad com HTML ou muito longo** no painel aparece como texto e não quebra o layout (B5).
5. **Dados pessoais:** certificação sem nomes e sem e-mails em `data.json`; a página do certificado não envia nada a ninguém (A5, B3).

---

## Parte A — repositório `r2s-lab` (template)

### Task A1: Contrato da squad (`lib/squad.js`)

**Files:** Create `lib/squad.js`; Test `tests/squad.test.mjs`

**Interfaces — Produces** (UMD; `window.R2SSquad`):
- `SCHEMA_ID: 'r2s-squad/1'`; `GATES: ['G0','G1','G2','G3','G4']`; `ROLES: ['product-lead','data-lead','ai-engineer','eval-risk-lead','storyteller']`; `STATUSES: ['pending','in_review','passed','killed']`; `DECISIONS: ['escalar','iterar','encerrar']`; `DOCS: ['A','B','C','D','E']`; `DOC_FILES: {A:'A-case-brief.md', B:'B-adr.md', C:'C-pitch.md', D:'D-sis.md', E:'E-hearing.md'}`; `PENDING: '[preencher]'`; `TEMPLATE_FIELDS: {A:14, B:9, C:6, D:9, E:11}`.
- `emptySquad(): Squad` (cinco gates `pending`, `attempts 0`, `approvedBy/approvedAt null`, `members []`, `roles {}`, `assets []`, `squad/case/sponsor/coach ''`; G1 com `annualValue/annualRunCost null`; G3 com `costPerTransaction null`; G4 com `decision null`).
- `validateSquad(s: unknown): {ok: boolean, errors: string[]}` (pt-BR; regras da seção 4 do desenho).
- `countPending(text: string): number`; `section(text: string, key: 'g2'|'g3'|'d90'): string`; `optionsFilled(adr: string): number`.
- `dossierStatus(texts: Partial<Record<'A'|'B'|'C'|'D'|'E', string>>): {byDoc: Record<string, {pending: number, total: number, percent: number}>, pending: number, total: number, percent: number}` (texto ausente = tudo pendente; `pending` limitado ao `total`; percentuais arredondados).
- `currentGate(s: Squad): {gate: string | null, killed: boolean, done: boolean}` (primeiro gate não `passed`; todos passados → `{gate:null, killed:false, done:true}`).
- `squadChecks(s: Squad, files: {docs: Partial<Record<'A'|'B'|'C'|'D'|'E', string>>, goldenRows: number}): string[]` (erros dos gates `passed` contra os documentos: G0 e G1 → A sem pendências; G2 → B sem pendências, `optionsFilled(B) >= 2` e a seção `g2` de D completa; G3 → `goldenRows >= 50` e a seção `g3` de D completa; G4 → C sem pendências; seção ausente conta como incompleta; mensagens como `G2 aprovado, mas o ADR (B) ainda tem 3 campos pendentes.`).

- [ ] **Step 1: Write the failing tests.** Constantes (`TEMPLATE_FIELDS`, 5 papéis). `emptySquad validates`. Rejeições, uma por teste: schema errado; papel desconhecido; papel repetido; 6 membros; gate ausente; `passed` sem `approvedBy`; `passed` com `approvedAt` inválido; G2 `passed` com G1 `pending` (ordem); `killed` no G3; gate após um `killed` que não esteja `pending`; G1 `passed` com valor 120000 e run 40000 (**igual a 3×: erro**) e aceito com 120001; G2 `passed` por quem não é o coach (com `coach` preenchido); G1 `passed` sem os 5 papéis em `roles.G1`; G4 `passed` sem `decision`; G4 `passed` sem ativos. Um squad completo (todos `passed`, papéis, valor 360000/60000, coach aprovando G2 e G3, decisão `escalar`, 1 ativo) valida. `countPending` conta `[preencher]` e ignora `[opcional]`. `dossierStatus`: nenhum texto → 0% e pendências iguais aos totais; texto A com 7 marcadores → `{pending: 7, total: 14, percent: 50}`; mais marcadores que o total ficam limitados. `currentGate` nos quatro casos. `squadChecks` uma asserção por regra, com textos mínimos; `goldenRows` 49 falha e 50 passa. `optionsFilled` com duas opções preenchidas e uma `[opcional]` → 2. `section` encontra G2, G3 e 90 dias.
- [ ] **Step 2: Run to verify it fails** — `cd /home/user/r2s-lab && node --test`.
- [ ] **Step 3: Implement** a biblioteca com as assinaturas acima (data `AAAA-MM-DD` validada com `Date.parse` e regex).
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add squad contract"`

### Task A2: Templates da squad (A–E, gates, golden set)

**Files:** Create `squad/gates.json`, `squad/A-case-brief.md`, `squad/B-adr.md`, `squad/C-pitch.md`, `squad/D-sis.md`, `squad/E-hearing.md`, `squad/golden-set.csv`, `squad/README.md`; Test `tests/squad-templates.test.mjs`

**Conteúdo (texto em pt-BR, derivado dos templates A–E da metodologia):** cada campo a preencher termina em `[preencher]`. **A** (14 campos): caso, patrocinador, data, requisito, métrica, baseline, meta, tipo de valor, valor anual, fontes, acesso em 5 dias, dados sensíveis, restrições, assinatura. **B** (9): título, status, contexto, opção 1, opção 2, decisão, custo por transação, limiar de qualidade do G3, riscos de IA responsável; a opção 3 usa `[opcional]`. **C** (6): os seis blocos do roteiro de 10 minutos; mais a tabela do placar do painel (não conta como pendente). **D** (9): três seções `## Revisão no G2 (design)`, `## Revisão no G3 (pré-lançamento)` e `## Revisão de 90 dias (pós-lançamento)`, três campos cada (responsável nomeado, partes afetadas, plano de explicabilidade; taxas de erro por subgrupo, checagem de amostra, pior caso; canal de recurso, monitoramento, plano de desativação). **E** (11): cinco assentos (patrocinador, usuário final, parte afetada, compliance e risco, operações de TI) com "Principal preocupação" e "Resposta da squad", mais "Preocupações que seguem em aberto". `golden-set.csv` só com o cabeçalho `id,entrada,saida_esperada,observacao`.

- [ ] **Step 1: Write the failing tests:** `each template has the planned number of pending fields` (`countPending` de cada arquivo igual a `TEMPLATE_FIELDS`); `the ADR marks option 3 as optional`; `the SIS has the three review sections` (`section()` não vazia para `g2`, `g3`, `d90`); `gates.json is a valid pristine squad` (`validateSquad` ok); `the pristine dossier is 0% filled`; `golden-set.csv has only the header`; `squad/README explains the workflow` (cita `tools/check-squad.mjs`, `[preencher]`, `gates.json` e PR do coach); sem "Requirement-to-Solution".
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Write the files** exatamente como descrito.
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add squad dossier templates"`

### Task A3: Verificador da squad e workflow

**Files:** Create `tools/check-squad.mjs`, `.github/workflows/squad-check.yml`; Test `tests/check-squad.test.mjs`

**Interfaces — Produces:** `runCheck(dir: string): {errors: string[], lines: string[]}` e a CLI `node tools/check-squad.mjs [pasta]` (padrão `squad`): lê `gates.json` (ausente → erro `squad/gates.json não encontrado`; JSON inválido → erro), roda `validateSquad`, lê os documentos A–E e `golden-set.csv` (linhas não vazias menos o cabeçalho), roda `squadChecks`, imprime uma linha por documento (`A case brief: 100% (0 pendentes)`), a linha do gate atual e os erros; sai com 1 se houver erros (pendências **não** são erro).

- [ ] **Step 1: Write the failing tests:** modelo intocado → código 0, saída cita `G0` e `0%`; modelo preenchido (marcadores trocados por `ok`, `gates.json` completo, golden set com 50 linhas) → código 0; G2 `passed` com o ADR pendente → código 1 e a mensagem `G2 aprovado, mas o ADR (B)`; G3 `passed` com 49 casos → 1; `gates.json` ausente → 1; JSON inválido → 1; o workflow roda em `pull_request` e `push`, executa `node tools/check-squad.mjs`, tem `permissions: contents: read` (interpretar o YAML com `python3 -c`).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** a CLI (`runCheck` exportado; a parte de execução só quando o arquivo é chamado direto) e o workflow.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add squad check tool and workflow"`

### Task A4: Avaliação (`lib/assessment.js`)

**Files:** Create `lib/assessment.js`, `squad/assessment.json`; Modify `tools/check-squad.mjs`; Test `tests/assessment.test.mjs`

**Interfaces — Produces** (UMD; `window.R2SAssessment`):
- `SCHEMA_ID: 'r2s-assessment/1'`; `RUBRIC: [{key:'framing',weight:25},{key:'design',weight:20},{key:'engineering',weight:20},{key:'evaluation',weight:15},{key:'cost',weight:10},{key:'communication',weight:10}]`; `COMPETENCIES` (as 8 chaves do contrato de progresso).
- `emptyAssessment(): Assessment` (`squadRubric` todas `null`; `sandbox {capUsd: 300, spentUsd: null}`; `members {}`).
- `validateAssessment(a: unknown): {ok, errors[]}` (notas 1–4 inteiras ou `null`; percentuais 0–100; `competencies.diagnostic/final` nulos ou objetos com as 8 chaves de 1 a 4; `sandbox` ≥ 0; chaves desconhecidas rejeitadas).
- `squadScore(r): number | null` (média ponderada; `null` se faltar uma dimensão); `individualScore(m): number | null` (`0,5×coach + 0,25×pares + 0,25×(1 + 3×pct/100)`; `null` se faltar algum); `finalScore(squad: number|null, indiv: number|null): number | null` (`0,6×squad + 0,4×indiv`); `levelFor(m, r): 'none'|'foundation'|'practitioner'|'lead'`; `competencyGain(m): number | null`.
- Regras de `levelFor`: Foundation = `labZeroCompleted` e `knowledgeCheckPct >= 70`; Practitioner = nota final `>= 3,0` e nenhuma dimensão `< 2`; Lead = Practitioner mais `coachedNextCohort` e `assetReused`; vale o nível mais alto atingido.

- [ ] **Step 1: Write the failing tests:** `squadScore` com tudo 3 → 3; com 4,3,3,2,4,3 → 3,2; faltando uma dimensão → `null`. `individualScore` (coach 4, pares 3, prova 80%) → 3,6. `finalScore(3.2, 3.6)` → 3,36; `null` se um lado faltar. `levelFor`: prova 70 → `foundation` e 69 → `none` (com Lab Zero); final 3,0 → `practitioner` e 2,99 → não; uma dimensão = 1 impede Practitioner mesmo com nota alta; Lead só com os dois marcadores; Practitioner sem Lab Zero continua Practitioner. `competencyGain` (2→3 em tudo) → 1; `null` com falta. `validateAssessment` rejeita nota 5, pct 120, dimensão desconhecida, competência 5, gasto negativo; o modelo `squad/assessment.json` valida. `check-squad` valida `assessment.json` quando existe (nota inválida → código 1) e imprime a nota da squad e o nível de cada membro quando há dados.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** a biblioteca, o modelo e a integração no verificador.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add assessment contract and scoring"`

### Task A5: Página do certificado

**Files:** Create `05-encerramento/certificado.html`, `js/certificado.js`; Modify `css/lab.css` (estilos do papel e `@media print`); Test `tests/certificado.test.mjs`

**Interfaces — Produces (DOM):** campos `#c_nome`, `#c_turma`, `#c_data` (`type=date`), `#c_horas`, `#c_nivel` (`<select>` vazio, Foundation, Practitioner, Lead), `#c_texto`, `#c_comp`, `#c_s1`, `#c_r1`, `#c_s2`, `#c_r2`; prévia `#cert` com `#cv_nome`, `#cv_texto`, `#cv_nivel`, `#cv_comp`, `#cv_s1`, `#cv_r1`, `#cv_s2`, `#cv_r2`, `#cv_data`; botão `#printBtn`; aviso `#regra`. Textos padrão do artifact: `c_texto` = `concluiu o R2S Lab, laboratório de IA aplicada a negócio, entregando um caso real com métrica, baseline, avaliação, custo por transação e uma recomendação de decisão ao painel executivo.`; `c_comp` = `Problem framing · Value case · Seleção de técnica · Avaliação · Responsible AI e FinOps`; `c_r1` = `Coordenação do R2S Lab`.

- [ ] **Step 1: Write the failing tests:** a prévia mostra o nome digitado (e `Nome do colaborador` quando vazio); o texto leva `Turma X.` e `Carga horária: 72 horas.` quando preenchidos; a data `2026-12-03` vira `3 de dezembro de 2026`; o nível escolhido aparece como `Nível: Practitioner` e some quando vazio; os padrões estão preenchidos; assinatura sem nome e sem cargo fica oculta; `#printBtn` chama `window.print` (substituído no teste); o rascunho persiste no recarregamento (`R2SDrafts('r2s-cert-draft-v1')`) e **nada vai para o store exportável**; o CSS contém `@page` com `A4 landscape` e esconde o que não é o certificado ao imprimir (`.noprint`); `#regra` diz `Emita só para quem cumpriu os critérios`; nenhuma requisição externa; contraste AA e foco visível na interface (o papel é sempre claro); sem rolagem horizontal a 360 px na interface.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** a página (portar a estrutura e o estilo do certificado do artifact de encerramento, no tema escuro fora do papel).
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add certificate page"`

### Task A6: README, guardas e docs

**Files:** Modify `README.md`, `tests/readme.test.mjs`, `tests/guards.test.mjs`

- [ ] **Step 1: Write the failing tests:** o README cita `squad/`, `tools/check-squad.mjs`, `[preencher]`, `05-encerramento/certificado.html` e o fluxo do coach (`gates.json` por PR); o README não promete mais "certificado, prova social e fotos chegam depois"; guarda: `squad/` só tem os arquivos do modelo (nenhum `gates.json` preenchido por engano: `squad` vazio, todos os gates `pending`); guarda: o certificado não cita `localStorage` do store exportável; sem "Requirement-to-Solution" em `squad/`, `tools/`, `lib/` e na página do certificado.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Update** o README (estrutura, squad, verificador, certificado) e as guardas.
- [ ] **Step 4: Run to verify the whole suite passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "docs: document squad flow and certificate"`

---

## Parte B — repositório `r2s-lab-admin` (painel)

### Task B1: Contratos copiados e squad de teste

**Files:** Create `src/vendor/squad.cjs`, `src/vendor/assessment.cjs`, `tests/fixtures/squads/multiplicadores/squad/*`; Test `tests/squad-fixtures.test.mjs`

**Fixture (squad `multiplicadores`, membros `anasouza` product-lead, `brunolima` data-lead, `carlamendes` ai-engineer; coach `coach-exemplo`):** G0 `passed` (tentativas 1), G1 `passed` (tentativas 2, valor 360000, run 60000), G2 `passed` (tentativas 1, aprovado pelo coach), G3 `in_review` (1), G4 `pending`; documentos: A e E completos, B completo com 3 opções, C com 3 campos pendentes, D com a revisão G2 completa e G3 e 90 dias pendentes; `golden-set.csv` com 60 casos; um ativo listado; `assessment.json`: dimensões `framing 3, design 3, engineering 3, evaluation 2, cost 3, communication 3` (nota da squad 2,85), `sandbox {capUsd 300, spentUsd 120}`; membros com `labZeroCompleted true`, `anasouza` (prova 90, coach 4, pares 4, presença 95), `brunolima` (70, 3, 3, 90), `carlamendes` (60, 2, 3, 80); competências inicial 2 e final 3 em tudo; `coachedNextCohort` e `assetReused` falsos. Níveis esperados: Ana `practitioner` (nota final 3,28), Bruno `foundation` (2,92), Carla `none` (2,69). Os arquivos são gerados por um script a partir dos templates do `r2s-lab`.

- [ ] **Step 1: Write the failing tests:** os contratos copiados têm `SCHEMA_ID` `r2s-squad/1` e `r2s-assessment/1` e são iguais aos de `../r2s-lab/lib/` (quando a pasta existe); `validateSquad` e `validateAssessment` aceitam a fixture; `squadChecks` da fixture sem erros; `dossierStatus` da fixture: A, B e E 100%, C 50% (3 de 6 pendentes), D 67% (3 de 9 pendentes... pendentes só os dois blocos), total coerente; níveis e notas esperados acima.
- [ ] **Step 2: Run to verify it fails** — `cd /home/user/r2s-lab-admin && node --test`.
- [ ] **Step 3: Generate** a cópia dos contratos (com cabeçalho `// Copiado de r2s-lab/lib/<arquivo> … Não edite aqui.`) e a fixture.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "test: vendor squad contracts and add a squad fixture"`

### Task B2: Coletor de squads

**Files:** Modify `src/collect.mjs`; Test `tests/collect-squads.test.mjs`

**Interfaces — Produces:**
- `squadSlug(name: string): string` (minúsculas, sem acentos, qualquer sequência fora de `a-z0-9` vira um hífen, sem hífen nas pontas).
- `collectSquads(roster: RosterRow[], opts: {owner, fetchFile, probeRepo?, concurrency?}): Promise<{byName: Record<string, {gates: Squad, assessment: Assessment | null, docs: Partial<Record<'A'|'B'|'C'|'D'|'E', string>>}>, missing: string[], errors: Array<{squad: string, message: string}>, unread: Array<{squad: string, reason: 'api'|'repo', message: string}>}>` — um repositório `r2s-lab-squad-<slug>` por squad distinta da lista (coluna `squad` não vazia); lê `squad/gates.json` (404 → `missing`, com a mesma regra de `probeRepo` de `collectProgress`), `squad/assessment.json` (404 → `null`) e os cinco documentos (404 → ausente); `gates.json` inválido (JSON ou `validateSquad`) → `errors`; avaliação inválida → `errors`; falhas de API e exceções → `unread` com a mensagem segura de `collectProgress` (nunca a mensagem da exceção).
- `localFetchFile(dir)` passa a entender `r2s-lab-squad-<slug>`: lê `dir/squads/<slug>/<path>`; o resto continua em `dir/<path>`.

- [ ] **Step 1: Write the failing tests:** `squadSlug` (`Multiplicadores` e `Squad Dados & IA` → `squad-dados-ia`); uma squad por nome distinto; squads sem nome na lista são ignoradas; a fixture é lida por `localFetchFile` (gates, avaliação e 5 docs); `assessment.json` ausente → `null` sem erro; documento ausente fica fora de `docs`; `gates.json` 404 sem probe → `missing`; com probe 404 → `unread` `repo`; status 500 → `unread` `api`; `gates.json` inválido → `errors`; exceção não vaza a mensagem; `localFetchFile` continua lendo `progress/<handle>.json`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: collect squad repositories"`

### Task B3: Agregação de squads, certificação e scorecard

**Files:** Create `src/squads.mjs`; Test `tests/squads.test.mjs`

**Interfaces — Produces:** `aggregateSquads(input: {roster, squads: Record<string, {gates, assessment, docs}>, now: Date, target: number}): {squads: SquadRow[], certification: Certification, scorecard: ScorecardItem[]}`:
- `SquadRow = {squad: string, case: string, sponsor: string, members: number, currentGate: string | null, killed: boolean, done: boolean, gatesPassed: number, firstAttempt: {passed: number, firstTry: number}, dossier: {percent: number, byDoc: Record<string, number>}, decision: string | null, squadScore: number | null, assets: number, review90: {due: string | null, status: 'not_due'|'pending'|'overdue'|'done'}}`; `review90`: com G4 `passed`, `due = approvedAt + 90 dias`; `done` se a seção `d90` do D estiver completa; senão `overdue` se `now > due`, ou `pending`; sem G4 aprovado, `not_due`.
- `Certification = {target: number, byLevel: {none: number, foundation: number, practitioner: number, lead: number}, trained: number, people: Array<{github: string, squad: string, level: string, finalScore: number | null}>}` (membros das avaliações que constam na lista do RH; `trained` = pessoas com nível diferente de `none`; membros fora da lista ficam de fora).
- `ScorecardItem = {key: string, group: 'leading'|'learning'|'business'|'mobility'|'delivery', label: string, value: number | null, unit: '%'|'BRL'|'níveis'|'', target: string, status: 'met'|'not_met'|'tracked'|'not_measured'}` com as 10 métricas do desenho (seção 6), nesta ordem: `attendance` (média de `attendancePct`, ≥ 85), `gatesFirstAttempt` (% de gates `passed` com 1 tentativa, ≥ 70), `sandbox` (maior gasto/teto em %, ≤ 100), `competencyGain` (média do ganho, ≥ 1), `practitionerRate` (% de Practitioner ou Lead entre os avaliados, ≥ 80), `sponsorDecision` (% de `escalar` entre as squads com G4 aprovado, ≥ 50), `valueSigned` (soma do valor anual das squads com G1 aprovado, `tracked`), `assets` (ativos por squad com G4 aprovado, ≥ 1), `mobility` e `delivery` (sempre `not_measured`); sem dado → `value null` e `not_measured`. Médias em 1 casa decimal.

- [ ] **Step 1: Write the failing tests** (com a fixture): linha da squad (`currentGate 'G3'`, `gatesPassed 3`, `firstAttempt {passed: 3, firstTry: 2}`, dossiê por documento A 100, B 100, C 50, D 33, E 100 e total coerente, `squadScore 2.85`, `members 3`, `review90.status 'not_due'`); `review90` com G4 aprovado em 2026-12-01: `due 2027-03-01`, `overdue` em 2027-03-02 com D pendente e `done` com D completo; certificação (`foundation 1, practitioner 1, none 1, lead 0`, `trained 2`, pessoas com `finalScore` 3,28 / 2,92 / 2,69, **sem nome nem e-mail**); membro fora da lista ignorado; scorecard com os valores esperados (`attendance 88.3 met`, `gatesFirstAttempt 66.7 not_met`, `sandbox 40 met`, `competencyGain 1 met`, `practitionerRate 33.3 not_met`, `sponsorDecision null not_measured`, `valueSigned 360000 tracked`, `assets null not_measured`, `mobility` e `delivery not_measured`); sem squads → tudo `not_measured`, linhas vazias, sem `NaN` (varrer o objeto); sem `assessment.json` → squadScore `null`, certificação vazia.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: aggregate squads, certification and scorecard"`

### Task B4: Integração no build

**Files:** Modify `src/build.mjs`, `src/aggregate.mjs` (somente o que o build precisar); Test `tests/build.test.mjs`

**Comportamento:** `build()` também chama `collectSquads` e `aggregateSquads` e acrescenta ao `Metrics`: `squads`, `certification`, `scorecard` e `dataQuality.squads = {missing, errors, unread}`. Os dados de squad nunca contêm e-mails nem nomes. `exitCodeFor` passa a considerar `dataQuality.squads.unread` com `reason 'api'`. Roster sem squads → listas vazias, sem erro.

- [ ] **Step 1: Write the failing tests:** o build com a fixture escreve `squads` (1 linha), `certification.trained 2`, `scorecard` com 10 itens e `dataQuality.squads` vazio; `data.js` e `data.json` continuam sem e-mails e sem nomes de squad membro (nomes só como `author` do feedback); build com falha 500 nas squads → `exitCodeFor 1`; repositório de squad inexistente → `unread` `repo` e código 0; lista sem coluna de squad → `squads []`; a CLI com `--fixtures tests/fixtures` gera tudo.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify the whole suite passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add squads and scorecard to the dashboard data"`

### Task B5: Seções do painel (Squads, Certificação, Scorecard)

**Files:** Modify `dashboard/index.html`, `dashboard/dashboard.js`, `dashboard/dashboard.css`; Test `tests/dashboard.test.mjs`

**Interfaces — Produces (DOM):** `#squads` com uma linha `li.squad` por squad (`.squad-name`, `.squad-case`, `.squad-gate` `Gate atual: G3`, `.squad-dossier` `Dossiê: 78%`, `.squad-first` `1ª tentativa: 2 de 3`, `.squad-decision`, `.squad-review`); `#cert-counts` (`Foundation 1 · Practitioner 1 · Lead 0 · Sem nível 1` e `trained` de `target`); `#cert-people` (usuário, squad, nota e nível); `#scorecard li.sc` com `.sc-label`, `.sc-value`, `.sc-target`, `.sc-status` (`Meta atingida`, `Abaixo da meta`, `Acompanhando`, `Não medido`); aviso `#squads-note` quando `dataQuality.squads` tem itens (`Squads não lidas: …`). Sem squads: `Nenhuma squad registrada ainda.`

- [ ] **Step 1: Write the failing tests** (build da fixture, página real): a linha da squad com os cinco textos acima; a revisão de 90 dias mostra `Revisão de 90 dias: ainda não vence`; a certificação mostra as contagens e a tabela só com usuários (sem nomes); o scorecard lista 10 itens na ordem, com `88,3%` e `Meta atingida` na presença, `66,7%` e `Abaixo da meta` nos gates, `Não medido` em mobilidade; `R$ 360.000,00` e `Acompanhando` no valor; texto da squad com HTML (`case` com `<img onerror>`) aparece como texto e `window.__pwned` fica indefinido; nome de squad e caso muito longos não geram rolagem horizontal a 360 px; sem squads aparece o texto vazio e nenhum `NaN`; os novos elementos passam no contraste AA e não usam animação com `prefers-reduced-motion`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** as seções (tudo por `textContent`; `overflow-wrap: anywhere` nos textos livres).
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add squads, certification and scorecard to the dashboard"`

### Task B6: Demo local e guia de teste

**Files:** Create `scripts/demo.mjs`, `docs/TESTE-DA-PLATAFORMA.md`; Modify `package.json` (script `demo`), `README.md`; Test `tests/demo.test.mjs`

**Interfaces — Produces:** `startDemo(opts?: {port?: number, out?: string}): Promise<{url: string, close(): Promise<void>}>` — gera o painel com as fixtures em `out` (padrão: pasta temporária) e o serve por HTTP; `npm run demo` imprime a URL e fica no ar.

**Guia (`docs/TESTE-DA-PLATAFORMA.md`, pt-BR):** como abrir cada peça localmente — landing (`/home/user/r2s-lab-site`, `npm run serve`), pre-work e pesquisa (`r2s-lab/00-prework`, `r2s-lab/05-encerramento`), verificador da squad (`node tools/check-squad.mjs`), certificado, painel com dados de demonstração (`npm run demo`) — e o fluxo de ponta a ponta: exportar o progresso, colocar em `progress/`, rodar o build com `--fixtures`; o que só funciona com o GitHub real (leitura pela API, Actions, repositórios privados) e o que falta configurar (organização, `LAB_READ_TOKEN`, visibilidade).

- [ ] **Step 1: Write the failing tests:** `startDemo` responde 200 em `/` e `/data.json`, o `data.json` tem `squads` e `scorecard`, e `close()` encerra; o guia cita `npm run demo`, `tools/check-squad.mjs` e `LAB_READ_TOKEN`; o README cita o guia; guardas existentes continuam verdes (o guia não tem e-mails reais nem "Requirement-to-Solution").
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** o demo (servidor `node:http` estático simples, sem dependências), o guia e o script.
- [ ] **Step 4: Run to verify the whole suite passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add local demo and platform test guide"`

---

## Fora deste plano

Publicação (visibilidade de `juliopessan/r2s-lab`, organização do GitHub, `LAB_READ_TOKEN`); legendas do teaser (decidido: ficam como estão); o diagnóstico oficial da semana 0; mobilidade e tempo até o primeiro PoC; custo real do sandbox.

## Auto-revisão

- **Cobertura do desenho:** contratos e regras (seções 4 e 5) → A1, A4; dossiê A–E e verificador → A2, A3; certificado → A5; painel de squads, certificação e scorecard (seções 2 e 6) → B2–B5; demo e guia de teste → B6.
- **Consistência de tipos:** `Squad`, `Assessment`, `validateSquad`, `squadChecks`, `dossierStatus`, `levelFor`, `collectSquads` e `aggregateSquads` têm uma definição única; a parte B só consome o que a parte A produz.
- **Proporção:** o plano tem cerca de 3 vezes o desenho; quase só testes e assinaturas.
