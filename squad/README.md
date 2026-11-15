# Pasta da squad

Esta pasta guarda o **caso da sua squad**. Ela é copiada para o repositório da squad (`r2s-lab-squad-<nome>`) e vai sendo preenchida ao longo do Lab Loop.

| Arquivo | O que é | Quando |
|---|---|---|
| `A-case-brief.md` | case brief, preenchido com o patrocinador | G0 e G1 |
| `B-adr.md` | decisão de arquitetura, comparando opções | G2 |
| `C-pitch.md` | roteiro do pitch e placar do painel | G4 |
| `D-sis.md` | Social Impact Statement: revisões no G2, no G3 e aos 90 dias | G2, G3 e 90 dias |
| `E-hearing.md` | cartão da audiência de partes interessadas | Discover, semana 2 |
| `golden-set.csv` | casos de avaliação, escritos antes do primeiro prompt | G3 (mínimo de 50 casos) |
| `gates.json` | estado dos gates G0 a G4, papéis e decisão | sempre |
| `assessment.json` | avaliação da squad e dos membros, preenchida pelo coach e pelo painel | fim da turma |

## Como preencher

- Cada campo pendente termina em `[preencher]`. Troque pelo texto real; o painel da coordenação conta quantos faltam. `[opcional]` não conta.
- Os gates andam por **pull request**: quem preenche o dossiê atualiza o `gates.json` (status, tentativas) e o **coach** aprova o PR do G2 e do G3, registrando `approvedBy` e `approvedAt`. O patrocinador assina o G1 e decide no G4; o nome dele vai em `approvedBy`.
- Um gate só passa depois do anterior; só G0, G1 e G2 podem ser encerrados (`killed`). O G1 exige valor anual **maior que 3×** o custo anual de run.
- Os papéis giram a cada gate: registre em `roles` quem exerceu cada papel nos gates G1, G2 e G3.

## Conferir antes de abrir o PR

```bash
node tools/check-squad.mjs
```

O comando valida o `gates.json` e confere os gates aprovados contra os documentos (por exemplo, G2 aprovado com o ADR ainda pendente é um erro). Pendências não são erro: elas só aparecem no relatório. A mesma conferência roda na Action `squad-check` a cada PR.

## Regras

Sem dado de cliente. Uma pessoa nomeada responde por cada decisão do algoritmo. A técnica mais barata que funciona.
