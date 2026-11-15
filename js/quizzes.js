/* R2S Lab — quizzes do pre-work (textos do artifact original).
 * UMD: no Node é `module.exports`; no navegador vira `window.R2SQuizzes`. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.R2SQuizzes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Por quiz: lista de { q: pergunta, o: opções, a: índice da certa, w: explicação }. */
  var QUIZZES = {
  "m1_llm": [
    {
      "q": "Um LLM responde com segurança “Sydney” à pergunta “Qual é a capital da Austrália?”. O que explica melhor o erro?",
      "o": [
        "O modelo consultou uma base desatualizada.",
        "O modelo gera o próximo token mais provável a partir de padrões do treino; ele não verifica fatos.",
        "O prompt estava curto demais.",
        "O modelo errou uma conta."
      ],
      "a": 1,
      "w": "O modelo produz texto estatisticamente plausível. Sem uma fonte para ancorar a resposta (busca, documento) e sem avaliação, a confiança do tom não diz nada sobre a correção."
    },
    {
      "q": "Qual afirmação sobre tokens é verdadeira?",
      "o": [
        "Um token é sempre uma palavra inteira.",
        "Preço e janela de contexto são medidos em tokens: prompt maior custa mais e deixa menos espaço para a resposta.",
        "Tokens só importam em modelos de imagem.",
        "Todos os modelos usam o mesmo tokenizador."
      ],
      "a": 1,
      "w": "Token pode ser parte de uma palavra ou pontuação, e cada modelo tem o seu tokenizador. Entrada mais saída definem o custo, e o contexto tem limite."
    }
  ],
  "m1_prompt": [
    {
      "q": "Você pede ao modelo que responda só com base em um documento. Qual instrução reduz mais as respostas inventadas?",
      "o": [
        "Seja criativo.",
        "Se a resposta não estiver no documento, responda “não encontrado”.",
        "Responda sempre, mesmo sem certeza.",
        "Use frases mais longas."
      ],
      "a": 1,
      "w": "Dar ao modelo uma saída de escape evita que ele preencha a lacuna com algo plausível. A instrução não garante cumprimento, então ainda é preciso testar."
    }
  ],
  "m1_tech": [
    {
      "q": "Validar se o CPF digitado em um formulário tem dígitos verificadores válidos.",
      "o": [
        "Regra ou SQL",
        "ML",
        "LLM (uma chamada, com ou sem busca)",
        "Agente"
      ],
      "a": 0,
      "w": "É uma regra determinística. Custa quase nada e acerta sempre: usar modelo aqui é pagar mais para errar."
    },
    {
      "q": "Prever quais clientes vão cancelar no próximo mês a partir de três anos de histórico em tabelas.",
      "o": [
        "Regra ou SQL",
        "ML",
        "LLM (uma chamada, com ou sem busca)",
        "Agente"
      ],
      "a": 1,
      "w": "Padrão estatístico em dados estruturados é território de ML clássico. Um LLM costuma ser mais caro e menos preciso nesse tipo de problema."
    },
    {
      "q": "Resumir em dez linhas, toda segunda-feira, o que mudou num dashboard que já existe.",
      "o": [
        "Regra ou SQL",
        "ML",
        "LLM (uma chamada, com ou sem busca)",
        "Agente"
      ],
      "a": 2,
      "w": "Uma chamada de LLM sobre o modelo semântico resolve. Um agente não acrescenta nada além de custo."
    },
    {
      "q": "Responder perguntas de vendedores sobre por que perdemos negócios, a partir de notas de CRM em texto livre.",
      "o": [
        "Regra ou SQL",
        "ML",
        "LLM (uma chamada, com ou sem busca)",
        "Agente"
      ],
      "a": 2,
      "w": "Texto livre pede linguagem, e a busca nas notas fornece o contexto. Continua sendo uma chamada de LLM, agora com recuperação."
    },
    {
      "q": "Converter 2.000 stored procedures para o lakehouse: ler, converter, testar, corrigir e repetir até passar nos testes.",
      "o": [
        "Regra ou SQL",
        "ML",
        "LLM (uma chamada, com ou sem busca)",
        "Agente"
      ],
      "a": 3,
      "w": "Há várias etapas, uso de ferramentas e ciclos até passar no teste. Aqui o agente se paga, desde que exista um harness de avaliação que meça a taxa de acerto."
    }
  ],
  "m2_mc": [
    {
      "q": "O patrocinador diz: “quero IA para melhorar as vendas”. Qual é o próximo passo?",
      "o": [
        "Escolher o modelo mais recente.",
        "Montar um agente de vendas.",
        "Perguntar qual métrica muda, qual o valor de hoje (baseline) e que número tornaria o esforço válido.",
        "Pedir acesso a todos os dados do CRM."
      ],
      "a": 2,
      "w": "Sem métrica, baseline e meta o caso não passa do G0. Modelo e dados vêm depois de o problema estar assinado."
    },
    {
      "q": "Em que momentos um caso pode ser descartado sem penalidade para os colaboradores?",
      "o": [
        "Só depois do demo day.",
        "No G0, no G1 ou no G2.",
        "Nunca.",
        "Só no G4."
      ],
      "a": 1,
      "w": "O lab permite matar o caso cedo, e a squad passa a um caso reserva do catálogo. Aprender a parar é uma habilidade de negócio."
    }
  ],
  "m2_class": [
    {
      "q": "“Horas para fechar o caixa do dia.”",
      "o": [
        "Métrica",
        "Baseline",
        "Meta",
        "Escopo"
      ],
      "a": 0,
      "w": "É o que se mede: dá nome ao número que precisa mudar."
    },
    {
      "q": "“Hoje leva 4 horas, medidas em fechamentos reais do último mês.”",
      "o": [
        "Métrica",
        "Baseline",
        "Meta",
        "Escopo"
      ],
      "a": 1,
      "w": "Valor atual com a forma de medir. Sem a fonte da medição, o baseline não é confiável."
    },
    {
      "q": "“Fechar em até 1 hora.”",
      "o": [
        "Métrica",
        "Baseline",
        "Meta",
        "Escopo"
      ],
      "a": 2,
      "w": "É o número-alvo que torna o esforço válido."
    },
    {
      "q": "“Só a conciliação dos extratos do banco principal; fora, a intercompany.”",
      "o": [
        "Métrica",
        "Baseline",
        "Meta",
        "Escopo"
      ],
      "a": 3,
      "w": "Diz o que entra e o que fica de fora, o que também protege a squad de um caso grande demais."
    }
  ],
  "m3_types": [
    {
      "q": "Qual destas NÃO é uma das três hipóteses de valor do lab?",
      "o": [
        "Receita",
        "Custo",
        "Risco",
        "Engajamento da equipe"
      ],
      "a": 3,
      "w": "As três são receita, custo e risco. Engajamento pode ser consequência, mas não é uma hipótese de valor que o patrocinador assina."
    }
  ],
  "m3_g1": [
    {
      "q": "No G1, o valor anual do caso precisa exceder quanto?",
      "o": [
        "O custo de build.",
        "1× o custo anual de run.",
        "3× o custo anual estimado de run.",
        "10× o custo anual de run."
      ],
      "a": 2,
      "w": "A regra do G1 é valor maior que três vezes o custo anual de run, o que torna provável que um caso adotado pague o custo da turma."
    }
  ],
  "m3_adopt": [
    {
      "q": "O ganho calculado é de 15 minutos por transação, mas só 70% dos usuários vão adotar. O que fazer?",
      "o": [
        "Ignorar a adoção, porque o ganho por transação já é conhecido.",
        "Aplicar a adoção esperada ao valor antes de compará-lo com o custo de run.",
        "Dobrar o custo de run para compensar.",
        "Trocar o tipo de valor para risco."
      ],
      "a": 1,
      "w": "Valor que ninguém usa não existe. Descontar a adoção é o que separa um value case defensável de uma planilha otimista."
    }
  ],
  "m4_rai": [
    {
      "q": "Quando o algoritmo erra, quem responde?",
      "o": [
        "O algoritmo.",
        "O fornecedor do modelo.",
        "Uma pessoa nomeada, responsável pela decisão tomada ou informada pelo algoritmo.",
        "Ninguém: o resultado é probabilístico."
      ],
      "a": 2,
      "w": "É o princípio do FAT/ML adotado pelo lab: sempre há uma pessoa nomeada e um canal para a pessoa afetada contestar."
    },
    {
      "q": "Numa triagem de qualidade de dados, qual erro tende a ser o mais caro?",
      "o": [
        "Falso positivo: um alerta a mais para o time.",
        "Falso negativo: um incidente fica escondido do cliente.",
        "Os dois custam o mesmo.",
        "Depende do modelo escolhido, não do caso."
      ],
      "a": 1,
      "w": "É o exemplo do lab: o falso negativo esconde o incidente do cliente. Qual erro é o mais caro varia por caso, e por isso o catálogo marca o erro mais caro de cada um."
    }
  ]
};

  /** answers: { [índice da pergunta]: índice da opção escolhida }. */
  function scoreQuiz(answers, quizId) {
    var set = QUIZZES[quizId] || [];
    var answered = 0, correct = 0;
    set.forEach(function (q, i) {
      var v = answers && answers[i];
      if (v !== undefined && v !== null) {
        answered++;
        if (v === q.a) correct++;
      }
    });
    return { answered: answered, correct: correct };
  }

  return { QUIZZES: QUIZZES, scoreQuiz: scoreQuiz };
});
