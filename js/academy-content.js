/* Gerado por tools/build-academy.mjs a partir de 00-prework/index.html. Não edite aqui. */
window.R2S_ACADEMY = {
 "parts": [
  {
   "part": 1,
   "title": "GenAI na prática",
   "meta": "2 h 30 · prepara o módulo M1 do lab (GenAI foundations e prompting)",
   "goal": "Ao final você explica em dois minutos por que um modelo erra com segurança, escreve um prompt com estrutura e escolhe a técnica mais barata que resolve o problema."
  },
  {
   "part": 2,
   "title": "Do pedido ao problema",
   "meta": "1 h 45 · prepara o módulo M2 (problem framing e árvores de KPI)",
   "goal": "Transformar “dá pra resolver isso com IA?” em uma métrica, um baseline, uma meta e um escopo que o patrocinador assina."
  },
  {
   "part": 3,
   "title": "Valor e custo",
   "meta": "1 h 30 · prepara o módulo M3 (unit economics de IA e value case)",
   "goal": "Dizer, com número e premissa, se um caso vale o que custa para rodar, e saber por que ele pode morrer no G1 sem culpa de ninguém."
  },
  {
   "part": 4,
   "title": "Responsabilidade e decisão",
   "meta": "1 h 15 · prepara os módulos M7 (Responsible AI) e M10 (storytelling e pitch)",
   "goal": "Nomear quem responde quando o algoritmo erra e terminar uma apresentação com um pedido que o negócio consegue decidir."
  },
  {
   "part": 5,
   "title": "Exercício final",
   "meta": "1 h · seu case brief e a autoavaliação",
   "goal": "Juntar as quatro partes num case brief de uma página, sobre um problema real do seu trabalho, e medir como você se vê agora nas oito competências do lab."
  }
 ],
 "lessons": {
  "1.1": {
   "part": 1,
   "title": "Como um LLM gera texto",
   "min": 45,
   "body": [
    {
     "type": "p",
     "text": "Um LLM é treinado para prever o próximo token a partir de tudo o que veio antes. Token é um pedaço de texto: uma palavra, parte de uma palavra ou pontuação. Tudo no modelo se mede em tokens: o preço (entrada mais saída), a janela de contexto e o espaço que sobra para a resposta. Prompt maior custa mais e deixa menos espaço para responder."
    },
    {
     "type": "p",
     "text": "O modelo não consulta fatos: ele produz o texto mais provável. Por isso responde com segurança mesmo quando erra. É por isso que o lab exige um golden set e avaliação antes de qualquer solução ir adiante."
    }
   ],
   "exercise": {
    "label": "Fazer · 15 min",
    "text": "Peça a uma ferramenta de GenAI aprovada que resuma um texto público que você conhece bem. Confira três afirmações do resumo contra a fonte e anote quantas estavam corretas."
   },
   "refs": [
    {
     "title": "Understand tokens",
     "url": "https://learn.microsoft.com/dotnet/ai/conceptual/understanding-tokens",
     "note": "Microsoft Learn · inglês"
    },
    {
     "title": "How generative AI and LLMs work",
     "url": "https://learn.microsoft.com/dotnet/ai/conceptual/how-genai-and-llms-work",
     "note": "Microsoft Learn · inglês"
    },
    {
     "title": "AI fluency: Explore generative AI",
     "url": "https://learn.microsoft.com/training/modules/explore-generative-ai/",
     "note": "módulo opcional, nível iniciante · inglês"
    }
   ],
   "quizzes": [
    "m1_llm"
   ],
   "tool": false
  },
  "1.2": {
   "part": 1,
   "title": "Prompting que funciona",
   "min": 60,
   "body": [
    {
     "type": "p",
     "text": "Um prompt útil tem seis partes: papel, contexto, tarefa, formato da resposta, exemplos e uma saída de escape para quando o dado não existe. Seja específico e deixe pouco para interpretação. Few-shot significa colocar pares de entrada e saída no próprio prompt: o modelo não aprende de forma permanente, só fica condicionado àquela chamada. Depois, itere: teste, compare, ajuste."
    }
   ],
   "exercise": {
    "label": "Fazer · 30 min",
    "text": "Rode o prompt numa ferramenta aprovada com um texto seu que não seja confidencial. Rode duas versões, sem exemplo e com exemplo, e compare. Depois peça a mesma tarefa sem a saída de escape e veja se o modelo passa a inventar."
   },
   "refs": [
    {
     "title": "Prompt engineering techniques",
     "url": "https://learn.microsoft.com/azure/foundry/openai/concepts/prompt-engineering",
     "note": "Microsoft Learn · inglês"
    },
    {
     "title": "System message design",
     "url": "https://learn.microsoft.com/azure/foundry/openai/concepts/advanced-prompt-engineering",
     "note": "Microsoft Learn · inglês"
    }
   ],
   "quizzes": [
    "m1_prompt"
   ],
   "tool": true
  },
  "1.3": {
   "part": 1,
   "title": "Regra, ML, LLM ou agente?",
   "min": 45,
   "body": [
    {
     "type": "p",
     "text": "É a regra 4 do lab: a técnica mais barata que funciona. Regra e SQL antes de ML, ML antes de LLM, uma chamada de LLM antes de um agente. Escolher a técnica faz parte da nota, e o ADR do G2 precisa comparar pelo menos uma alternativa mais barata."
    },
    {
     "type": "ladder",
     "items": [
      {
       "label": "Regra",
       "cost": "$"
      },
      {
       "label": "ML",
       "cost": "$$"
      },
      {
       "label": "LLM",
       "cost": "$$$"
      },
      {
       "label": "Agente",
       "cost": "$$$$"
      }
     ]
    },
    {
     "type": "p",
     "text": "Um agente costuma chamar o modelo várias vezes por tarefa. Por isso o custo por transação, a unidade que o lab mede em toda solução, cresce com o número de chamadas."
    }
   ],
   "exercise": {
    "label": "Fazer · 10 min",
    "text": "Mude “chamadas por transação” para 6, como num agente que lê, converte e testa. Veja o que acontece com o custo por mês e anote em que ponto a técnica deixa de caber no valor do caso (você vai usar isso na parte 3)."
   },
   "refs": [],
   "quizzes": [
    "m1_tech"
   ],
   "tool": true
  },
  "2.1": {
   "part": 2,
   "title": "Anatomia de um pedido vago",
   "min": 30,
   "body": [
    {
     "type": "p",
     "text": "O pedido chega como desejo (“melhorar as vendas”) ou como solução (“quero um chatbot”). Nenhum dos dois entra no lab. Para passar do G0, o caso precisa de um patrocinador nomeado que reserva duas horas a cada duas semanas, uma métrica que dá para medir e um baseline."
    },
    {
     "type": "p",
     "text": "O case brief abre como narrativa: uma pessoa com nome ou papel, diante de uma decisão, com prazo. É esse formato que obriga a equipe a enxergar quem decide e quem sente o problema antes de pensar em modelo."
    }
   ],
   "exercise": {
    "label": "Fazer · 15 min",
    "text": "Reescreva um pedido real do seu trabalho em três frases: quem decide, o que dói hoje e até quando. Guarde o texto, ele alimenta o exercício final."
   },
   "refs": [],
   "quizzes": [
    "m2_mc"
   ],
   "tool": false
  },
  "2.2": {
   "part": 2,
   "title": "Métrica, baseline, meta e escopo",
   "min": 45,
   "body": [
    {
     "type": "p",
     "text": "Quatro peças que o patrocinador assina no G1. A métrica diz o que muda. O baseline diz onde você está hoje e como mediu. A meta diz que número torna o esforço válido. O escopo diz o que entra e o que fica de fora. Exemplo do caso “fechamento diário do caixa” (números ilustrativos):"
    },
    {
     "type": "table",
     "rows": [
      [
       "Métrica",
       "Horas para fechar o caixa do dia"
      ],
      [
       "Baseline",
       "4 horas, medidas em fechamentos reais de um mês, com a fonte da medição anotada"
      ],
      [
       "Meta",
       "Fechar em até 1 hora"
      ],
      [
       "Escopo",
       "Conciliação dos extratos do banco principal; fica de fora a conciliação intercompany"
      ]
     ]
    }
   ],
   "exercise": {
    "label": "Fazer · 15 min",
    "text": "Preencha as quatro peças para o pedido que você reescreveu em 2.1. Se não sabe o baseline, escreva como faria para medir em uma semana."
   },
   "refs": [],
   "quizzes": [
    "m2_class"
   ],
   "tool": false
  },
  "2.3": {
   "part": 2,
   "title": "Árvore de KPI",
   "min": 30,
   "body": [
    {
     "type": "p",
     "text": "A árvore de KPI quebra a métrica em fatores que se somam ou se multiplicam. Ela mostra em qual galho a IA mexe, e evita prometer ganho no galho errado. Exemplo para o tempo de preparo de um relatório semanal:"
    },
    {
     "type": "tree",
     "items": [
      {
       "text": "Tempo de preparo do relatório semanal",
       "ai": false,
       "children": [
        {
         "text": "Coletar os dados",
         "ai": false,
         "children": []
        },
        {
         "text": "Montar tabelas e gráficos",
         "ai": false,
         "children": []
        },
        {
         "text": "Escrever a análise do que mudou",
         "ai": true,
         "children": []
        },
        {
         "text": "Revisar e distribuir",
         "ai": false,
         "children": []
        }
       ]
      }
     ]
    }
   ],
   "exercise": {
    "label": "Fazer · 20 min",
    "text": "No papel ou num quadro, desenhe a árvore de um indicador do seu trabalho com dois níveis. Marque o galho em que a IA poderia atuar e escreva uma frase dizendo por que não nos outros."
   },
   "refs": [],
   "quizzes": [],
   "tool": false
  },
  "3.1": {
   "part": 3,
   "title": "Três tipos de valor",
   "min": 25,
   "body": [
    {
     "type": "p",
     "text": "A hipótese de valor do lab é de um destes tipos: receita, custo ou risco. Escolha um, escreva a premissa e diga quem confirma o número."
    },
    {
     "type": "table",
     "rows": [
      [
       "Receita",
       "As propostas saem em horas e não em dias, então mais propostas chegam ao cliente no prazo."
      ],
      [
       "Custo",
       "O fechamento do caixa cai de quatro horas para uma, então essas horas voltam para trabalho de maior valor."
      ],
      [
       "Risco",
       "Incidentes de dados são detectados antes de o cliente reclamar, então diminui a exposição contratual."
      ]
     ]
    }
   ],
   "exercise": null,
   "refs": [],
   "quizzes": [
    "m3_types"
   ],
   "tool": false
  },
  "3.2": {
   "part": 3,
   "title": "Custo de build e custo de run",
   "min": 25,
   "body": [
    {
     "type": "p",
     "text": "Build é o esforço de construir: horas do time e do patrocinador. Run é o que se paga todo ano para manter: tokens, infraestrutura, monitoramento e a revisão humana. O custo por transação, que você calculou em 1.3, liga as duas pontas."
    },
    {
     "type": "p",
     "text": "No G1, o patrocinador assina a métrica, o baseline e a hipótese de valor, e o valor anual precisa exceder três vezes o custo anual estimado de run. A regra é deliberada: ela mata cedo o caso fraco, e aprender a parar um caso no G1 é uma habilidade de negócio."
    }
   ],
   "exercise": null,
   "refs": [],
   "quizzes": [
    "m3_g1"
   ],
   "tool": false
  },
  "3.3": {
   "part": 3,
   "title": "Calculadora: o caso passa no G1?",
   "min": 40,
   "body": [
    {
     "type": "p",
     "text": "Altere os números e veja quando o caso passa. Os valores iniciais são um exemplo; troque pelos do seu caso. O custo da hora da equipe é um dado que você traz: o lab ainda precisa definir o custo horário carregado."
    }
   ],
   "exercise": {
    "label": "Fazer · 15 min",
    "text": "Tente fazer o caso passar de duas formas diferentes: reduzindo o custo de run e aumentando a adoção. Anote qual das duas é mais realista e por quê. É essa conversa que o patrocinador vai ter com você no G1."
   },
   "refs": [],
   "quizzes": [
    "m3_adopt"
   ],
   "tool": true
  },
  "4.1": {
   "part": 4,
   "title": "Quem responde pelo erro",
   "min": 30,
   "body": [
    {
     "type": "p",
     "text": "O lab parte de um princípio do FAT/ML: uma pessoa nomeada é sempre responsável por qualquer decisão tomada ou informada por um algoritmo. “O algoritmo fez” nunca é resposta aceitável. Cada squad mantém uma Social Impact Statement com cinco princípios: Responsabilidade (Responsibility), Explicabilidade (Explainability), Acurácia (Accuracy), Auditabilidade (Auditability) e Equidade (Fairness)."
    },
    {
     "type": "p",
     "text": "A Microsoft organiza o tema em seis princípios próprios: justiça, confiabilidade e segurança, privacidade e segurança, inclusão, transparência e responsabilização. Os dois conjuntos se complementam, e você vai encontrar os dois na Azure."
    }
   ],
   "exercise": {
    "label": "Fazer · 15 min",
    "text": "Para o caso “triagem de qualidade de dados” (o time só descobre pipelines quebrados quando o cliente reclama), escreva: quem é a pessoa afetada, qual é o erro mais caro (falso positivo ou falso negativo) e quem responde por ele."
   },
   "refs": [
    {
     "title": "What is Responsible AI?",
     "url": "https://learn.microsoft.com/azure/machine-learning/concept-responsible-ai",
     "note": "Microsoft Learn · inglês"
    },
    {
     "title": "Apply responsible AI",
     "url": "https://learn.microsoft.com/agents/center-of-excellence/responsible-ai",
     "note": "Microsoft Learn · inglês"
    }
   ],
   "quizzes": [
    "m4_rai"
   ],
   "tool": false
  },
  "4.2": {
   "part": 4,
   "title": "Um pitch de 10 minutos que termina em decisão",
   "min": 45,
   "body": [
    {
     "type": "p",
     "text": "No demo day, o painel executivo nota quatro coisas: clareza do problema e do valor, credibilidade da solução e das evidências, risco e custo sob controle, e a qualidade do pedido final. O pitch tem seis partes:"
    },
    {
     "type": "pitch",
     "label": "Seis partes do pitch: problema, 1 minuto; métrica e valor, 1; opções, 1; demo ao vivo, 3; avaliação, riscos e custo, 2; o pedido, 2",
     "items": [
      {
       "min": 1,
       "time": "1 min",
       "text": "O problema e o custo de hoje",
       "demo": false
      },
      {
       "min": 1,
       "time": "1 min",
       "text": "Métrica e valor",
       "demo": false
      },
      {
       "min": 1,
       "time": "1 min",
       "text": "Opções",
       "demo": false
      },
      {
       "min": 3,
       "time": "3 min",
       "text": "Demo ao vivo",
       "demo": true
      },
      {
       "min": 2,
       "time": "2 min",
       "text": "Avaliação, risco, custo",
       "demo": false
      },
      {
       "min": 2,
       "time": "2 min",
       "text": "O pedido",
       "demo": false
      }
     ]
    },
    {
     "type": "p",
     "text": "O pedido tem sempre uma de três formas: escalar, iterar ou matar. Matar é um resultado legítimo. O que não vale é terminar sem pedir nada."
    }
   ],
   "exercise": {
    "label": "Fazer · 25 min",
    "text": "Pense em um projeto que você apresentou ou vai apresentar. Escreva o pedido final em uma frase com decisão, prazo e o que é preciso. Leia em voz alta: se o ouvinte não sabe o que fazer depois, reescreva."
   },
   "refs": [],
   "quizzes": [],
   "tool": true
  },
  "5.1": {
   "part": 5,
   "title": "Seu case brief",
   "min": 40,
   "body": [
    {
     "type": "p",
     "text": "É o mesmo formato que o patrocinador preenche no G0. Use um problema real, descrito sem dado de cliente nem dado pessoal. Se faltar um número, escreva como você o mediria."
    }
   ],
   "exercise": null,
   "refs": [],
   "quizzes": [],
   "tool": true
  },
  "5.2": {
   "part": 5,
   "title": "Autoavaliação e fechamento",
   "min": 20,
   "body": [
    {
     "type": "p",
     "text": "Marque de 1 a 4 como você se vê hoje em cada competência: 1 Aware, 2 Developing, 3 Practitioner, 4 Lead. Esta é uma autoavaliação preliminar. O diagnóstico oficial acontece na semana 0 e é ele que define sua rota."
    }
   ],
   "exercise": null,
   "refs": [],
   "quizzes": [],
   "tool": true
  }
 },
 "templates": {
  "A": {
   "title": "Case brief",
   "when": "o patrocinador preenche, uma página",
   "intro": "O brief abre o caso como uma pequena narrativa: uma pessoa, uma decisão e um prazo. Troque cada campo pendente pelo texto real; se faltar um número, escreva como você o mediria.",
   "sections": [
    {
     "heading": "Identificação",
     "fields": [
      {
       "label": "Caso",
       "optional": false
      },
      {
       "label": "Patrocinador (nome ou papel)",
       "optional": false
      },
      {
       "label": "Data",
       "optional": false
      }
     ]
    },
    {
     "heading": "O requisito, nas palavras do patrocinador",
     "fields": [
      {
       "label": "O que dói hoje, para quem e com que frequência",
       "optional": false
      }
     ]
    },
    {
     "heading": "Métrica e baseline",
     "fields": [
      {
       "label": "Métrica",
       "optional": false
      },
      {
       "label": "Baseline hoje (número e como foi medido)",
       "optional": false
      },
      {
       "label": "Meta que tornaria isso válido",
       "optional": false
      }
     ]
    },
    {
     "heading": "Hipótese de valor",
     "fields": [
      {
       "label": "Tipo (receita, custo ou risco)",
       "optional": false
      },
      {
       "label": "Valor anual aproximado e a premissa",
       "optional": false
      }
     ]
    },
    {
     "heading": "Dados",
     "fields": [
      {
       "label": "Fontes",
       "optional": false
      },
      {
       "label": "Acesso em 5 dias úteis? (sim, não ou sintético)",
       "optional": false
      },
      {
       "label": "Dados sensíveis?",
       "optional": false
      }
     ]
    },
    {
     "heading": "Restrições",
     "fields": [
      {
       "label": "Sistemas, regulação e ferramentas dos usuários",
       "optional": false
      }
     ]
    },
    {
     "heading": "Compromisso do patrocinador",
     "fields": [
      {
       "label": "Assinatura (nome e data)",
       "optional": false
      }
     ]
    }
   ]
  },
  "B": {
   "title": "Architecture Decision Record",
   "when": "a squad preenche no G2",
   "intro": "A decisão compara pelo menos duas opções e justifica por que a mais barata que funciona venceu. A opção 3 é opcional.",
   "sections": [
    {
     "heading": "Identificação",
     "fields": [
      {
       "label": "Título",
       "optional": false
      },
      {
       "label": "Status (proposta ou aprovada)",
       "optional": false
      }
     ]
    },
    {
     "heading": "Contexto",
     "fields": [
      {
       "label": "O problema, os dados e as restrições que pesam na escolha",
       "optional": false
      }
     ]
    },
    {
     "heading": "Opção 1",
     "fields": [
      {
       "label": "Custo, qualidade esperada e risco",
       "optional": false
      }
     ]
    },
    {
     "heading": "Opção 2",
     "fields": [
      {
       "label": "Custo, qualidade esperada e risco",
       "optional": false
      }
     ]
    },
    {
     "heading": "Opção 3",
     "fields": [
      {
       "label": "Custo, qualidade esperada e risco",
       "optional": true
      }
     ]
    },
    {
     "heading": "Decisão",
     "fields": [
      {
       "label": "A opção escolhida e o motivo",
       "optional": false
      }
     ]
    },
    {
     "heading": "Consequências",
     "fields": [
      {
       "label": "Custo por transação de run",
       "optional": false
      },
      {
       "label": "Limiar de qualidade para o G3",
       "optional": false
      },
      {
       "label": "Riscos de IA responsável e mitigações",
       "optional": false
      }
     ]
    }
   ]
  },
  "C": {
   "title": "Pitch do demo day (10 minutos) e placar do painel executivo",
   "when": "",
   "intro": "O pitch termina com um pedido que o negócio consegue decidir: escalar, iterar ou encerrar.",
   "sections": [
    {
     "heading": "Roteiro",
     "fields": [
      {
       "label": "O problema e o custo de hoje (1 min)",
       "optional": false
      },
      {
       "label": "A métrica e o valor assinado no G1 (1 min)",
       "optional": false
      },
      {
       "label": "As opções consideradas e por que esta (1 min)",
       "optional": false
      },
      {
       "label": "Demo ao vivo em um cenário real (3 min)",
       "optional": false
      },
      {
       "label": "Avaliação, riscos e custo por transação (2 min)",
       "optional": false
      },
      {
       "label": "O pedido: escalar, iterar ou encerrar, e o que é preciso (2 min)",
       "optional": false
      }
     ]
    }
   ]
  },
  "D": {
   "title": "Social Impact Statement",
   "when": "a squad preenche no G2, no G3 e na revisão de 90 dias",
   "intro": "Cinco princípios: responsabilidade, explicabilidade, acurácia, auditabilidade e equidade. Uma pessoa nomeada responde por qualquer decisão tomada ou informada pelo algoritmo; \"o algoritmo fez\" nunca é resposta aceitável.",
   "sections": [
    {
     "heading": "Revisão no G2 (design)",
     "fields": [
      {
       "label": "Responsável nomeado (nome e papel)",
       "optional": false
      },
      {
       "label": "Partes afetadas e grupos que podem ser favorecidos ou prejudicados",
       "optional": false
      },
      {
       "label": "Plano de explicabilidade, em palavras simples",
       "optional": false
      }
     ]
    },
    {
     "heading": "Revisão no G3 (pré-lançamento)",
     "fields": [
      {
       "label": "Taxas de erro por subgrupo relevante (falso positivo e falso negativo)",
       "optional": false
      },
      {
       "label": "Checagem manual de uma amostra aleatória dos dados",
       "optional": false
      },
      {
       "label": "Pior caso realista e quem ele atinge",
       "optional": false
      }
     ]
    },
    {
     "heading": "Revisão de 90 dias (pós-lançamento)",
     "fields": [
      {
       "label": "Canal de recurso testado",
       "optional": false
      },
      {
       "label": "Resultados do monitoramento",
       "optional": false
      },
      {
       "label": "Plano de desativação",
       "optional": false
      }
     ]
    }
   ]
  },
  "E": {
   "title": "Cartão da audiência de partes interessadas",
   "when": "etapa Discover, semana 2, 45 minutos",
   "intro": "Vozes em conflito são ouvidas antes de qualquer solução. Cada assento argumenta a sua preocupação e a squad responde.",
   "sections": [
    {
     "heading": "Patrocinador do negócio (velocidade e valor)",
     "fields": [
      {
       "label": "Principal preocupação",
       "optional": false
      },
      {
       "label": "Resposta da squad",
       "optional": false
      }
     ]
    },
    {
     "heading": "Usuário final (carga de trabalho e confiança)",
     "fields": [
      {
       "label": "Principal preocupação",
       "optional": false
      },
      {
       "label": "Resposta da squad",
       "optional": false
      }
     ]
    },
    {
     "heading": "Parte afetada (quem arca com o erro)",
     "fields": [
      {
       "label": "Principal preocupação",
       "optional": false
      },
      {
       "label": "Resposta da squad",
       "optional": false
      }
     ]
    },
    {
     "heading": "Compliance e risco (lei, política e proteção de dados)",
     "fields": [
      {
       "label": "Principal preocupação",
       "optional": false
      },
      {
       "label": "Resposta da squad",
       "optional": false
      }
     ]
    },
    {
     "heading": "Operações de TI (custo de run e suporte)",
     "fields": [
      {
       "label": "Principal preocupação",
       "optional": false
      },
      {
       "label": "Resposta da squad",
       "optional": false
      }
     ]
    },
    {
     "heading": "Preocupações que seguem em aberto",
     "fields": [
      {
       "label": "Viram entradas no registro de trade-offs do ADR e no Social Impact Statement",
       "optional": false
      }
     ]
    }
   ]
  }
 }
};
