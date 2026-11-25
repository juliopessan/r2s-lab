# Plataforma R2S Lab — desenho (v1, para aprovação)

Data: 2026-11-15 · Autor: Julio Pessan
Status: **aguardando aprovação**. Nada foi construído.

---

## 1. Intenção e porquê

A prática de Data & AI vai treinar cerca de **100 pessoas do time de dados no FY27** com a metodologia R2S Lab. Hoje existem peças soltas: um teaser de 90 s, dois artifacts (pre-work e encerramento) e a metodologia escrita. Falta a plataforma que as junta e responde, sem planilha manual, ao que a coordenação precisa saber:

- quantas pessoas foram treinadas e quantas faltam;
- qual o grau de satisfação;
- quais são os feedbacks e as sugestões;
- (depois) em que gate cada squad está e se o caso vale o que custa.

A plataforma tem três faces:

1. **Landing page** com o teaser. É a vitrine da marca e o "como começar".
2. **O laboratório em si**: um repositório Git que cada pessoa clona e usa no VS Code, na própria máquina.
3. **Painel de controle interno**, só para a coordenação.

## 2. Marca e narrativa (pedido explícito: destacar e reforçar)

**R2S é uma marca, não um código.** A definição dada pelo Julio, registrada como está:

> **R** de *Reskilling*, **2** de *too*, **S** de *Skilling*.

Leitura que adoto (**chamada minha, a aprovar**): o "2" é o laço entre as duas pontas. Quem faz **reskilling** (muda de papel, em duas coortes) e quem faz **skilling/upskilling** (aprofunda o papel atual, em uma coorte) passam pelo **mesmo laboratório**. A metodologia já diz isso ("two paths run inside the same lab"). A narrativa da marca é: *ninguém fica de fora; recicla e evolui no mesmo lab*.

Como a narrativa aparece (propostas de texto, a aprovar):
- Na landing, logo após o hero: bloco **"R · 2 · S"** com as três letras grandes, o "2" em laranja como ponte, e uma frase de uma linha por letra.
- Nome por extenso nos pontos de contato: *R2S Lab — Reskilling too Skilling*, usado em README, rodapé, certificado e e-mails.
- O "2" laranja é o motivo gráfico recorrente (divisores, ícone da aba, selo do certificado).
- O resto do teaser continua valendo: *Menos curso. Mais lab.*

**Ponto a resolver (pergunta aberta nº 3):** a metodologia escrita expande R2S como *Requirement-to-Solution Lab*. Proponho manter as duas leituras sem conflito: **marca = Reskilling too Skilling**; **método (o Lab Loop) = Requirement-to-Solution**, como subtítulo técnico. Se o Julio preferir aposentar a leitura "Requirement-to-Solution", os textos da metodologia precisam ser revisados.

## 3. Quem usa e em que escala

| Quem | O que faz na plataforma |
|---|---|
| Colaborador (~100, lista do RH) | Clona o repo, faz o pre-work, responde a pesquisa, trabalha o caso da squad |
| Multiplicadores (1 squad de 5, onda 0) | Primeiros a passar; depois mentoram a turma. Equivalem ao embrião do nível *Lead* |
| Coach | Aprova gates (G2, G3) por PR; registra presença |
| Lab owner / coordenação | Abre o painel; importa a lista do RH |
| Sponsor, painel executivo | Fase 3+: assinam G1 e G4 |

Ondas: **onda 0** = squad dos multiplicadores (pré-piloto); **onda 1** = restante da turma; coortes seguintes conforme o roadmap da metodologia (piloto jan–mar/2027, coorte 1 mai–jul/2027, depois uma por trimestre).

## 4. Metas, não-metas e antimetas

**Metas**
- Dar à coordenação, até o diagnóstico de dezembro, o painel de cobertura e satisfação.
- Preservar o que o teaser promete: *Prove o valor, Escolha o mais barato que funciona, Meça, Proteja, A cada gate um novo papel, o negócio decide.*
- Funcionar sem servidor próprio e sem login novo: a identidade é o usuário do GitHub.

**Não-metas (nesta versão)**
- Hospedar o ambiente Azure dos squads (sandbox, orçamento): fica fora; só se mede depois.
- Substituir a coordenação na conferência de presença e nota.
- Pesquisa 100% anônima (ver §6).

**Antimetas** (falha mesmo que "funcione")
- Virar um curso em vídeo: contradiz *Menos curso. Mais lab.*
- Expor dado pessoal ou progresso individual a outros participantes ou fora da coordenação.
- Publicar métrica que ninguém consegue auditar até o arquivo de origem.
- Qualquer dado de cliente na plataforma.

## 5. Restrições

- **Prazo:** a fase *Prepare* da metodologia é dez/2026, com o diagnóstico da semana 0 para toda a equipe. Hoje é 15/11.
- Trabalho local no **VS Code**, repo clonado na máquina de cada pessoa.
- Sem dado de cliente; dado pessoal só o mínimo, com base legal e aviso (LGPD). **Revisão do Jurídico antes do uso real.**
- Visual do teaser: fundo escuro, laranja único, frases curtas. As páginas de pre-work e encerramento atuais são claras e usam roxo; ao entrarem no repo, adotam o visual do teaser.
- Acessibilidade: o vídeo é narrado, então precisa de legendas em português; contraste AA; sem animação obrigatória (`prefers-reduced-motion`).

## 6. Abordagens consideradas

**A. Git-nativo (escolhida).** Tudo vira arquivo e pull request. O progresso individual é um `progress/<usuario>.json`; o dossiê da squad é markdown; o gate é um PR aprovado pelo coach. Uma GitHub Action agendada lê os repos e publica o painel estático.
Ganha: sem servidor, auditável, casa com "gates por evidência", cabe no prazo.
Perde: a pesquisa não é anônima para a coordenação (o commit tem autor); depende de permissões na org do GitHub.

**B. CLI + backend (adiada).** Um comando no repo envia eventos a uma API com banco (Vercel + Postgres).
Ganha: pesquisa anônima real, lista do RH protegida no servidor.
Perde: muito mais para construir e manter; LGPD, hospedagem e tokens nos notebooks.

Migrar de A para B depois é barato: os arquivos continuam sendo a fonte da verdade.

**Pesquisa (chamada minha):** respostas **identificadas para a coordenação** (necessário para saber quem falta responder), e **citação pública só conforme o consentimento** que a pesquisa já coleta (não / sim sem nome / sim com nome). O aviso é dito ao participante antes de responder. Quem precisar de anonimato total usa um Microsoft Forms opcional, que o painel lê como arquivo exportado; esse caminho é secundário.

## 7. Arquitetura

### 7.1 Repositórios (organização do GitHub: a confirmar)

| Repo | Visibilidade | Conteúdo |
|---|---|---|
| `r2s-lab` | template, visível na org | currículo, pre-work, templates A–E, starter kits, README "comece aqui" |
| `r2s-lab-<usuario>` | **privado**, um por pessoa, criado do template | `progress/<usuario>.json` |
| `r2s-lab-squad-<nome>` | privado, um por squad | `squad/` com caso, ADR, SIS, golden set, `gates.yml` |
| `r2s-lab-site` | visível na org | código da landing page |
| `r2s-lab-admin` | **privado, só coordenação** | `roster.csv` (lista do RH), código do painel, Actions |

Princípio (inegociável): **ninguém vê o progresso individual de outra pessoa**; a coordenação lê tudo. Se o builder achar uma topologia mais simples que respeite esse princípio, ela vale.

### 7.2 O repositório do laboratório (`r2s-lab`)

```
r2s-lab/
├─ README.md             teaser + "comece aqui" + narrativa R · 2 · S
├─ 00-prework/           8 h, 5 partes (porta do artifact atual)
├─ 05-encerramento/      pesquisa, certificado, prova social, fotos
├─ templates/            A brief · B ADR · C pitch · D SIS · E hearing
├─ starter-kits/         RAG · agente · eval · custo por transação
├─ squad/                brief, adr, sis, golden-set, gates.yml
├─ progress/             <usuario>.json
└─ .github/workflows/    valida evidências
```

**Pre-work e encerramento:** os dois artifacts viram páginas estáticas dentro do repo, abertas no navegador a partir do VS Code. Eles já salvam no `localStorage` e já geram um resumo copiável. A mudança é um botão **"Exportar progresso"** que gera o `progress.json`; a pessoa o coloca em `progress/` e faz commit e push.

### 7.3 Contrato de dados (esboço; o builder detalha)

`progress/<usuario>.json` guarda: versão do schema; blocos do pre-work concluídos (id e minutos); acertos por quiz; autoavaliação das 8 competências (1–4); pesquisa (NPS, 8 notas de 1–5, horas por semana, 3 respostas abertas, consentimento); datas. `gates.yml` guarda: gate atual, histórico G0–G4 com data e aprovador, decisão do demo day (escalar, iterar ou encerrar).

### 7.4 Métricas do painel

**Funil (definição de "treinado"):** Convidado (lista do RH) → Iniciou pre-work → Concluiu pre-work (8 h) → Diagnóstico da semana 0 → Lab Zero (**Foundation**) → Coorte completa (**Practitioner**) → **Lead**.
"Faltam" = lista do RH menos quem atingiu o nível-alvo. A meta de 100 vale **por nível** (ver pergunta nº 4).

**Satisfação:** NPS; 8 notas de 1–5 (conteúdo, hands-on, mentoria, carga, sponsor, demo day, pre-work, confiança); horas por semana reais contra as 6 protegidas.
**Feedbacks e sugestões:** respostas abertas filtráveis por tema; nomes só com consentimento.
**Por squad (fase 3):** gate atual, % do dossiê preenchido (campos `[ ]` pendentes), gates aprovados na primeira tentativa (meta ≥70%), decisão do demo day, ativos publicados.
**Fora desta versão:** gasto de sandbox (precisa de dado do Azure), presença (≥85%; entrada manual do coach, fase 3).

### 7.5 Painel

Site estático gerado por uma Action agendada (diária e a cada push) com um GitHub App **somente leitura**. Publicado atrás de autenticação, **nunca público** (contém dado pessoal). Hospedagem a confirmar (pergunta nº 2).

### 7.6 Landing page

Site estático (HTML/CSS/JS, sem framework necessário), tema escuro do teaser. Estrutura:
1. **Hero:** o teaser (mp4 de 90 s, 1920×1080, narrado; arquivo local de 5,5 MB), com poster, legendas em português e controles acessíveis.
2. **R · 2 · S:** a narrativa da marca (§2).
3. **Os beats do teaser, um por seção:** *Menos curso. Mais lab.* · 7 etapas, 5 gates, 12 semanas · *Prove o valor* · *Escolha o mais barato que funciona* · *Meça* · *Proteja* · *A cada gate, um novo papel* (os 5 papéis da squad) · *Demo day. O negócio decide.*
4. **Como começar:** clonar, abrir no VS Code, abrir o README.
5. **Rodapé:** lockup prática de Data & AI.

## 8. Fases e ordem

| Fase | Quando | Entrega |
|---|---|---|
| 1 | novembro | Landing com teaser, repo `r2s-lab` com README, formato da lista do RH |
| 2 | dezembro | Pre-work e pesquisa portados com exportação; painel v1 (cobertura, funil, satisfação, feedbacks) |
| 3 | janeiro (piloto) | Repo de squad, `gates.yml`, validação por Action, dossiê A–E, visão por squad no painel |
| 4 | fev–abr | Certificação (certificado do artifact de encerramento), rubrica 60/40, revisão de 90 dias, ROI |

Esta versão detalha as fases 1 e 2. Cada fase seguinte ganha desenho próprio antes de ser construída.

## 9. Chamadas minhas (para você conferir)

1. Abordagem Git-nativa; migração para backend só se a necessidade aparecer.
2. "Treinado" = nível de certificação (Foundation, Practitioner, Lead), e não "terminou o pre-work".
3. Pesquisa identificada para a coordenação; citações públicas só com consentimento.
4. Um repo privado por pessoa e um por squad, para isolar o progresso individual.
5. Landing e páginas do repo no visual escuro do teaser; lockup R2S só no rodapé.
6. Pre-work e encerramento reaproveitados quase inteiros dos artifacts existentes, com o botão de exportação.
7. Pasta e repo chamados `r2s-lab` (nome da marca; não há comando nem CLI).

## 10. Perguntas abertas (só você responde)

1. **Em qual organização do GitHub** os repos vão morar, e a org permite criar repos a partir de template e rodar Actions?
2. **Onde publicar o painel** com acesso restrito (GitHub Pages privado, Vercel com proteção ou outro padrão interno)?
3. **A leitura de R2S:** manter "Requirement-to-Solution" como subtítulo do método (minha proposta) ou aposentar?
4. **Meta de 100 por nível:** confirmar que 100 = Foundation até o fim do FY27 (assumi ago/2027), com Practitioner e Lead seguindo o plano de coortes (~30 no FY27).
5. **Diagnóstico oficial da semana 0:** como é pontuado (rubrica do coach, teste)? A metodologia não define, e a autoavaliação do pre-work é só preliminar.
6. **Idioma** dos módulos e dos pitches (português, inglês ou ambos); a metodologia deixa em aberto.

## 11. O que fica para quem for construir

Topologia final dos repos, schema exato dos arquivos, desenho visual detalhado dos componentes, legendas do vídeo (transcrição do áudio), estratégia de testes, e o fluxo do GitHub App (permissões mínimas). Em qualquer dúvida, vale o princípio do §7.1 e as antimetas do §4.
