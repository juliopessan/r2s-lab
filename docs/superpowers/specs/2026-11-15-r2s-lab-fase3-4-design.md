# Plataforma R2S Lab — Fases 3 e 4: jornada da squad, certificação e scorecard

Data: 2026-11-15 · Status: **desenho de trabalho**. O Julio pediu para seguir com as demais tarefas para testar a plataforma completa; as decisões abaixo são minhas e estão listadas na seção 7 para conferência.
Base: `2026-11-15-r2s-lab-platform-design.md` (§7, §8) e a metodologia (Lab Loop, gates, rubrica, certificação, scorecard).

## 1. Intenção

Fechar o ciclo para teste de ponta a ponta: a squad trabalha o caso no VS Code (dossiê A–E, gates), o coach registra a avaliação, e a coordenação vê no painel **onde cada squad está, quanto do dossiê está preenchido, quem alcançou qual nível e como está o scorecard do programa**. A certificação sai em um certificado imprimível.

## 2. Escopo

**Fase 3 — jornada da squad** (template `r2s-lab` + painel):
- Contrato `r2s-squad/1` (`squad/gates.json`): gates G0–G4, papéis rotativos, valor e custo do G1, decisão do G4, ativos.
- Dossiê em markdown: A case brief, B ADR, C pitch, D Social Impact Statement (G2, G3 e 90 dias), E audiência de partes interessadas, mais `golden-set.csv`. Campo pendente = marcador `[preencher]`.
- Verificador local e em Action (`tools/check-squad.mjs`): valida o `gates.json` e confere os gates aprovados contra os documentos.
- Painel: visão por squad (gate atual, % do dossiê, 1ª tentativa, decisão).

**Fase 4 — avaliação e certificação**:
- Contrato `r2s-assessment/1` (`squad/assessment.json`, preenchido por coach e painel): rubrica da squad (6 dimensões), evidências individuais, presença, gasto do sandbox, competências inicial e final.
- Regras de nota (60% squad, 40% individual) e níveis Foundation, Practitioner e Lead.
- Página do certificado (A4 paisagem, imprime em PDF).
- Painel: certificação por nível contra a meta de 100 (Foundation), tabela por pessoa e **scorecard** com as 10 métricas da metodologia (as sem dado aparecem como "não medido").

## 3. Não-metas

Ambiente Azure e custo real do sandbox (a coordenação digita o gasto); diagnóstico oficial da semana 0 (pergunta aberta nº 5: usa-se o campo `competencies.diagnostic` que o coach preenche); mobilidade e tempo até o primeiro PoC (sempre "não medido"); Microsoft Forms.

## 4. Contratos

**`squad/gates.json` (`r2s-squad/1`)**: `squad`, `case`, `sponsor`, `coach`, `members[{github, role}]` (até 5; papéis `product-lead`, `data-lead`, `ai-engineer`, `eval-risk-lead`, `storyteller`), `gates{G0..G4}` com `status` (`pending`, `in_review`, `passed`, `killed`), `attempts`, `approvedBy`, `approvedAt` (AAAA-MM-DD), mais `annualValue` e `annualRunCost` no G1, `costPerTransaction` no G3 e `decision` no G4; `roles{G1,G2,G3}` (quem exerceu cada papel na etapa); `assets[]`.
Regras: um gate só passa depois do anterior; `killed` só em G0, G1 ou G2 e os seguintes ficam `pending`; `passed` exige `approvedBy` e `approvedAt`; G1 passado exige valor anual **maior que 3×** o custo anual de run; G2 e G3 passados exigem aprovação do coach; G1 a G3 passados exigem os 5 papéis atribuídos; G4 passado exige `decision` (`escalar`, `iterar`, `encerrar`) e pelo menos 1 ativo.
Conferência com os documentos: G0 e G1 passados exigem o brief A sem pendências; G2, o ADR B sem pendências com 2 opções preenchidas e a revisão G2 do D completa; G3, `golden-set.csv` com 50 casos ou mais e a revisão G3 do D completa; G4, o pitch C completo.

**`squad/assessment.json` (`r2s-assessment/1`)**: `squadRubric{framing, design, engineering, evaluation, cost, communication}` (1–4 ou `null`), `sandbox{capUsd, spentUsd}`, `members{<github>: {labZeroCompleted, knowledgeCheckPct, coachObservation, peerReview, attendancePct, competencies{diagnostic, final}, coachedNextCohort, assetReused}}`.

## 5. Regras de nota e nível (da metodologia)

Pesos da squad: framing 25%, design 20%, engineering 20%, evaluation 15%, cost 10%, communication 10%. Individual: observação do coach 20%, revisão por pares 10%, prova de conhecimento 10%. **Nota final = 60% squad + 40% individual**, em escala 1–4.
- **Foundation:** Lab Zero concluído e prova ≥ 70%.
- **Practitioner:** nota final ≥ 3,0 e nenhuma dimensão da squad abaixo de 2.
- **Lead:** Practitioner, mais coachou uma squad na coorte seguinte e um ativo reutilizado por outro time.

## 6. Scorecard (10 métricas)

Presença ≥ 85%; gates aprovados de primeira ≥ 70%; gasto do sandbox dentro do teto; ganho médio de competência ≥ +1,0; taxa de Practitioner ≥ 80%; casos com decisão "escalar" ≥ 50% (entre os que chegaram ao G4); valor assinado no G1, anualizado (só acompanhado); ativos ≥ 1 por caso; mobilidade e tempo até o primeiro PoC (não medidos). Cada item mostra valor, meta e estado: `met`, `not_met`, `tracked` ou `not_measured`.

## 7. Decisões minhas (a conferir)

1. **`gates.json` em vez de `gates.yml`:** o Node não lê YAML sem dependência; JSON mantém o projeto sem pacotes.
2. **Marcador `[preencher]`** para campo pendente (`[opcional]` não conta). O total de campos por documento é fixo na biblioteca e um teste o confere contra os templates (A 14, B 9, C 6, D 9, E 11).
3. **Prova de conhecimento** vira nota 1–4 por `1 + 3 × pct/100`; a metodologia não define a conversão.
4. **O certificado** é gerado na página sem conferir nota; quem confere é a coordenação, pelo painel.
5. **Nomes das squads** no GitHub: repositório `r2s-lab-squad-<nome em minúsculas, com hífen>`.
6. **Certificação no painel** usa o usuário do GitHub, sem nome, para limitar a exposição.
7. **Revisão de 90 dias:** vence 90 dias após a aprovação do G4; o painel avisa quando vence com a seção do D pendente.
8. **Fases 3 e 4 num só plano e numa só revisão final**, para chegar logo à plataforma testável.

## 8. Perguntas abertas

Quem assina o G1 e o G4 (o patrocinador não tem usuário no repositório: `approvedBy` aceita texto livre); como o diagnóstico oficial da semana 0 é pontuado; se a conversão da prova de conhecimento deve ser outra.
