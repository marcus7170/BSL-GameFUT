// Estado do jogo atualizado
let player = {
    age: 16,
    overall: 65,
    club: 'BSL Team',
    balance: 10000,
    marketValue: 10000000,
    morale: 80,
    form: 75,
    clubs: ['BSL Team'],
    achievements: [],
    form: 75,
    morale: 80,
    goals: 0,
    assists: 0,
    injuries: [],
    titles: [],
    history: [],
    seasonalStats: { goals: 0, assists: 0 }
};

let progressionData = {
    age: [16], 
    overall: [65],
    marketValue: [10000000],
    balance: [10000],
    morale: [80],
    form: [75]
};

let progressChart;

// Calcular o valor de mercado
function updateMarketValue() {
    const MAX_VALUE     = 200_000_000; // over 100 + idade ideal
    const MIN_VALUE     = 10_000;
    const OVERALL_EXP   = 7;           // controla a curvatura do impact do overall
    const AGE_DECLINE1  = 0.7;         // quanto declina até os 30 anos
    const AGE_DECLINE2  = 0.2;         // declínio extra até os 40 anos

    // 1) Impacto do overall (exponencial para derrubar os médios)
    const overallFactor = Math.pow(player.overall / 100, OVERALL_EXP);
    //   • overall 70 → 0.7^7 ≈ 0.082 → raw cap ≈ 16 M  
    //   • overall 80 → 0.8^7 ≈ 0.210 → raw cap ≈ 42 M  

    // 2) Impacto da idade (declínio suave e contínuo)
    let ageFactor;
    if (player.age <= 18) {
        ageFactor = 1;
    } else if (player.age <= 30) {
        // declina LINEARMENTE até 30, perdendo AGE_DECLINE1 (70% do valor)
        ageFactor = 1 - ((player.age - 18) / (30 - 18)) * AGE_DECLINE1;
    } else {
        // de 30 a 40 anos perde mais AGE_DECLINE2 (20% do valor)
        ageFactor = (1 - AGE_DECLINE1) - ((player.age - 30) / (40 - 30)) * AGE_DECLINE2;
    }
    // garante que nunca vá abaixo de 10% nem acima de 100%
    ageFactor = Math.min(1, Math.max(0.1, ageFactor));

    // 3) Impacto da forma: ±20% a partir de 50
    let formFactor = 1 + ((player.form - 50) / 50) * 0.2;
    // forma=100 → +20%; forma=0 → -20%

    // 4) Boost de conquistas: +5% por conquista
    const achievementBoost = 1 + player.achievements.length * 0.05;

    // 5) Cálculo final
    const rawValue = MAX_VALUE * overallFactor * ageFactor;
    player.marketValue = Math.round(
        Math.max(MIN_VALUE, rawValue * formFactor * achievementBoost)
    );
}

function calculateGoalChance(overall) {
    // Probabilidade de gol por partida:
    // • Até 50 de over → 2% a 5% (jogadores muito fracos raramente marcam)
    // • 50–70 → sobe de 5% a 15%
    // • 70–90 → sobe de 15% a 25%
    // • 90–100 → sobe de 25% a 35%
    if (overall < 50) {
      return 0.01 + (overall / 50) * 0.03;        // 0.02→0.05
    } else if (overall < 70) {
      return 0.02 + ((overall - 50) / 20) * 0.04; // 0.05→0.15
    } else if (overall < 90) {
      return 0.03 + ((overall - 70) / 20) * 0.04; // 0.15→0.25
    } else {
      return 0.05 + ((overall - 90) / 10) * 0.06; // 0.25→0.35
    }
  }
  
  function calculateAssistChance(overall) {
    // Probabilidade de assistência por partida:
    // • Até 50 → 1% a 3%
    // • 50–70 → 3% a 8%
    // • 70–90 → 8% a 15%
    // • 90–100 → 15% a 25%
    if (overall < 50) {
      return 0.01 + (overall / 50) * 0.02;        // 0.01→0.03
    } else if (overall < 70) {
      return 0.02 + ((overall - 50) / 20) * 0.03; // 0.03→0.08
    } else if (overall < 90) {
      return 0.03 + ((overall - 70) / 20) * 0.04; // 0.08→0.15
    } else {
      return 0.04 + ((overall - 90) / 10) * 0.05; // 0.15→0.25
    }
  }
  

function updateMatchStats() {
    document.getElementById('goals').textContent = player.goals;
    document.getElementById('assists').textContent = player.assists;
    document.getElementById('form').textContent = Math.round(player.form);
    document.getElementById('morale').textContent = Math.round(player.morale);
}

function checkChampionshipTitle() {
    const currentLeague = league.currentView === 'A' ? league.serieA : league.serieB;
    const position = currentLeague.standings.findIndex(t => t.name === player.club) + 1;
    
    if (position === 1) {
        const titleName = `Campeão Série ${league.currentView} - Temporada ${league.season}`;
        if (!player.titles.includes(titleName)) {
            player.titles.push(titleName);
            updateTrophyCase();
        }
    }
}

function updateTrophyCase() {
    const container = document.getElementById('titles-list');
    const titlesCount = player.titles.filter(t => t.includes("Campeão")).length;
    const goldenBoots = player.achievements.filter(a => a.includes("Artilheiro")).length;
    const assistLeads = player.achievements.filter(a => a.includes("Assistências")).length;
    const mvps = player.achievements.filter(a => a.includes("Melhor Jogador")).length;

    document.getElementById('titles-count').textContent = titlesCount;
    document.getElementById('top-scorer').textContent = goldenBoots;
    document.getElementById('top-assists').textContent = assistLeads;
    document.getElementById('mvp-count').textContent = mvps;
    container.innerHTML = '';
    
    // Combinar títulos e conquistas com ícones diferentes
    const allAchievements = [
        ...player.titles.map(title => ({ text: title, icon: '🏆' })), 
        ...player.achievements.map(ach => ({ 
            text: ach, 
            icon: ach.includes('Puskas') ? '⭐' : 
                  ach.includes('Artilheiro') ? '⚽' :
                  ach.includes('Assist') ? '🎯' : '🌟' 
        }))
    ];

    allAchievements.forEach(achievement => {
        const div = document.createElement('div');
        div.className = 'title-item';
        div.innerHTML = `
            <span>${achievement.icon}</span>
            <div>${achievement.text}</div>
        `;
        container.appendChild(div);
    });
}


function addHistoryEvent(text) {
    const season = league.season;
    const event = {
        text: `T${season}: ${text}`,
        date: season
    };
    player.history.unshift(event);
    updateEventHistory();
}

function updateEventHistory() {
    const container = document.getElementById('events-list');
    container.innerHTML = '';
    
    player.history.forEach(event => {
        const div = document.createElement('div');
        div.className = 'event-item';
        div.innerHTML = `
            <span>📅</span>
            <div>${event.text}</div>
        `;
        container.appendChild(div);
    });
}




// Eventos de História
const storyEvents = [
    {
      age: 18,
      messages: [
        "Dois anos de profissionalismo bateram à porta e te levaram para uma rotina intensa: manhãs de treino técnico sob sol escaldante, tardes de musculação e sessões de fisioterapia para superar as primeiras lesões que testaram sua determinação.",
        "Entre viagens e mudanças de clube, você aprendeu que ser jogador não é apenas talento, mas disciplina: ajustes na dieta, estudo tático de adversários e controle emocional nas entrevistas tornaram-se parte do seu dia a dia.",
        "A convivência com veteranos ensinou que resiliência faz diferença: cada momento de crise no vestiário virou lição, forjando um caráter pronto para os altos e baixos da carreira."  
      ]
    },
    {
      age: 21,
      messages: [
        "O casamento trouxe uma nova dimensão à sua vida: além de esquemas táticos, agora você equilibra planejamento financeiro familiar, divisão de tarefas em casa e a responsabilidade de ser exemplo para quem ama.",
        "Os treinos ganharam um propósito extra: nos momentos de dificuldades em campo, a força do vínculo conjugal surgiu como abrigo, lembrando que vitória também se constrói com apoio emocional.",
        "As primeiras manhãs acordando ao lado do cônjuge antes de partir para os aeroportos reforçaram que, fora do gramado, o amor é seu combustível mais poderoso."  
      ]
    },
    {
      age: 23,
      messages: [
        "Determinado a alcançar o auge, você traçou um plano de cinco anos: aprimorar finalização com treinos específicos três vezes por semana, contratar um mentor de mindset esportivo e contratar um nutricionista para otimizar a performance.",
        "Sessões de vídeo-analise viraram rotina: estudar posicionamento de atacantes de elite, entender as fraquezas das defesas rivais e adaptar seu estilo para se tornar imprevisível.",
        "A cada amistoso de pré-temporada, a confiança crescia: gols de cobertura e assistências milimétricas mostraram que a escalada rumo ao topo está bem viva em cada gota de suor."  
      ]
    },
    {
      age: 28,
      messages: [
        "No ápice da carreira, você revisita os sacrifícios: noites em claro revendo partidas, dietas restritivas que forçaram a renunciar prazeres e a famigerada fisioterapia diária para manter o corpo afiado.",
        "As amizades construídas nos gramados parceiros de quarto em excursões e confidentes no vestiário viraram irmãos forjados em conquistas como títulos nacionais e disputas continentais.",
        "Cada taça erguida e cada placa de ‘jogador do jogo’ confirmam que cada treinamento doloroso valeu a pena, transformando suor em glória e lendas em realidade."  
      ]
    },
    {
      age: 30,
      messages: [
        "Aos 30, o corpo começa a sinalizar: aceleração já não é seu ponto forte, e pequenos incômodos musculares surgem após jogos intensos, exigindo atenção redobrada em recuperação.",
        "Você incorporou técnicas avançadas de regeneração: crioterapia, sessões de pilates e acompanhamento de um preparador físico especializado em atletas experientes.",
        "Apesar da leve queda na explosão, a visão de jogo e o posicionamento compensam sua inteligência tática faz você ditar o ritmo da partida e servir passes que só olhos treinados percebem."  
      ]
    },
    {
      age: 33,
      messages: [
        "A transição para centroavante fixo exigiu redefinir seus atributos: foco em trabalho de força para segurar zagueiros, aprimoramento de jogo aéreo e estudo de rotas de infiltração na área.",
        "Inspirado pelo CR7, você adotou uma rotina de treinos de finalização de precisão e exercícios de pliometria para manter a potência do salto, buscando cada vez mais gols decisivos.",
        "O legado passou a ser certeza: não apenas pelos números, mas pela influência que você exerce em jovens atacantes, ensinando que dedicação permanente é o que faz um ídolo durar."  
      ]
    },
    {
      age: 38,
      messages: [
        "Com o filho prestes a completar 15 anos, você se vê não só como atleta, mas como mentor: dedica parte dos treinos a ensinar fundamentos de técnica, disciplina de treino e postura ética.",
        "As conversas de pai e filho agora incluem análises táticas antes de dormir, enquanto o garoto anota tudo em um caderno para um dia brilhar nos campos.",
        "Ver sua própria herança no talento e na determinação dele transforma cada lance compartilhado em campo em um momento de profundo orgulho e propósito renovado."  
      ]
    },
    {
      age: 40,
      messages: [
        "Na primeira temporada ao lado do seu filho, cada partida se converte em uma celebração familiar: vocês combinam jogadas treinadas e comemoram os gols abraçados, emocionando a torcida.",
        "Dentro de campo, sua experiência orienta os passos dele: instruções em tempo real, proteções táticas e incentivo para que ele arrisque dribles e finalizações, é uma emoção a parte cada partida ao lado de seu filho.",
        "Fora de campo, entrevistas coletivas se tornam histórias de legado e emoção, mostrando ao mundo que futebol é paixão que atravessa gerações, é uma emoção a parte cada partida ao lado de seu filho."  
      ]
    },
    {
      age: 41,
      messages: [
        "No segundo ano juntos, o talento do seu filho atrai o interesse do clube dos sonhos dele: você celebra a notícia com lágrimas de alegria e consciência de que chegou a hora de soltá-lo.",
        "O último jogo com a camisa do time atual de seu filho, é um misto de festa e nostalgia você se esforça para abrir espaço e criar oportunidades, enquanto cada passe lembra a jornada compartilhada.",
        "Agora, como jogador, pai e mentor à distância, você acompanha a nova fase de seu filho que está a mudar de clube, certo de que o legado que semeou florescerá em novos gramados."  
      ]
    },
    {
      age: 42,
      messages: [
        "Aos 42, chega a hora de virar a página, empresas lhe convidam para continuar no meio esportivo. Porem, Se você se sentir imortal, poderá continuar jogando pelo infinito.",
        "Emocionado, agradece por cada chute, cada taça e cada torcida que aplaudiu seu nome, e convida a próxima geração a escrever novos capítulos dessa história. Porem, Se você se sentir imortal, poderá continuar jogando pelo infinito.",
        "A aposentadoria é apenas um ponto de virada, Agora é o momento se acompanhar seu filho, e ser um grande torcedor. Porem, Se você se sentir imortal, poderá continuar jogando pelo infinito."  
      ]
    }
  ];
  

  function checkStoryEvents() {
    const currentAge = Math.floor(player.age);
    const event = storyEvents.find(e => e.age === currentAge && !e.triggered);
    
    if(event) {
      event.triggered = true;
      const randomMessage = event.messages[Math.floor(Math.random() * event.messages.length)];
      
      showStoryEvent({
        title: `Jornada aos ${currentAge} Anos`,
        text: randomMessage,
        icon: getEventIcon(currentAge),
        age: currentAge // ← Adicione esta linha
      });
    }
  }
  
  function getEventIcon(age) {
    const icons = {
      18: '🎯',
      21: '💍',
      23: '🚀',
      28: '🏆',
      30: '⌛',
      33: '🔄',
      38: '👨👦',
      40: '👨👧',
      41: '👋',
      42: '🌟'
    };
    return icons[age] || '📖';
  }
  
  function showStoryEvent(event) {
    const modal = document.getElementById('story-modal');
    const img = document.getElementById('story-image');
    const titleElement = document.getElementById('story-title');
    const textElement = document.getElementById('story-text');
    const choicesElement = document.getElementById('story-choices');
    toggleMusic(false);

    // Mapeamento de imagens por idade
    const ageImages = {
        18: 'img/story/age18.jpg',
        21: 'img/story/wedding.jpg',
        23: 'img/story/planning.jpg',
        28: 'img/story/peak.jpg', 
        30: 'img/story/decline.jpg',
        33: 'img/story/transition.jpg',
        38: 'img/story/mentor.jpg',
        40: 'img/story/family.jpg',
        41: 'img/story/family2.jpg',
        42: 'img/story/retirement.jpg'
    };

    // Carregar imagem correspondente
    img.src = ageImages[event.age] || 'img/story/default.jpg';
    img.alt = `Ilustração para evento aos ${event.age} anos`;

    // Configurar conteúdo
    titleElement.innerHTML = `
        <span class="story-icon">${event.icon}</span>
        ${event.title}
    `;
    textElement.textContent = event.text;

    // Configurar botão
    choicesElement.innerHTML = `
        <button class="choice-button story-choice" 
                onclick="document.getElementById('story-modal').classList.add('hidden');
                         toggleMusic(false);
                         updateDashboard();
                         updateChart();">
            ${event.age === 42 ? 'Encerrar Carreira' : 'Continuar Jornada'}
        </button>
    `;

    // Exibir modal
    modal.classList.remove('hidden');

    // Adicionar efeito de áudio opcional
    if(event.age === 28) new Audio('sound/fanfare.mp3').play();
    if(event.age === 42) new Audio('sound/end.mp3').play();
}



























const sportsBrands = ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance'];


const events = [
    {
        title: "Lesão no Treino!",
        text: "Você sofreu uma lesão durante o treino!",
        choices: [
            {
                text: "Tratamento caro (€20.000)",
                action: () => {
                    player.balance -= 20000;
                    const injuryImpact = -Math.floor(Math.random() * 3 + 1);
                    player.overall = Math.max(40, player.overall + injuryImpact);
                    showMessage(`Recuperação completa! Overall reduzido em ${Math.abs(injuryImpact)}`);
                },
                tooltip: "Recuperação rápida com menos impacto"
            },
            {
                text: "Descansar naturalmente",
                action: () => {
                    const injuryImpact = -Math.floor(Math.random() * 8 + 3);
                    player.overall = Math.max(40, player.overall + injuryImpact);
                    player.form -= 15;
                    showMessage(`Lesão grave! Overall -${Math.abs(injuryImpact)}, Forma -15`);
                },
                tooltip: "Risco de grande perda de performance"
            }
        ]
    },
    {
        title: "Patrocínio Esportivo!",
        text: "Uma marca quer te patrocinar!",
        choices: [
            {
                text: "Assinar com marca de energia",
                action: () => {
                    player.balance += 30000;
                    player.morale = Math.min(100, player.morale + 5);
                    addHistoryEvent('Assinou patrocínio energético e ganhou €30k');
                    showMessage("Você ganhou €30k e +5 de moral!");
                },
                tooltip: "+€30k, +5 Moral"
            },
            {
                text: "Assinar com marca esportiva",
                action: () => {
                    player.overall = Math.min(100, player.overall + 2);
                    showMessage("Equipamento profissional! +2 Overall");
                    const randomBrand = sportsBrands[Math.floor(Math.random() * sportsBrands.length)];
                    addHistoryEvent(`Assinou com a ${randomBrand}!`);
                },
                tooltip: "+2 Overall"
            }
        ]
    },
    {
        title: "Conflito no Vestuário!",
        text: "Desentendimento com companheiros de equipe!",
        choices: [
            {
                text: "Mediar o conflito",
                action: () => {
                    player.morale += 10;
                    player.form -= 5;
                    showMessage("Você melhorou o ambiente! Moral +10, Forma -5");
                },
                tooltip: "Foco em trabalho em equipe"
            },
            {
                text: "Ignorar a situação",
                action: () => {
                    player.morale -= 15;
                    showMessage("Ambiente contaminado! Moral -15");
                },
                tooltip: "Risco de queda no desempenho"
            }
        ]
    },
    {
        title: "Maratona de Jogos!",
        text: "Sequência intensa de partidas no calendário!",
        choices: [
            {
                text: "Treinar intensamente",
                action: () => {
                    player.form -= 10;
                    player.overall += 3;
                    showMessage("Desgaste físico! Forma -10, Overall +3");
                },
                tooltip: "Ganho de experiência com custo"
            },
            {
                text: "Preservar energia",
                action: () => {
                    player.form += 15;
                    player.morale -= 5;
                    showMessage("Conservou energia! Forma +15, Moral -5");
                },
                tooltip: "Equilíbrio conservador"
            }
        ]
    },
    {
        title: "Convocação para Seleção!",
        text: "Você foi convocado para um amistoso da seleção nacional!",
        choices: [
          {
            text: "Aceitar convocação",
            action: () => {
              player.morale = Math.min(100, player.morale + 15);
              player.overall = Math.min(100, player.overall + 4);
              showMessage("Orgulho nacional! Moral +15, Overall +4");
              addHistoryEvent('Orgulho nacional! Jogou pela Seleção');
            },
            tooltip: "+15 Moral, +4 Overall"
          },
          {
            text: "Recusar e descansar",
            action: () => {
              player.form = Math.min(100, player.form + 20);
              showMessage("Descanso bem-vindo! Forma +20");
            },
            tooltip: "+20 Forma"
          }
        ]
    },
    {
      title: "Puskas",
      text: "Você está entre os finalistas do prêmio de Puskas do ano!",
      choices: [
        {
          text: "Comparecer à premiação",
          action: () => {
            if (Math.random() < 0.3) {
                player.overall += 5;
                const title = `Prêmio Puskas - T${league.season}`;
                if(!player.achievements.includes(title)) {
                    player.achievements.push(title);
                    addHistoryEvent(title);
                }
                showMessage("Você venceu! Overall +5");
            } else {
              showMessage("Não levou o prêmio, mas fez bonito.");
            }
          },
          tooltip: "Chance de ganhar +5 Overall"
        },
        {
          text: "Ficar em casa",
          action: () => {
            player.morale -= 15;
            showMessage("Perdeu visibilidade! Moral -15");
          },
          tooltip: "-15 Moral"
        }
      ]
    },
    {
      title: "Rumores de Transferência",
      text: "Jornais falam que um grande clube te quer.",
      choices: [
        {
          text: "Falar com o empresário",
          action: () => {
            player.morale += 5;
            showMessage("Moral alta com rumores! +5 Moral");
          },
          tooltip: "+5 Moral"
        },
        {
          text: "Ignorar rumores",
          action: () => {
            player.morale -= 5;
            showMessage("Você parece distante. Moral -5");
          },
          tooltip: "-5 Moral"
        }
      ]
    },
    {
      title: "Punição por Cartões",
      text: "Você recebeu um cartão vermelho injusto!",
      choices: [
        {
          text: "Apelar ao tribunal esportivo",
          action: () => {
            if (Math.random() < 0.5) {
              showMessage("Cartão anulado!");
            } else {
              player.form -= 5;
              showMessage("Apelação negada. Forma -5");
            }
          },
          tooltip: "50% chance de anular"
        },
        {
          text: "Cumprir suspensão",
          action: () => {
            player.form -= 10;
            showMessage("Perdeu ritmo. Forma -10");
          },
          tooltip: "-10 Forma"
        }
      ]
    },
    {
      title: "Sondagem de Jovens Talentos",
      text: "O clube te convida para ajudar a avaliar juniores.",
      choices: [
        {
          text: "Aceitar convite",
          action: () => {
            player.morale += 8;
            showMessage("Mentoria gratificante! Moral +8");
          },
          tooltip: "+8 Moral"
        },
        {
          text: "Recusar",
          action: () => {
            player.morale -= 3;
            showMessage("Perdeu chance de networking. Moral -3");
          },
          tooltip: "-3 Moral"
        }
      ]
    },
    {
      title: "Violência de Torcida",
      text: "Houve confusão entre torcidas após o jogo!",
      choices: [
        {
          text: "Defender a equipe",
          action: () => {
            player.morale += 10;
            showMessage("Você se posicionou e subiu moral! +10 Moral");
          },
          tooltip: "+10 Moral"
        },
        {
          text: "Ficar alheio",
          action: () => {
            player.morale -= 10;
            showMessage("Ficou mal-visto. Moral -10");
          },
          tooltip: "-10 Moral"
        }
      ]
    },
    {
      title: "Erro de Arbitragem",
      text: "Um gol foi anulado por impedimento duvidoso.",
      choices: [
        {
          text: "Reclamar",
          action: () => {
            player.morale -= 5;
            showMessage("Foco perdido. Moral -5");
          },
          tooltip: "-5 Moral"
        },
        {
          text: "Continuar concentrado",
          action: () => {
            player.form += 5;
            showMessage("Mente no jogo. Forma +5");
          },
          tooltip: "+5 Forma"
        }
      ]
    },
    {
      title: "Oferta de Embaixador",
      text: "Patrocinador quer você como embaixador de marca.",
      choices: [
        {
          text: "Assinar contrato",
          action: () => {
            player.balance += 50000;
            showMessage("€50k por divulgar a marca!");
          },
          tooltip: "+€50k"
        },
        {
          text: "Negociar valores",
          action: () => {
            player.balance += 70000;
            player.morale += 5;
            showMessage("Melhor negócio! +€70k, +5 Moral");
          },
          tooltip: "+€70k, +5 Moral"
        }
      ]
    },
    {
      title: "Doença Súbita",
      text: "Você ficou doente e foi para o hospital.",
      choices: [
        {
          text: "Tratamento Intensivo",
          action: () => {
            player.balance -= 15000;
            player.form -= 20;
            showMessage("Custo alto e recuperação lenta. -€15k, Forma -20");
          },
          tooltip: "-€15k, -20 Forma"
        },
        {
          text: "Recuperar em casa",
          action: () => {
            player.form -= 10;
            showMessage("Recuperação mais lenta. Forma -10");
          },
          tooltip: "-10 Forma"
        }
      ]
    },
    {
      title: "Festa do Vestiário",
      text: "Te convidaram para uma confraternização pós-jogo.",
      choices: [
        {
          text: "Ir na festa",
          action: () => {
            player.morale += 10;
            player.form -= 10;
            showMessage("Energizado mas cansado. +10 Moral, Forma -10");
          },
          tooltip: "+10 Moral, -10 Forma"
        },
        {
          text: "Evitar festa",
          action: () => {
            player.form += 5;
            showMessage("Descanso extra! Forma +5");
          },
          tooltip: "+5 Forma"
        }
      ]
    },
    {
      title: "Treino Extra com Ídolo",
      text: "Você treina com um ex-craque do clube.",
      choices: [
        {
          text: "Aprender tudo",
          action: () => {
            player.overall += 3;
            showMessage("Sabedoria de ídolo! Overall +3");
          },
          tooltip: "+3 Overall"
        },
        {
          text: "Treino leve",
          action: () => {
            player.form += 5;
            showMessage("Treino motivacional! Forma +5");
          },
          tooltip: "+5 Forma"
        }
      ]
    },
    {
      title: "Protesto de Usuários",
      text: "Torcedores protestam pedindo sua saída.",
      choices: [
        {
          text: "Dialogar com líderes",
          action: () => {
            player.morale -= 5;
            showMessage("Tentou, mas moral cai. -5 Moral");
          },
          tooltip: "-5 Moral"
        },
        {
          text: "Ignorar protesto",
          action: () => {
            player.morale -= 10;
            showMessage("Moral despenca. -10 Moral");
          },
          tooltip: "-10 Moral"
        }
      ]
    },
    {
      title: "Mega Oferta Salarial",
      text: "Você recebe a melhor proposta da carreira!",
      choices: [
        {
          text: "Assinar contrato",
          action: () => {
            player.balance += 200000;
            player.morale += 20;
            showMessage("Fortuna e motivação! +€200k, +20 Moral");
          },
          tooltip: "+€200k, +20 Moral"
        },
        {
          text: "Exigir bônus maior",
          action: () => {
            player.balance += 250000;
            showMessage("Bônus extra! +€250k");
          },
          tooltip: "+€250k"
        }
      ]
    },
    {
      title: "Furto de Equipamento",
      text: "Seu material de treino foi roubado!",
      choices: [
        {
          text: "Cobrar clube",
          action: () => {
            player.balance += 10000;
            showMessage("Clube indenizou €10k");
          },
          tooltip: "+€10k"
        },
        {
          text: "Pagar do próprio bolso",
          action: () => {
            player.balance -= 5000;
            showMessage("Gastou €5k em reposição");
          },
          tooltip: "-€5k"
        }
      ]
    },
    {
      title: "Natal Solidário",
      text: "Você participa de ação social no natal.",
      choices: [
        {
          text: "Doar 10% do salário",
          action: () => {
            const donation = Math.floor(player.balance * 0.1);
            player.balance -= donation;
            player.morale += 15;
            showMessage(`Generoso! Doou €${donation}, +15 Moral`);
          },
          tooltip: "-10% Saldo, +15 Moral"
        },
        {
          text: "Apenas comparecer",
          action: () => {
            player.morale += 5;
            showMessage("Presença solidária! +5 Moral");
          },
          tooltip: "+5 Moral"
        }
      ]
    },
    {
      title: "Treinador Substituído",
      text: "O técnico foi demitido e um novo chega.",
      choices: [
        {
          text: "Apoiar o novo",
          action: () => {
            player.morale += 10;
            showMessage("Entrosamento imediato! +10 Moral");
          },
          tooltip: "+10 Moral"
        },
        {
          text: "Resistir à mudança",
          action: () => {
            player.morale -= 10;
            showMessage("Conflito inicial! -10 Moral");
          },
          tooltip: "-10 Moral"
        }
      ]
    },
    {
      title: "Chuva Torrencial",
      text: "Jogo adiado por tempestade!",
      choices: [
        {
          text: "Aproveitar para treinar",
          action: () => {
            player.form += 5;
            showMessage("Treino extra! Forma +5");
          },
          tooltip: "+5 Forma"
        },
        {
          text: "Descansar em casa",
          action: () => {
            player.morale += 5;
            showMessage("Obs.: moral +5");
          },
          tooltip: "+5 Moral"
        }
      ]
    },      
    {
      title: "Entrevista na TV",
      text: "Você foi convidado para dar uma entrevista esportiva em rede nacional.",
      choices: [
        {
          text: "Aceitar convite",
          action: () => {
            player.morale += 8;
            showMessage("Boa exposição! Moral +8");
            addHistoryEvent('Deu entrevista na TV');
          },
          tooltip: "+8 Moral"
        },
        {
          text: "Recusar para focar no treino",
          action: () => {
            player.form += 5;
            showMessage("Foco total no treino! Forma +5");
            addHistoryEvent('Recusou entrevista para treinar');
          },
          tooltip: "+5 Forma"
        }
      ]
    },
    {
      title: "Clínica de Reabilitação",
      text: "Você tem acesso gratuito a uma clínica de última geração.",
      choices: [
        {
          text: "Fazer tratamento avançado",
          action: () => {
            player.overall = Math.min(100, player.overall + 3);
            showMessage("Recuperação top! +3 Overall");
            addHistoryEvent('Tratamento avançado em clínica de reabilitação');
          },
          tooltip: "+3 Overall"
        },
        {
          text: "Continuar rotina normal",
          action: () => {
            player.form -= 10;
            showMessage("Recuperação lenta... Forma -10");
            addHistoryEvent('Optou por rotina normal ao invés de clínica');
          },
          tooltip: "-10 Forma"
        }
      ]
    },
    {
      title: "Workshop Tático",
      text: "Treinadores renomados oferecem um workshop de estratégia.",
      choices: [
        {
          text: "Participar intensamente",
          action: () => {
            player.overall += 2;
            player.morale += 5;
            showMessage("Visão tática aprimorada! +2 Overall, +5 Moral");
            addHistoryEvent('Participou de workshop tático');
          },
          tooltip: "+2 Overall, +5 Moral"
        },
        {
          text: "Pular para descansar",
          action: () => {
            player.form += 10;
            showMessage("Descanso bem-vindo! Forma +10");
            addHistoryEvent('Pulou workshop para descansar');
          },
          tooltip: "+10 Forma"
        }
      ]
    },
    {
      title: "Rede Social Viral",
      text: "Um vídeo seu viralizou online!",
      choices: [
        {
          text: "Aproveitar fama",
          action: () => {
            player.balance += 20000;
            showMessage("Patrocínios explodiram! +€20k");
            addHistoryEvent('Vídeo viral gerou patrocínios');
          },
          tooltip: "+€20k"
        },
        {
          text: "Evitar exposição",
          action: () => {
            player.morale -= 5;
            showMessage("Fama indesejada... Moral -5");
            addHistoryEvent('Evocou privacidade após viralizar');
          },
          tooltip: "-5 Moral"
        }
      ]
    },
    {
      title: "Dia de Voluntariado",
      text: "Você participa de ação social no projeto do clube.",
      choices: [
        {
          text: "Engajar na comunidade",
          action: () => {
            player.morale += 10;
            showMessage("Ajudou a comunidade! Moral +10");
            addHistoryEvent('Participou de voluntariado comunitário');
          },
          tooltip: "+10 Moral"
        },
        {
          text: "Recusar para descansar",
          action: () => {
            player.form += 5;
            showMessage("Descansou bem! Forma +5");
            addHistoryEvent('Recusou voluntariado para descansar');
          },
          tooltip: "+5 Forma"
        }
      ]
    },
    {
      title: "Oferta de Cripto",
      text: "Uma startup oferece investir em criptomoeda em troca de divulgação.",
      choices: [
        {
          text: "Investir e divulgar",
          action: () => {
            player.balance += 15000;
            player.morale += 5;
            showMessage("Investimento retornou bem! +€15k, +5 Moral");
            addHistoryEvent('Divulgou e investiu em criptomoeda');
          },
          tooltip: "+€15k, +5 Moral"
        },
        {
          text: "Recusar arriscado",
          action: () => {
            player.morale += 2;
            showMessage("Evadiu risco! +2 Moral");
            addHistoryEvent('Recusou oferta de criptomoeda');
          },
          tooltip: "+2 Moral"
        }
      ]
    },
    {
      title: "Desafio de Skills",
      text: "Clube organiza competição interna de dribles e finalizações.",
      choices: [
        {
          text: "Participar com garra",
          action: () => {
            if (Math.random() < 0.4) {
              player.overall += 1;
              showMessage("Destaqueu-se! +1 Overall");
              addHistoryEvent('Venceu desafio de skills');
            } else {
              showMessage("Não brilhou dessa vez.");
              addHistoryEvent('Participou do desafio de skills sem vencer');
            }
          },
          tooltip: "Chance de +1 Overall"
        },
        {
          text: "Usar a competição para treinar",
          action: () => {
            player.form += 5;
            showMessage("Treino útil! Forma +5");
            addHistoryEvent('Usou desafio como treino');
          },
          tooltip: "+5 Forma"
        }
      ]
    },
    {
      title: "Direitos de Imagem",
      text: "Você tem seminário sobre contratos de direitos de imagem.",
      choices: [
        {
          text: "Aprender sobre contratos",
          action: () => {
            player.balance += 10000;
            showMessage("Economizou em taxas! +€10k");
            addHistoryEvent('Participou de seminário de direitos de imagem');
          },
          tooltip: "+€10k"
        },
        {
          text: "Desconsiderar assunto",
          action: () => {
            player.morale -= 5;
            showMessage("Pagou taxas altas... Moral -5");
            addHistoryEvent('Ignorou seminário de direitos de imagem');
          },
          tooltip: "-5 Moral"
        }
      ]
    }
];

// Sistema de Liga
let league = {
    currentView: 'B',
    season: 1,
    round: 0,
    serieA: {
        teams: [],
        standings: []
    },
    serieB: {
        teams: [],
        standings: []
    }
};

// Listas completas de times
let SERIE_A_TEAMS = [
    {name: "Flamengo", overallRange: [85, 100]},
    {name: "Palmeiras", overallRange: [84, 98]},
    {name: "Atlético-MG", overallRange: [83, 96]},
    {name: "Corinthians", overallRange: [82, 94]},
    {name: "Fluminense", overallRange: [81, 93]},
    {name: "Internacional", overallRange: [80, 92]},
    {name: "São Paulo", overallRange: [79, 91]},
    {name: "Vasco", overallRange: [78, 90]},
    {name: "Botafogo", overallRange: [77, 89]},
    {name: "Santos", overallRange: [76, 88]},
    {name: "Grêmio", overallRange: [75, 87]},
    {name: "Athletico-PR", overallRange: [74, 86]},
    {name: "Bahia", overallRange: [73, 85]},
    {name: "Cruzeiro", overallRange: [72, 84]},
    {name: "Fortaleza", overallRange: [71, 83]},
    {name: "Cuiabá", overallRange: [70, 82]},
    {name: "Bragantino", overallRange: [69, 81]},
    {name: "Goiás", overallRange: [68, 80]},
    {name: "Coritiba", overallRange: [67, 79]},
    {name: "América-MG", overallRange: [66, 78]}
];

let SERIE_B_TEAMS = [
    {name: "BSL Team", overallRange: [65, 75]},
    {name: "Sport", overallRange: [70, 80]},
    {name: "Guarani", overallRange: [64, 74]},
    {name: "Criciúma", overallRange: [63, 73]},
    {name: "Ponte Preta", overallRange: [62, 72]},
    {name: "Sampaio Corrêa", overallRange: [61, 71]},
    {name: "CRB", overallRange: [60, 70]},
    {name: "Operário-PR", overallRange: [59, 69]},
    {name: "Novorizontino", overallRange: [58, 68]},
    {name: "Vila Nova", overallRange: [57, 67]},
    {name: "Ituano", overallRange: [56, 66]},
    {name: "Chapecoense", overallRange: [55, 65]},
    {name: "Londrina", overallRange: [54, 64]},
    {name: "Tombense", overallRange: [53, 63]},
    {name: "ABC", overallRange: [52, 62]},
    {name: "Brusque", overallRange: [51, 61]},
    {name: "Náutico", overallRange: [50, 60]},
    {name: "Volta Redonda", overallRange: [49, 59]},
    {name: "Vitória", overallRange: [48, 58]},
    {name: "CSA", overallRange: [47, 57]}
];

let overallChart;
let marketValueChart;

function initChart() {
    const overallCtx = document.getElementById('overall-chart').getContext('2d');
    const marketValueCtx = document.getElementById('market-value-chart').getContext('2d');

    // Gráfico de Overall
    overallChart = new Chart(overallCtx, {
        type: 'line',
        data: {
            labels: progressionData.age, // Alterado para age
            datasets: [{
                label: 'Overall',
                data: progressionData.overall,
                borderColor: '#4CAF50',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    max: 110,
                    title: {
                        display: true,
                        text: 'Overall Rating'
                    }
                }
            }
        }
    });

    // Gráfico de Valor de Mercado
    marketValueChart = new Chart(marketValueCtx, {
        type: 'line',
        data: {
            labels: progressionData.age, // Alterado para age
            datasets: [{
                label: 'Valor de Mercado (€)',
                data: progressionData.marketValue,
                borderColor: '#FF9800',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Valor de Mercado'
                    },
                    ticks: {
                        callback: function(value) {
                            return '€' + (value / 1000000).toFixed(1) + 'M';
                        }
                    }
                }
            }
        }
    });
}

function updateChart() {
    progressionData.age.push(player.age);
    progressionData.overall.push(player.overall);
    progressionData.marketValue.push(player.marketValue);
    
    overallChart.update();
    marketValueChart.update();
}

function resetGame() {
    location.reload();
}

function updateDashboard() {
    const elements = {
        age: document.getElementById('age'),
        club: document.getElementById('club'),
        overall: document.getElementById('overall'),
        marketValue: document.getElementById('marketValue'),
        balance: document.getElementById('balance'),
        season: document.getElementById('season'),
        round: document.getElementById('round'),
        leagueTitle: document.getElementById('league-title'),
        form: document.getElementById('form'),
        morale: document.getElementById('morale'),
        goals: document.getElementById('goals'),
        assists: document.getElementById('assists')
    };

    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Elemento '${key}' não encontrado!`);
            return;
        }
    }

    // Atualizar valores
    elements.age.textContent = player.age.toFixed(1);
    elements.club.textContent = player.club;
    elements.overall.textContent = player.overall;
    elements.marketValue.textContent = `€ ${player.marketValue.toLocaleString()}`;
    elements.balance.textContent = `€ ${player.balance.toLocaleString()}`;
    elements.season.textContent = league.season;
    elements.round.textContent = `${league.round}/38`;
    elements.leagueTitle.textContent = `Campeonato Brasileiro Série ${league.currentView}`;
    
    // Novas estatísticas
    elements.form.textContent = player.form;
    elements.morale.textContent = player.morale;
    elements.goals.textContent = player.goals;
    elements.assists.textContent = player.assists;

    // Cores dinâmicas
    const updateColor = (element, value) => {
        element.style.color = value >= 80 ? '#4CAF50' : 
                             value >= 60 ? '#FFC107' : 
                             '#F44336';
    };

    updateColor(elements.form, player.form);
    updateColor(elements.morale, player.morale);
    
    // Atualizar tooltips
    elements.form.title = `Condição Física Atual (0-100)\n${getFormDescription(player.form)}`;
    elements.morale.title = `Confiança e Motivação (0-100)\n${getMoraleDescription(player.morale)}`;
}

// Funções auxiliares
function getFormDescription(value) {
    return value >= 90 ? "Condição de Pico!" :
           value >= 75 ? "Em Excelente Forma" :
           value >= 60 ? "Condição Adequada" :
           value >= 40 ? "Cansado/Desgastado" :
           "Condição Precária";
}

function getMoraleDescription(value) {
    return value >= 90 ? "Moral Extremamente Alta!" :
           value >= 75 ? "Muito Motivado" :
           value >= 60 ? "Confiança Normal" :
           value >= 40 ? "Moral Abalada" :
           "Desmotivado/Crise";
}

function initLeague() {
    league.serieA.teams = SERIE_A_TEAMS.map(team => ({
        name: team.name,
        pts: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        overallRange: team.overallRange
    }));
    
    league.serieB.teams = SERIE_B_TEAMS.map(team => ({
        name: team.name,
        pts: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        overallRange: team.overallRange
    }));
    
    updateStandings();
}

function simulateMatch(home, away) {
    const homeStrength = home.name === player.club ? 
        player.overall : 
        (home.overallRange[0] + home.overallRange[1]) / 2;
    
    const awayStrength = away.name === player.club ? 
        player.overall : 
        (away.overallRange[0] + away.overallRange[1]) / 2;

    // Calcular gols
    const result = {
        homeGoals: Math.floor(Math.random() * (homeStrength/25)),
        awayGoals: Math.floor(Math.random() * (awayStrength/25))
    };

    // Sistema de contribuição do jogador
    if(home.name === player.club || away.name === player.club) {
        const baseGoalChance = calculateGoalChance(player.overall);
        const baseAssistChance = calculateAssistChance(player.overall);
        
        // Ajustar pela forma (0-100 → 0.8-1.2 modificador)
        const formModifier = 0.8 + (player.form/100 * 0.4);
        
        // Chance final ajustada
        const finalGoalChance = Math.min(0.95, baseGoalChance * formModifier);
        const finalAssistChance = Math.min(0.85, baseAssistChance * formModifier);
        
        // Sistema de ataque por jogador
        const attacks = Math.floor(3 + (player.overall/20)); // Número de chances por jogo
        
        for(let i = 0; i < attacks; i++) {
            if(Math.random() < finalGoalChance) {
                player.goals += 1;
                player.seasonalStats.goals += 1;
                player.morale = Math.min(100, player.morale + 1);
            } else if(Math.random() < finalAssistChance) {
                player.assists += 1;
                player.seasonalStats.assists += 1;
                player.form = Math.min(100, player.form + 0.5);
            }
        }
    }

    // Desgaste físico natural
    if(home.name === player.club || away.name === player.club) {
        player.form = Math.max(0, player.form - Math.floor(Math.random() * 3));
    }

    return result;
}

function simulateDivisionRound(teams) {
    const matches = generateRoundMatches(teams);
    
    matches.forEach(match => {
        const home = teams.find(t => t.name === match.home);
        const away = teams.find(t => t.name === match.away);
        const result = simulateMatch(home, away);

        home.gf += result.homeGoals;
        home.ga += result.awayGoals;
        away.gf += result.awayGoals;
        away.ga += result.homeGoals;

        if(result.homeGoals > result.awayGoals) {
            home.pts += 3;
            home.wins++;
            away.losses++;
        } else if(result.awayGoals > result.homeGoals) {
            away.pts += 3;
            away.wins++;
            home.losses++;
        } else {
            home.pts += 1;
            away.pts += 1;
            home.draws++;
            away.draws++;
        }
        
        home.played++;
        away.played++;
    });
}

function simulateSingleRound() {
    updateMarketValue()
    if(league.round >= 38) return;

    simulateDivisionRound(league.serieA.teams);
    simulateDivisionRound(league.serieB.teams);

    league.round++;
    
    if(league.round % 5 === 0) {
        player.form = Math.min(100, player.form + Math.floor(Math.random() * 5));
        player.morale = Math.min(100, player.morale + Math.floor(Math.random() * 5));
    }
    
    updateStandings();
    player.age = Number((player.age + (1/38)).toFixed(2));
}

function generateRoundMatches(teams) {
    const shuffled = [...teams].sort(() => 0.5 - Math.random());
    const matches = [];
    
    for(let i = 0; i < shuffled.length; i += 2) {
        if(shuffled[i+1]) {
            matches.push({
                home: shuffled[i].name,
                away: shuffled[i+1].name
            });
        }
    }
    return matches;
}

function switchLeague(division) {
    league.currentView = division;
    updateStandings();
    updateDashboard();
}

function updateStandings() {
      // recalcula as duas tabelas
    const sortFn = (a, b) => 
      b.pts - a.pts ||
      (b.wins - a.wins) ||
      ((b.gf - b.ga) - (a.gf - a.ga));

    league.serieA.standings = [...league.serieA.teams].sort(sortFn);
    league.serieB.standings = [...league.serieB.teams].sort(sortFn);
    const currentLeague = league.currentView === 'A' ? league.serieA : league.serieB;
    
    currentLeague.standings = currentLeague.teams.sort((a, b) => 
        b.pts - a.pts || (b.wins - a.wins) || (b.gf - b.ga) - (a.gf - a.ga)
    );

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    currentLeague.standings.forEach((team, index) => {
        const row = document.createElement('tr');
        row.className = team.name === player.club ? 'user-team' : 
                       index < (league.currentView === 'A' ? 16 : 4) ? 'promotion-zone' :
                       index < (league.currentView === 'A' ? 4 : 16) ? 'relegation-zone' : '';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td data-overall="Overall: ${team.overallRange[0]}-${team.overallRange[1]}">${team.name}</td>
            <td>${team.pts}</td>
            <td>${team.played}</td>
            <td>${team.wins}</td>
            <td>${team.draws}</td>
            <td>${team.losses}</td>
        `;
        tbody.appendChild(row);
    });
}

function advanceTime() {
    updateMarketValue();
    const roundsToPlay = Math.min(5, 38 - league.round);
    
    for(let i = 0; i < roundsToPlay; i++) {
        simulateSingleRound();
    }

    if(league.round >= 38) {
        endSeason();
    }

    updateDashboard();
    checkStoryEvents();
    updateChart();
    updateMatchStats();

    if(league.round < 38 && Math.random() < 0.3) {
        triggerRandomEvent();
    }
}

function checkAchievements() {
    const g = player.seasonalStats.goals;
    const a = player.seasonalStats.assists;
    
    if(g >= 25 && !player.achievements.includes(`Artilheiro da Série ${league.currentView} - T${league.season}`)) {
        const title = `Artilheiro da Série ${league.currentView} - T${league.season} (${g} gols)`;
        player.achievements.push(title);
        addHistoryEvent(title);
    }
    if(a >= 15 && !player.achievements.includes(`Líder de Assistências da Série ${league.currentView} - T${league.season}`)) {
        const title = `Líder de Assistências da Série ${league.currentView} - T${league.season} (${a} passes)`;
        player.achievements.push(title);
        addHistoryEvent(title);
    }
    if(g >= 15 && a >= 10 && !player.achievements.includes(`Melhor Jogador da Série ${league.currentView} - T${league.season}`)) {
        const title = `Melhor Jogador da Série ${league.currentView} - T${league.season}`;
        player.achievements.push(title);
        addHistoryEvent(title);
    }
    
    // Atualizar o trophy case
    updateTrophyCase();
}

function endSeason() {
      // força a Série A a recalcular o standings
    const sortFn = (a, b) => 
      b.pts - a.pts ||
      (b.wins - a.wins) ||
      ((b.gf - b.ga) - (a.gf - a.ga));
    league.serieA.standings = [...league.serieA.teams].sort(sortFn);
    showMessage(`Fim da Temporada ${league.season}! Posição Final: ${league[league.currentView === 'A' ? 'serieA' : 'serieB'].standings.findIndex(t => t.name === player.club) + 1}º`, true);
    
    // Promoção/Rebaixamento
    const rebaixadosA = league.serieA.standings.slice(16, 20);  // pega índices 16,17,18,19
    const promovidosB = league.serieB.standings.slice(0, 4);

    // Criar novas ligas mantendo 20 times cada
    const novaSerieA = [
        ...league.serieA.teams.filter(t => 
             !rebaixadosA.some(r => r.name === t.name)
        ),
        ...promovidosB
      ];
      
      const novaSerieB = [
        ...rebaixadosA,
        ...league.serieB.teams.filter(t =>
             !promovidosB.some(p => p.name === t.name)
        )
      ];
      

    // Atualizar listas globais (alterar para let)
    SERIE_A_TEAMS.splice(0, SERIE_A_TEAMS.length, ...novaSerieA.map(t => ({
        name: t.name,
        overallRange: t.overallRange
    })));
    
    SERIE_B_TEAMS.splice(0, SERIE_B_TEAMS.length, ...novaSerieB.map(t => ({
        name: t.name, 
        overallRange: t.overallRange
    })));

    // Verificar consequências
    if(rebaixadosA.some(t => t.name === player.club)) {
        player.marketValue *= 0.85;
        showMessage("Rebaixado para Série B! Valor de mercado reduzido.");
    }
    
    if(promovidosB.some(t => t.name === player.club)) {
        player.marketValue *= 1.4;
        showMessage("Promovido para Série A! Valor de mercado aumentado.");
    }
    checkChampionshipTitle();
    checkAchievements();
    // Resetar estatísticas sazonais
    player.seasonalStats = { goals: 0, assists: 0 };
    setTimeout(() => {
        showTransferEvent();
    }, 1000);
}

function initNewSeason() {
    league.season++;
    league.round = 0;
    
    // Sistema de declínio após os 30 anos
    if(player.age >= 30) {
        const decline = Math.min(3, Math.floor((player.age - 30) * 0.7));
        player.overall = Math.max(40, player.overall - decline);
    } else {
        player.overall = Math.min(100, player.overall + 2);
    }
    
    player.form = Math.min(100, player.form + 30);
    updateMarketValue(); // Atualizar valor de mercado
    initLeague();
    updateDashboard();
}

function showTransferEvent() {
    const targetDivision = SERIE_A_TEAMS.concat(SERIE_B_TEAMS).filter(team => 
        player.overall >= team.overallRange[0] && 
        player.overall <= team.overallRange[1] &&
        team.name !== player.club
    );

    if(targetDivision.length > 0 && Math.random() < 0.65) {
        const newClub = targetDivision[Math.floor(Math.random() * targetDivision.length)];
        
        showEvent({
            title: "Oferta de Transferência!",
            text: `${newClub.name} está interessado! (Requer Overall: ${newClub.overallRange[0]}-${newClub.overallRange[1]})`,
            choices: [{
                text: `Assinar com ${newClub.name}`,
                action: () => {
                    player.club = newClub.name;
                    player.marketValue *= 1.3;
                    player.balance += 500000;
                    player.clubs.push(newClub.name);
                    initNewSeason();
                    addHistoryEvent(`Assinou com ${newClub.name} no valor de €${player.marketValue.toLocaleString('pt-BR')}` );
                },
                tooltip: "Muda de clube e aumenta valor"
            }, {
                text: "Recusar oferta",
                action: () => {
                    player.morale = Math.min(100, player.morale + 15);
                    initNewSeason();
                },
                tooltip: "Aumenta moral"
            }]
        });
    } else {
        initNewSeason();
    }
}

// Funções de Eventos
function triggerRandomEvent() {
    const event = events[Math.floor(Math.random() * events.length)];
    showEvent(event);
}

function showEvent(event) {
    const modal = document.getElementById('event-modal');
    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-text').textContent = event.text;

    
    const choices = document.getElementById('event-choices');
    choices.innerHTML = '';
    
    event.choices.forEach(choice => {
        const button = document.createElement('button');
        button.className = 'choice-button';
        button.innerHTML = `${choice.text}<div class="tooltip">${choice.tooltip}</div>`;
        button.onclick = () => {
            toggleMusic(false); // Retomar música ao fechar
            choice.action();
            modal.classList.add('hidden');
            updateDashboard();
            updateChart();
        };
        choices.appendChild(button);
    });
    
    modal.classList.remove('hidden');
}

function showMessage(message, isSeasonEnd = false) {
    const modal = document.getElementById('event-modal');
    const choices = document.getElementById('event-choices');
    
    document.getElementById('event-title').textContent = isSeasonEnd ? 
        "Relatório Final da Temporada" : 
        "Resultado";
    
    document.getElementById('event-text').textContent = message;
    
    choices.innerHTML = isSeasonEnd ? 
        '<button class="choice-button" onclick="document.getElementById(\'event-modal\').classList.add(\'hidden\')">Iniciar Nova Temporada</button>' :
        '<button class="choice-button" onclick="document.getElementById(\'event-modal\').classList.add(\'hidden\')">Continuar</button>';
    
    modal.classList.remove('hidden');
}

function checkDomElements() {
    const requiredElements = [
        'age', 
        'club', 
        'overall', 
        'marketValue', 
        'balance', 
        'season', 
        'round', 
        'league-title',
        'overall-chart',
        'market-value-chart',
        'event-modal',
        'table-body'
    ];

    requiredElements.forEach(id => {
        if (!document.getElementById(id)) {
            console.error(`Elemento com ID '${id}' não encontrado!`);
        } else {
            console.log(`Elemento '${id}' OK`);
        }
    });
}


function getStatusColor(value) {
    if(value >= 80) return '#4CAF50'; // Verde
    if(value >= 60) return '#FFC107'; // Amarelo
    return '#F44336'; // Vermelho
}


const musicFiles = ['music2.mp3', 'music1.mp3'];
let currentTrack = 0;
let audioPlayer = document.getElementById('background-music');

// Função para alternar músicas
function playNextTrack() {
    currentTrack = (currentTrack + 1) % musicFiles.length;
    audioPlayer.src = musicFiles[currentTrack];
    audioPlayer.play();
}

// Iniciar música quando houver interação do usuário
document.addEventListener('click', function initAudio() {
    if (audioPlayer.paused) {
        audioPlayer.src = musicFiles[currentTrack];
        audioPlayer.play();
        audioPlayer.volume = 0.3; // Ajuste o volume
        audioPlayer.addEventListener('ended', playNextTrack);
    }
    document.removeEventListener('click', initAudio);
});

// Controle de pausa para modais
function toggleMusic(pause) {
    if(pause) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
}


// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    checkDomElements();
    updateTrophyCase();
    initLeague();
    initChart();
    updateDashboard();
});
