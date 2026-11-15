# Lista do RH

> **O arquivo real do RH fica apenas neste repositório privado.** Ele nunca é copiado
> para `r2s-lab` nem para `r2s-lab-site`. O `roster.example.csv` contém só dados sintéticos.

## Colunas

| Coluna | Obrigatória | Regra |
|---|---|---|
| `nome` | sim | texto não vazio |
| `email` | sim | formato válido; único (sem diferenciar maiúsculas) |
| `github` | sim | usuário do GitHub (até 39 caracteres, letras, números e hífen); único |
| `onda` | sim | inteiro ≥ 0 (0 = squad dos multiplicadores) |
| `papel_atual` | sim | `Data Engineer`, `BI / Analytics Developer`, `Data Scientist`, `Data Architect` ou `ETL / DBA` (sem diferenciar maiúsculas) |
| `multiplicador` | sim | `sim` ou `nao` (aceita também `não`) |
| `squad` | não | nome da squad |
| `trilha` | não | `upskilling` ou `reskilling` |

O arquivo pode vir do Excel: aceita `;` ou `,` como separador, BOM UTF-8, CRLF, acentos e linhas em branco.

## Validar

```bash
node src/validate-roster.mjs roster/roster.csv
```

Saída `N pessoas válidas` e código 0 quando está tudo certo; caso contrário, uma linha por problema
(`linha L, campo F: mensagem`) e código 1.
