# R2S Lab — Fase 2A: contrato de progresso, pre-work e pesquisa — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar o pre-work de 8 horas e a pesquisa de satisfação para páginas dentro do repositório do laboratório, que guardam o progresso no navegador e o exportam como `progress/<usuario>.json`, um arquivo com contrato de dados versionado que o painel (plano 2B) lê.

**Architecture:** Páginas estáticas com scripts clássicos (sem módulos ES), para abrirem tanto por duplo clique (`file://`) quanto por um servidor local. A lógica pura (contrato, cálculos) vive em `lib/*.js` no formato UMD: o mesmo arquivo roda no Node (testes) e no navegador. O estado fica no `localStorage`; **Exportar** gera o JSON, **Importar** restaura o estado a partir dele.

**Tech Stack:** HTML/CSS/JS puros; Node 22 (`node --test`, testes `.mjs` com `require` de UMD); Playwright 1.63.0 global (mesmo harness do site).

**Spec:** `docs/superpowers/specs/2026-11-15-r2s-lab-platform-design.md` (§7.2, §7.3, §7.4 e §8, Fase 2). Fontes a portar: pre-work = artifact `https://claude.ai/artifact/52gyTzqiyQ7AE882ofGQVz`; pesquisa = artifact `https://claude.ai/artifact/7KA2mpYPS4iYRBmErEwuGU` (ler com a ferramenta Artifact; copiar o texto das telas e dos quizzes verbatim).

## Desvios do spec (rulings do plano, a confirmar)

1. **Scripts clássicos em vez de módulos ES**, para as páginas abrirem por `file://` (módulos ES falham nesse modo, como o review da fase 1 mostrou).
2. **Importar além de Exportar:** o `localStorage` não sobrevive a trocar de porta, de navegador ou de máquina; o arquivo commitado é a fonte da verdade e o Importar restaura o estado.
3. **O arquivo exportado leva só o que o painel usa** (blocos concluídos, acertos dos quizzes, autoavaliação, pesquisa). Os textos livres dos exercícios (prompt, case brief, pedido) ficam só no navegador.
4. **Pesquisa identificada para a coordenação, com aviso antes de responder** (spec §6), e consentimento de citação obrigatório para exportar a pesquisa.

## Global Constraints

- R2S é marca, não código: nenhum comando chamado `r2s`. Nome por extenso: `R2S Lab — Reskilling too Skilling`.
- Proibido "Requirement-to-Solution" em qualquer texto das páginas (pergunta aberta nº 3 do spec).
- Visual do teaser: fundo escuro, laranja único. Tokens: `--bg:#0E1116`, `--card:#151A21`, `--fg:#F2F4F7`, `--muted:#A8B0BC`, `--brand:#FF5800`.
- Acessibilidade: contraste AA (≥ 4.5:1), foco visível, sem animação obrigatória (`prefers-reduced-motion`), sem rolagem horizontal a 360 px.
- Sem dado de cliente: as páginas avisam "use só texto público ou sintético". Nenhuma requisição de rede, nenhum script externo.
- Todo acesso a `localStorage` dentro de `try/catch`; as páginas funcionam sem ele.
- Texto de interface em pt-BR; código, nomes de arquivo e testes em inglês.
- Contrato: `schema` = `r2s-progress/1`. Pre-work = 13 blocos somando exatamente 480 minutos.
- Um commit por tarefa; testes com `node --test` (sem argumento de diretório).

## Review Focus

1. **`localStorage` bloqueado ou apagado** (janela privada, outra porta): a página continua usável e o Importar restaura tudo (Tasks 2 e 5).
2. **Arquivo importado inválido ou de outra versão:** erro em pt-BR, estado atual intocado (Task 5).
3. **Usuário do GitHub vazio ou inválido:** a exportação é bloqueada com mensagem, nunca gera um arquivo com nome errado (Task 5).
4. **Texto de exercício sensível no export:** nunca aparece no JSON (Task 5).
5. **Pesquisa incompleta ou sem consentimento:** a exportação lista o que falta; nada de `consent` implícito (Task 6).

---

## File Structure

```
/home/user/r2s-lab/
├─ package.json                  (remover "type":"module"; testes continuam .mjs)
├─ lib/progress.js               contrato, validação, merge, regras (UMD)
├─ lib/calc.js                   custo por transação e regra do G1 (UMD)
├─ lib/store.js                  localStorage seguro + export/import (navegador, UMD)
├─ progress/progress.schema.json documentação do contrato (gerada a partir de lib/progress.js)
├─ progress/README.md            como gerar e commitar o seu arquivo
├─ css/lab.css                   tokens e componentes das duas páginas
├─ 00-prework/index.html  js/prework.js  js/quizzes.js
├─ 05-encerramento/pesquisa.html  js/pesquisa.js
├─ tests/helpers/browser.cjs     (mesmo harness do site, raiz = este repo)
├─ tests/*.test.mjs
```

---

### Task 1: Contrato de progresso e cálculos (lib)

**Files:**
- Modify: `package.json` (remover `"type": "module"`)
- Create: `lib/progress.js`, `lib/calc.js`
- Test: `tests/progress.test.mjs`, `tests/calc.test.mjs`

**Interfaces — Produces** (`lib/progress.js`, UMD; no navegador vira `window.R2SProgress`):
- `SCHEMA_ID: 'r2s-progress/1'`; `TOTAL_MIN: 480`
- `PREWORK_BLOCKS: Array<{id: string, part: 1|2|3|4|5, min: number, title: string}>` — 13 itens, ids e minutos: `1.1`:45 `1.2`:60 `1.3`:45 `2.1`:30 `2.2`:45 `2.3`:30 `3.1`:25 `3.2`:25 `3.3`:40 `4.1`:30 `4.2`:45 `5.1`:40 `5.2`:20. Títulos verbatim do artifact (`Como um LLM gera texto`, `Prompting que funciona`, `Regra, ML, LLM ou agente?`, `Anatomia de um pedido vago`, `Métrica, baseline, meta e escopo`, `Árvore de KPI`, `Três tipos de valor`, `Custo de build e custo de run`, `Calculadora: o caso passa no G1?`, `Quem responde pelo erro`, `Um pitch de 10 minutos que termina em decisão`, `Seu case brief`, `Autoavaliação e fechamento`).
- `QUIZ_IDS: ['m1_llm','m1_prompt','m1_tech','m2_mc','m2_class','m3_types','m3_g1','m3_adopt','m4_rai']`
- `COMPETENCIES: ['problemFraming','valueCase','stakeholderCommunication','techniqueSelection','build','evaluation','dataReadiness','responsibleAiFinops']`
- `RATINGS: ['conteudo','hands','mentoria','carga','patroc','demo','prework','conf']`
- `type Progress = { schema: string, github: string, updatedAt: string, prework: { blocks: Record<string, true>, quizzes: Record<string, {answered: number, correct: number}> }, selfAssessment: Record<string, 1|2|3|4> | null, survey: null | { nps: number, ratings: Record<string, 1|2|3|4|5>, hoursPerWeek: number, open: { melhor: string, mudar: string, aplicou: string }, consent: 'nao'|'anon'|'nome', submittedAt: string } }`
- `emptyProgress(github: string): Progress`
- `validateProgress(p: unknown): { ok: boolean, errors: string[] }` (mensagens em pt-BR)
- `preworkMinutes(p: Progress): number`
- `mergeProgress(base: Progress, patch: Partial<Progress>): Progress` (sobrescreve por seção; mantém as demais)
- `routeForAverage(avg: number): 'lab-zero' | 'cohort' | 'lead'` (≤ 1.5 → `lab-zero`; ≤ 2.5 → `cohort`; acima → `lead`)
- `npsCategory(n: number): 'promoter' | 'passive' | 'detractor'` (9–10, 7–8, 0–6)

**Interfaces — Produces** (`lib/calc.js`, UMD; `window.R2SCalc`):
- `costPerTransaction(i: {tokensIn: number, tokensOut: number, priceIn: number, priceOut: number, calls: number}): number` (R$ por transação; preços por 1 milhão de tokens; `calls` mínimo 1)
- `g1Value(i: {tx: number, minutes: number, hourCost: number, adoptionPct: number, runCost: number}): {value: number, threshold: number, multiple: number | null, passes: boolean, shortfall: number}` (`value = tx × 12 × minutes/60 × hourCost × adoptionPct/100`; `threshold = 3 × runCost`; `multiple = null` se `runCost <= 0`; `passes = value > threshold`; `shortfall = max(0, threshold − value)`)

- [ ] **Step 1: Write the failing tests.** `progress.test.mjs`: `TOTAL_MIN is 480 and parts sum to 150, 105, 90, 75, 60`; `PREWORK_BLOCKS has 13 unique ids`; `emptyProgress validates`; `validateProgress rejects` (um caso por teste: `schema` errado, `github` vazio e `-ab`, bloco `9.9`, quiz com `correct > answered`, `nps` 11, rating 6, competência 5, `consent` `talvez`, `hoursPerWeek` negativo); `preworkMinutes sums only done blocks` (1.1 + 1.2 → 105); `mergeProgress keeps the other sections`; `routeForAverage boundaries` (1.5 → `lab-zero`, 1.6 e 2.5 → `cohort`, 2.6 → `lead`); `npsCategory boundaries` (6, 7, 8, 9). `calc.test.mjs`: `costPerTransaction default example` (`{2000, 500, 10, 40, 1}` → `0.04`), `six calls multiply` (6 → `0.24`), `calls below 1 count as 1` (0 → `0.04`), `g1Value example fails G1` (`{800, 15, 90, 70, 60000}` → `value 151200`, `threshold 180000`, `multiple 2.52`, `passes false`, `shortfall 28800`), `g1Value passes when run cost falls` (`runCost 40000` → `passes true`), `g1Value with zero run cost` (`multiple null`).
- [ ] **Step 2: Run to verify it fails** — `cd /home/user/r2s-lab && node --test` → FAIL (módulos ausentes).
- [ ] **Step 3: Implement** `lib/progress.js` e `lib/calc.js` com a assinatura exata acima (UMD: `module.exports` no Node, `window.R2SProgress`/`window.R2SCalc` no navegador) e remover `"type": "module"` do `package.json`.
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS, incluindo os 10 testes da fase 1.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add progress contract and calc libs"`

---

### Task 2: Pre-work — conteúdo, progresso e persistência

**Files:**
- Create: `00-prework/index.html`, `css/lab.css`, `js/prework.js`, `lib/store.js`, `tests/helpers/browser.cjs` (copiar do site, com `SITE_ROOT` = este repo)
- Test: `tests/prework.test.mjs`

**Interfaces:**
- Consumes: `PREWORK_BLOCKS`, `TOTAL_MIN`, `preworkMinutes`, `emptyProgress` (Task 1).
- Produces (`lib/store.js`, `window.R2SStore`): `load(): Progress` (estado salvo ou `emptyProgress('')`), `save(p: Progress): boolean` (`false` se o `localStorage` falhar), `clear(): void`. Chave: `r2s-progress-v1`.
- Produces (`index.html`): `<article class="block" data-block="1.1">` com `h3` e `input[type=checkbox][data-block][data-min]` por bloco; barra `#progBar` (`role="progressbar"`, `aria-valuemax="480"`), `#progHours`, `#progPct`; campo `#gh` (usuário do GitHub).

- [ ] **Step 1: Write the failing tests** (Playwright, `withPage`): `renders five parts and thirteen blocks` (ids e títulos iguais a `PREWORK_BLOCKS`; minutos no `data-min`); `progress starts at zero` (`0 min`, `0%`, `aria-valuenow 0`); `checking 1.1 and 1.2 shows 1 h 45 min` (105 min → `1 h 45 min`, `22%`); `progress survives a reload` (marca 2.1, recarrega, continua marcado); `works with localStorage blocked` (init que faz `Storage.prototype.getItem/setItem` lançarem erro: a marcação funciona na sessão, sem erro de console); `no external requests` (toda requisição é da própria origem); `contains no forbidden wording`.
- [ ] **Step 2: Run to verify it fails** — `node --test tests/prework.test.mjs`.
- [ ] **Step 3: Implement.** Portar do artifact do pre-work o cabeçalho, o plano do dia e os 13 blocos **sem os quizzes e as ferramentas** (Tasks 3 e 4 os encaixam), copiando o texto verbatim; adaptar ao tema escuro; o resumo textual do original é substituído pela exportação (Task 5). Salvar a cópia do HTML-fonte em `/home/user/r2s-lab-admin/docs/sources/prework-artifact.html` (repo privado; **não** commitar o fonte neste repo público).
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add pre-work page with progress persistence"`

---

### Task 3: Quizzes do pre-work

**Files:**
- Create: `js/quizzes.js` (dados, UMD `window.R2SQuizzes`)
- Modify: `00-prework/index.html`, `js/prework.js`, `css/lab.css`
- Test: `tests/quizzes.test.mjs`

**Interfaces:**
- Produces (`js/quizzes.js`): `QUIZZES: Record<string, Array<{q: string, o: string[], a: number, w: string}>>` para os 9 ids de `QUIZ_IDS` (textos verbatim do artifact); `scoreQuiz(answers: Record<number, number>, quizId: string): {answered: number, correct: number}`.
- Produces (DOM): `<div class="quiz" data-quiz="m1_llm">` por quiz, botões `.opt`, `.fb`, `.score`.

- [ ] **Step 1: Write the failing tests.** Node: `has 19 questions across the nine quizzes` (2+1+5+2+4+1+1+1+2); `every answer index points to an option and every question has 2 to 4 options`; `scoreQuiz counts correct and answered` (m1_llm com `{0:1, 1:0}` → `{answered: 2, correct: 1}`). Playwright: `a correct answer is marked and explained` (`.opt.right` e `Correto.`); `a wrong answer shows the right one` (`Não é essa. A resposta é “…”.` com o texto da opção certa); `score line` (`Acertos: 1 de 2 (1 respondidas)`); `answers persist and restore on reload`; `the store holds {answered, correct} per quiz` (`R2SStore.load().prework.quizzes.m1_llm` igual a `{answered:1, correct:1}`); `options are disabled after answering`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** `js/quizzes.js` (dados + `scoreQuiz`) e o motor de renderização em `js/prework.js`, gravando `{answered, correct}` na seção `prework.quizzes` do store.
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add pre-work quizzes"`

---

### Task 4: Ferramentas do pre-work (prompt, custo, valor, pedido, case brief)

**Files:**
- Modify: `00-prework/index.html`, `js/prework.js`, `css/lab.css`
- Test: `tests/tools.test.mjs`

**Interfaces:**
- Consumes: `costPerTransaction`, `g1Value` (Task 1).
- Produces (DOM): campos `#pr_*`, `#c_*`, `#v_*`, `#ask_*`, `#b_*` com os mesmos ids do artifact; saídas `#pr_out`, `#c_tx`, `#c_mo`, `#c_yr`, `#v_val`, `#v_thr`, `#v_mul`, `#v_ver`, `#ask_out`, `#b_stat`. Os valores digitados ficam em `localStorage` (chave `r2s-prework-fields-v1`) e **nunca** vão para o store exportável.

- [ ] **Step 1: Write the failing tests** (Playwright): `prompt builder assembles the six parts` (com os valores padrão, `#pr_stat` = `5 de 6 partes preenchidas · N caracteres`, onde N é o tamanho de `#pr_out`); `default cost example` (`#c_tx` = `R$ 0,04`, `#c_mo` = `R$ 200,00`, `#c_yr` = `R$ 2.400,00`, comparando com espaços normalizados); `six calls change the cost` (`c_calls=6` → `R$ 0,24`); `default value example does not pass G1` (`#v_val` = `R$ 151.200,00`, `#v_thr` = `R$ 180.000,00`, `#v_mul` = `2,5×`, `#v_ver` contém `Ainda não passa no G1` e `R$ 28.800,00`); `lowering run cost passes G1` (`v_run=40000` → `Passa no G1.`); `run cost zero asks for input` (`Informe o custo anual de run para comparar.`); `ask line` (decisão `Escalar` + `#ask_need` → `Peço que o painel decida escalar este caso: …`); `brief counter` (`3 de 10 campos preenchidos`); `copy prompt falls back without clipboard` (`Selecione o texto e copie com Ctrl+C (ou Cmd+C).`); `typed fields persist but never reach the exportable store` (o JSON de `R2SStore.load()` não contém o texto digitado).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** as ferramentas portando o comportamento do artifact (função `buildPrompt`, bloco de custo, bloco de valor com o veredito, linha do pedido, contador do brief), chamando `R2SCalc`.
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add pre-work tools"`

---

### Task 5: Autoavaliação, Exportar e Importar

**Files:**
- Modify: `00-prework/index.html`, `js/prework.js`, `lib/store.js`
- Create: `progress/README.md`
- Test: `tests/export.test.mjs`

**Interfaces:**
- Consumes: `validateProgress`, `mergeProgress`, `routeForAverage`, `COMPETENCIES` (Task 1); `R2SStore` (Task 2).
- Produces (`lib/store.js`): `buildExport(github: string, now?: Date): {ok: true, filename: string, json: string} | {ok: false, errors: string[]}` (monta o `Progress` a partir do store, define `schema` e `updatedAt`, valida; `filename = '<github>.json'`); `importProgress(text: string): {ok: true} | {ok: false, error: string}` (valida; só então substitui o estado).
- Produces (DOM): `#selfGrid` com 8 sliders `#s_0..#s_7` (1–4), `#s_avg`, `#s_route`; botões `#export-btn`, `#import-input` (`type=file`), `#reset-btn`; mensagens `#export-msg`.

- [ ] **Step 1: Write the failing tests.** Node (`buildExport`/`importProgress` com um `localStorage` falso): `export is blocked without a GitHub username` (erro `Informe o seu usuário do GitHub.`); `export is blocked for an invalid username` (`-ab`); `export filename and content` (`anasouza` → `anasouza.json`; `JSON.parse(json)` valida e tem `prework.blocks['1.1'] === true`); `export has no free-text exercise content` (marcar o brief com o texto `SEGREDO-123` → `json` não contém `SEGREDO-123`); `import restores the state`; `import rejects another schema version` (erro `Este arquivo é de outra versão do R2S Lab.`, estado intocado); `import rejects invalid JSON` (`O arquivo não é um JSON válido.`). Playwright: `self-assessment average and route` (padrão 2 em tudo → `2,0` e o texto de `cohort`; tudo 1 → `lab-zero`; tudo 4 → `lead`); `export downloads <user>.json` (`page.waitForEvent('download')`; `suggestedFilename() === 'anasouza.json'`); `import restores a file after localStorage was cleared` (exporta, limpa o storage, recarrega, importa, marcações voltam); `reset needs two clicks` (`Confirmar: apagar tudo`).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** a autoavaliação (portar os 8 nomes: Problem framing, Value case, Stakeholder communication, Technique selection, Build (RAG, agents, apps), Evaluation, Data readiness, Responsible AI e FinOps → mapeados às chaves de `COMPETENCIES`), `buildExport`, `importProgress` e os botões. `progress/README.md`: passos para colocar o arquivo em `progress/`, commitar e dar push no seu repositório privado.
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add self-assessment and progress export/import"`

---

### Task 6: Pesquisa de satisfação

**Files:**
- Create: `05-encerramento/pesquisa.html`, `js/pesquisa.js`
- Test: `tests/pesquisa.test.mjs`

**Interfaces:**
- Consumes: `RATINGS`, `npsCategory`, `buildExport`/`importProgress`, `R2SStore`.
- Produces (DOM): `#nps` (0–10), uma escala 1–5 por chave de `RATINGS` (`name="r_<chave>"`), `#horas`, três textareas `#aberta-melhor`, `#aberta-mudar`, `#aberta-aplicou`, rádios `name="consent"` (`nao`, `anon`, `nome`), `#aviso` (texto de transparência), botões de exportar/importar iguais aos da Task 5.

**Texto do aviso (verbatim):** `Suas respostas são identificadas para a coordenação do lab. Citações em materiais de divulgação só acontecem conforme o consentimento que você marcar abaixo.`

- [ ] **Step 1: Write the failing tests** (Playwright): `shows the notice before the questions`; `renders the NPS 0–10, eight ratings, hours, three open questions and three consent options` (pergunta e rótulos verbatim do artifact da pesquisa); `export lists what is missing` (sem nada respondido: mensagem contém `NPS`, `Conteúdo e exercícios` … e `consentimento`); `export is blocked until consent is chosen` (tudo respondido menos o consentimento → bloqueado, **sem** `consent` implícito); `a complete survey exports` (todas as respostas e `consent: 'anon'` → arquivo válido, `survey.nps` e `survey.ratings.conteudo` corretos, `survey.submittedAt` ISO); `the exported file keeps the pre-work section` (store com bloco 1.1 + pesquisa → ambos no JSON); `answers persist across reload`; `hours must be a non-negative number` (`-1` bloqueia); `contains no forbidden wording`.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** a página portando as perguntas e escalas do artifact (sem certificado, prova social e fotos, que são da fase 4); gravar em `survey` no store; reutilizar `buildExport`.
- [ ] **Step 4: Run to verify it passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add satisfaction survey page"`

---

### Task 7: README, schema publicado e guardas

**Files:**
- Modify: `README.md`, `tests/readme.test.mjs`
- Create: `progress/progress.schema.json`, `progress/.gitkeep`, `tests/a11y.test.mjs`, `tests/guards.test.mjs`

**Interfaces:** Consumes todo o resto; Produces `progress/progress.schema.json` (JSON Schema do contrato, com `"$id": "r2s-progress/1"`).

- [ ] **Step 1: Write the failing tests.** `readme.test.mjs` (atualizar): o README cita `00-prework/index.html` e `05-encerramento/pesquisa.html`, explica Exportar, commit e push, e **não** diz mais que o pre-work "chega com a fase 2". `a11y.test.mjs`: nas duas páginas, `no horizontal scroll at 360 px`; `contrast meets AA` (corpo, `.muted`, `.btn`, laranja sobre fundo); `focus is visible on buttons and inputs`; `reduced motion shows everything`. `guards.test.mjs`: `progress/ holds no real progress files` (só `.gitkeep`, `README.md` e `progress.schema.json`); `no external hosts in any page` (nenhum `http://` ou `https://` em `src`/`href` de `.html`, exceto âncoras `<a>`); `schema file matches lib/progress.js` (`$id` igual a `SCHEMA_ID`, mesmas chaves de competências e ratings).
- [ ] **Step 2: Run to verify it fails** — `node --test`.
- [ ] **Step 3: Implement** o README (como abrir as páginas por duplo clique ou pelo servidor local; Exportar, commit, push; privacidade), o `progress.schema.json` e os ajustes de CSS que os testes exigirem.
- [ ] **Step 4: Run to verify the whole suite passes** — `node --test` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "docs: update README and add schema and guards"`

---

## Fora deste plano

Painel (plano 2B); certificado, prova social e fotos (fase 4); gates e dossiê (fase 3). A publicação do repositório depende das perguntas abertas do spec (organização do GitHub, visibilidade e onde hospedar o painel).

## Auto-revisão

- **Cobertura do spec:** §7.3 (contrato) → Task 1; §7.2 (pre-work e encerramento portados, exportação) → Tasks 2–6; §6 (pesquisa identificada + consentimento) → Task 6; §8 Fase 2 (pre-work e pesquisa) → Tasks 2–6. Painel v1 → plano 2B.
- **Consistência de tipos:** `Progress`, `validateProgress`, `buildExport`, `importProgress`, `R2SStore` e `R2SCalc` têm uma definição única (Tasks 1, 2 e 5); as tarefas seguintes só os consomem.
- **Proporção:** o plano é cerca de uma vez e meia o spec, quase só testes e assinaturas.
