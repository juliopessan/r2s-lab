# R2S Lab

**R2S Lab — Reskilling too Skilling.** Menos curso. Mais lab.

Aqui você aprende fazendo: leva um requisito real do negócio até uma solução pronta para demonstrar,
passando por gates que pedem evidência, e não presença.

## Veja o método em 90 segundos

<video src="https://raw.githubusercontent.com/juliopessan/r2s-lab/main/docs/source-assets/R2S_Lab_teaser_90s_narrado_16x9.mp4" controls muted playsinline width="100%"></video>

Se o vídeo não aparecer na sua tela, [abra o arquivo MP4](https://raw.githubusercontent.com/juliopessan/r2s-lab/main/docs/source-assets/R2S_Lab_teaser_90s_narrado_16x9.mp4).

## R · 2 · S

- R de **Reskilling**: quem muda de papel aprende fazendo, em um caso real.
- 2 de **too**: o mesmo laboratório recebe quem se recicla e quem se aprofunda.
- S de **Skilling**: quem evolui no papel atual leva o caso até a decisão do negócio.

## Comece aqui

1. Crie o seu repositório **privado** a partir deste template. No GitHub, clique em *Use this template* → *Create a new repository*, escolha **Private** e use o nome `r2s-lab-<seu-usuario>`. O endereço do template é divulgado pela coordenação.
2. Clone o **seu** repositório (e não este template) na sua máquina.

   ```bash
   git clone <endereço do seu repositório privado>
   ```

3. Abra a pasta no VS Code.
4. Faça o pre-work: abra `00-prework/index.html` no navegador (duplo clique no arquivo ou a extensão de servidor local do VS Code). Ele leva um dia útil, e o seu andamento fica salvo no navegador.
5. Quando quiser registrar o andamento, clique em **Exportar progresso**, coloque o arquivo gerado em `progress/`, faça o commit e o push no seu repositório privado. Detalhes em `progress/README.md`.
6. No fim da turma, responda a pesquisa em `05-encerramento/pesquisa.html` e exporte de novo.

Nada do que você faz aqui é enviado a ninguém até você fazer o push: o seu progresso é privado e só a
coordenação o consolida.

## Estrutura do repositório

A estrutura abaixo é a prevista; cada pasta chega na sua fase.

```
r2s-lab/
├─ 00-prework/           pre-work de 8 horas, em 5 partes
├─ 05-encerramento/      pesquisa de satisfação (certificado, prova social e fotos chegam depois)
├─ templates/            A brief · B ADR · C pitch · D Social Impact Statement · E hearing
├─ starter-kits/         RAG · agente · avaliação · custo por transação
├─ squad/                caso, ADR, golden set e gates da sua squad
└─ progress/             seu progresso individual
```

## Regras do lab

- **Sem dado de cliente.** Use dados sintéticos, públicos ou autorizados pelo responsável pelos dados.
- **Uma pessoa nomeada responde por cada decisão** tomada ou informada por um algoritmo. "O algoritmo fez" nunca é uma resposta aceitável.
- **A técnica mais barata que funciona.** Regra ou SQL antes de ML, ML antes de LLM, uma chamada de LLM antes de um agente.
- **O seu progresso individual é privado.** Ninguém além da coordenação vê o que está no seu repositório.
