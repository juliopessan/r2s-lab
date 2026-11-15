# r2s-lab-admin

Repositório **privado** da coordenação do R2S Lab (Reskilling too Skilling): a lista do RH e o painel de controle.

> **Este repositório contém dado pessoal e nunca pode ficar público.** O painel gerado também tem dado
> pessoal: ele **nunca** é publicado (nada de GitHub Pages); só existe como artefato privado da Action.

## O que o painel mostra (v1)

Quantas pessoas foram convidadas, quantas iniciaram e quantas concluíram o pre-work, quantas faltam, o funil,
a satisfação (NPS, 8 notas e horas por semana) e os feedbacks por tema. "Treinados" significa pre-work
concluído; Foundation, Practitioner e Lead chegam nas fases 3 e 4. Nomes só aparecem quando a pessoa marcou
"com meu nome" na pesquisa; e-mails nunca entram nos dados do painel.

## Como funciona

1. A lista do RH fica em `roster/roster.csv`, **nunca no git**: este repositório é clonado pelos participantes,
   então o arquivo está no `.gitignore`. Localmente você o coloca em `admin/roster/roster.csv`; na Action
   agendada ele vem do secret `LAB_ROSTER_CSV`. Formato em `roster/README.md`; valide com
   `node src/validate-roster.mjs roster/roster.csv`.
2. Cada participante exporta `progress/<usuario>.json` no seu repositório privado `r2s-lab-<usuario>`
   (contrato `r2s-progress/1`, copiado em `src/vendor/progress.cjs`).
3. `node src/build.mjs` lê esses arquivos pela API do GitHub, agrega as métricas e escreve `dist/`
   (`index.html`, `data.js`, `data.json`). Abra `dist/index.html` no navegador.

## Configuração

- `config/lab.json`: `owner` (organização ou usuário do GitHub onde ficam os repositórios `r2s-lab-*`),
  `target` (meta de pessoas) e `protectedHoursPerWeek`.
- Segredo `LAB_READ_TOKEN`: um token com permissão **somente leitura de conteúdo** nos repositórios
  `r2s-lab-*`. No GitHub Actions, guarde-o como segredo do repositório; na sua máquina, exporte-o na
  variável de ambiente `LAB_READ_TOKEN`. Ele nunca vai na URL nem em arquivo.
- O token precisa **enxergar todos** os repositórios `r2s-lab-*`, inclusive os que os participantes criarem
  depois (permissão para "All repositories" da conta ou organização, ou um GitHub App). Com um token
  limitado a repositórios escolhidos, o GitHub responde "não encontrado" e as pessoas aparecem como
  "não puderam ser lidas" no painel.
- Se a própria API falhar (token sem permissão, limite de uso, rede), o build termina com erro e a Action
  fica vermelha; repositórios que ainda não existem aparecem só como aviso no painel.

## Guia de teste da plataforma

Veja `docs/TESTE-DA-PLATAFORMA.md` para abrir cada peça (landing, pre-work, pesquisa, squad, certificado e painel) e para o que ainda depende do GitHub real. Para ver o painel agora: `npm run demo`.

## Rodar sem GitHub (demonstração)

```bash
node src/build.mjs --fixtures tests/fixtures --roster tests/fixtures/roster.csv --out dist
```

Usa dados sintéticos de `tests/fixtures/`.

## Testes

```bash
node --test
```

## Privacidade (regras do painel)

- `dist/` está no `.gitignore` e a Action só guarda o artefato por 7 dias.
- O texto livre dos participantes aparece sempre como texto, nunca como HTML.
- A lista real do RH nunca é copiada para `r2s-lab` nem para `r2s-lab-site`.
