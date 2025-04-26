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
  seasonalStats: { goals: 0, assists: 0 },
};

let progressionData = {
  age: [16], 
  overall: [65],
  marketValue: [10000000],
  balance: [10000],
  morale: [80],
  form: [75]
};

let modalTimeout; 
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
  const country = league.countries[league.currentCountry];
  
  // Encontrar qual divisão o time do jogador está
  let actualDivision;
  Object.entries(country.divisions).forEach(([divName, division]) => {
    if(division.teams.some(t => t.name === player.club)) {
      actualDivision = divName;
    }
  });

  const currentDivision = country.divisions[actualDivision];
  
  if (!currentDivision || !currentDivision.standings) return;

  const position = currentDivision.standings.findIndex(t => t.name === player.club) + 1;
  
  if (position === 1) {
    const titleName = `Campeão da ${actualDivision} - Temporada ${country.season}`;
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
  const country = league.countries[league.currentCountry];
  const season = country && typeof country.season !== 'undefined' ? country.season : 1;
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
    age: 19,
    messages: ["Você foi convocado para copa do mundo do ano que vem. Sua primeira convocação para a Copa do Mundo! O sonho de todo jogador está se realizando. O mundo todo estará de olho nas suas performances."],
  },
  {
    age: 20,
    messages: [],
    worldCup: true
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
    age: 25,
    messages: ["Você foi convocado para copa do mundo do ano que vem. Sua primeira convocação para a Copa do Mundo! O sonho de todo jogador está se realizando. O mundo todo estará de olho nas suas performances."],
  },
  {
    age: 26,
    messages: [],
    worldCup: true
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
    age: 29,
    messages: ["Você foi convocado para copa do mundo do ano que vem. Sua primeira convocação para a Copa do Mundo! O sonho de todo jogador está se realizando. O mundo todo estará de olho nas suas performances."],
  },
  {
    age: 31,
    messages: [],
    worldCup: true
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
    age: 34,
    messages: ["Você foi convocado para copa do mundo do ano que vem. Sua primeira convocação para a Copa do Mundo! O sonho de todo jogador está se realizando. O mundo todo estará de olho nas suas performances."],
  },
  {
    age: 35,
    messages: [],
    worldCup: true
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
    age: 39,
    messages: ["Despedida da Seleção! Um amistoso emocionante marca o fim da sua jornada internacional. O estádio inteiro canta seu nome."],
    farewellMatch: true
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

// Evento de Despedida
function showFarewellEvent(age) {
  const modal = document.getElementById('story-modal');
  const img = document.getElementById('story-image');
  const titleElement = document.getElementById('story-title');
  const textElement = document.getElementById('story-text');
  const choicesElement = document.getElementById('story-choices');

  img.src = 'img/story/wcup.jpg';
  titleElement.innerHTML = '👋 Despedida da Seleção';
  textElement.innerHTML = 'Último jogo pela seleção nacional! Emocionante cerimônia de despedida com homenagens de colegas e torcedores.';
  
  choicesElement.innerHTML = `
    <button class="choice-button" onclick="
      player.morale = 100;
      player.form += 20;
      addHistoryEvent('Despedida emocionante da Seleção');
      setTimeout(() => {
        document.getElementById('story-modal').classList.add('hidden');
      }, 5000)">
      Agradecer aos Torcedores
    </button>
  `;
  
  modal.classList.remove('hidden');
}


function checkStoryEvents() {
  const currentAge = Math.floor(player.age);
  const event = storyEvents.find(e => e.age === currentAge && !e.triggered);
  
  if(event) {
    event.triggered = true;
    
    if(event.worldCup) {
      showStoryEvent({
        title: `Copa do Mundo aos ${currentAge} Anos`,
        text: event.messages[0],
        icon: getEventIcon(currentAge),
        age: currentAge,
        worldCup: true
      });
      setTimeout(() => startWorldCupEvent(currentAge), 1000);
    } 
    else if(event.farewellMatch) {
      showFarewellEvent(currentAge);
    }
    else {
      const randomMessage = event.messages[Math.floor(Math.random() * event.messages.length)];
      showStoryEvent({
        title: `Jornada aos ${currentAge} Anos`,
        text: randomMessage,
        icon: getEventIcon(currentAge),
        age: currentAge
      });
    }
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
    42: '🌟',
    22: '🌍',
    26: '⚽',
    31: '🏟️',
    35: '👑',
    39: '👋',
  };
  return icons[age] || '📖';
}

let worldCupStage = {
  currentStage: 'group',
  wins: 0,
  goals: 0,
  performance: 0
};

function startWorldCupEvent(age) {
  worldCupStage = { currentStage: 'group', wins: 0, goals: 0, performance: 0 };
  showWorldCupMatch(age);
}

function showWorldCupMatch(age) {
  const stages = {
    group: { text: "Fase de Grupos", next: "round16", matches: 3 },
    round16: { text: "Oitavas de Final", next: "quarter", matches: 1 },
    quarter: { text: "Quartas de Final", next: "semi", matches: 1 },
    semi: { text: "Semifinal", next: "final", matches: 1 },
    final: { text: "Final", next: null, matches: 1 }
  };

  const current = stages[worldCupStage.currentStage];
  const modal = document.getElementById('story-modal');
  const img = document.getElementById('story-image');
  const titleElement = document.getElementById('story-title');
  const textElement = document.getElementById('story-text');
  const choicesElement = document.getElementById('story-choices');

  // Simular partida
  const goals = Math.floor(Math.random() * (player.overall/20));
  const result = Math.random() < 0.6 ? 'win' : 'lose';

  let matchText = `Partida da ${current.text}!`;
  let choicesHTML = '';

  if(result === 'win') {
    worldCupStage.wins++;
    worldCupStage.goals += goals;
    worldCupStage.performance += (player.overall * 0.1);
    
    matchText += `<br>Vitória! ${goals} gols marcados!`;
    if(current.next) {
      choicesHTML = `
        <button class="choice-button" onclick="
          setTimeout(() => {
            worldCupStage.currentStage = '${current.next}';
            showWorldCupMatch(${age});
          }, 1000)">
          Avançar para ${stages[current.next].text}
        </button>
      `;
    } else {
      choicesHTML = `
        <button class="choice-button" onclick="
            endWorldCup(true, ${age});
            setTimeout(() => {
              document.getElementById('story-modal').classList.add('hidden');
            }, 1000)">
          Campeão da Copa!
        </button>
      `;
    }
  } else {
    matchText += `<br>Derrota... Fim da jornada na Copa.`;
    choicesHTML = `
      <button class="choice-button" onclick="
        endWorldCup(false, ${age});
        setTimeout(() => {
          document.getElementById('story-modal').classList.add('hidden');
        }, 1000)">
        Continuar
      </button>
    `;
  }

  // Atualizar elementos existentes
  img.src = 'img/story/wcup.jpg';
  titleElement.innerHTML = `🏆 Copa do Mundo ${age} Anos`;
  textElement.innerHTML = matchText;
  choicesElement.innerHTML = choicesHTML;
  
  modal.classList.remove('hidden');
}


function endWorldCup(champion, age) {
  if(champion) {
    player.overall = Math.min(100, player.overall + 3);
    player.balance += 5000000;
    player.achievements.push(`Campeão da Copa do Mundo ${age}`);
    addHistoryEvent(`🏆 Campeão da Copa! +3 Overall e €5M`);
  }
  
  // Bônus por performance
  const bonus = Math.round(worldCupStage.performance * 1000);
  player.balance += bonus;
  addHistoryEvent(`Bônus de Performance: €${bonus.toLocaleString()}`);
  
  updateTrophyCase();
  updateDashboard();
}

function showStoryEvent(event) {
  const modal = document.getElementById('story-modal');
  const img = document.getElementById('story-image');
  const titleElement = document.getElementById('story-title');
  const textElement = document.getElementById('story-text');
  const choicesElement = document.getElementById('story-choices');

  const ageImages = {
    18: 'img/story/age18.jpg',
    21: 'img/story/wedding.jpg',
    19: 'img/story/convocado.jpg',
    20: 'img/story/wcup.jpg',
    23: 'img/story/planning.jpg',
    25: 'img/story/convocado.jpg',
    26: 'img/story/wcup.jpg',
    28: 'img/story/peak.jpg', 
    30: 'img/story/decline.jpg',
    29: 'img/story/convocado.jpg',
    31: 'img/story/wcup.jpg',
    33: 'img/story/transition.jpg',
    34: 'img/story/convocado.jpg',
    35: 'img/story/wcup.jpg',
    38: 'img/story/mentor.jpg',
    39: 'img/story/wcup.jpg',
    40: 'img/story/family.jpg',
    41: 'img/story/family2.jpg',
    42: 'img/story/retirement.jpg',
  };

  img.src = ageImages[event.age] || 'img/story/default.jpg';
  img.alt = `Ilustração para evento aos ${event.age} anos`;

  titleElement.innerHTML = `
    <span class="story-icon">${event.icon}</span>
    ${event.title}
  `;
  textElement.textContent = event.text;

  choicesElement.innerHTML = `
    <button class="choice-button story-choice" 
      onclick="
        document.getElementById('story-modal').classList.add('hidden');
        setTimeout(() => {
          updateDashboard();
          updateChart();
        }, 1000)">
      ${event.age === 42 ? 'Encerrar Carreira' : 'Continuar Jornada'}
    </button>
  `;

  modal.classList.remove('hidden');
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
              const country = league.countries[league.currentCountry];
              const season = country ? country.season : 1;
              const title = `Prêmio Puskas - T${season}`;
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


// Listas completas de times
let SERIE_A_TEAMS = [
  {name: "Flamengo", overallRange: [70, 85]},
  {name: "Palmeiras", overallRange: [70, 85]},
  {name: "Atlético-MG", overallRange: [70, 82]},
  {name: "Corinthians", overallRange: [70, 85]},
  {name: "Fluminense", overallRange: [70, 82]},
  {name: "Internacional", overallRange: [70, 82]},
  {name: "São Paulo", overallRange: [70, 84]},
  {name: "Vasco", overallRange: [70, 82]},
  {name: "Botafogo", overallRange: [70, 84]},
  {name: "Santos", overallRange: [70, 82]},
  {name: "Grêmio", overallRange: [70, 82]},
  {name: "Athletico-PR", overallRange: [70, 82]},
  {name: "Bahia", overallRange: [70, 82]},
  {name: "Cruzeiro", overallRange: [70, 82]},
  {name: "Fortaleza", overallRange: [70, 80]},
  {name: "Cuiabá", overallRange: [70, 80]},
  {name: "Bragantino", overallRange: [69, 80]},
  {name: "Goiás", overallRange: [68, 80]},
  {name: "Coritiba", overallRange: [67, 79]},
  {name: "América-MG", overallRange: [66, 78]}
];

let SERIE_B_TEAMS = [
  {name: "BSL Team", overallRange: [40, 75]},
  {name: "Sport", overallRange: [65, 75]},
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

const PREMIER_LEAGUE = [
{name: "Manchester City", overallRange: [88, 100]},
{name: "Liverpool", overallRange: [87, 100]},
{name: "Chelsea", overallRange: [85, 100]},
{name: "Manchester United", overallRange: [84, 100]},
{name: "Tottenham", overallRange: [83, 100]},
{name: "Arsenal", overallRange: [82, 100]},
{name: "Leicester", overallRange: [80, 92]},
{name: "West Ham", overallRange: [78, 90]},
{name: "Aston Villa", overallRange: [77, 89]},
{name: "Everton", overallRange: [77, 88]},
{name: "Newcastle", overallRange: [77, 87]},
{name: "Wolves", overallRange: [77, 86]},
{name: "Leeds", overallRange: [77, 85]},
{name: "Southampton", overallRange: [77, 85]},
{name: "Brighton", overallRange: [77, 85]},
{name: "Crystal Palace", overallRange: [77, 85]},
{name: "Brentford", overallRange: [77, 85]},
{name: "Burnley", overallRange: [77, 85]},
{name: "Watford", overallRange: [77, 85]},
{name: "Norwich", overallRange: [77, 85]}
];

const LA_LIGA = [
{name: "Real Madrid", overallRange: [90, 100]},
{name: "Barcelona", overallRange: [89, 100]},
{name: "Atlético Madrid", overallRange: [88, 100]},
{name: "Sevilla", overallRange: [85, 96]},
{name: "Villarreal", overallRange: [84, 95]},
{name: "Real Sociedad", overallRange: [83, 94]},
{name: "Athletic Bilbao", overallRange: [82, 93]},
{name: "Valencia", overallRange: [81, 92]},
{name: "Betis", overallRange: [80, 91]},
{name: "Celta Vigo", overallRange: [79, 90]},
{name: "Getafe", overallRange: [78, 89]},
{name: "Osasuna", overallRange: [77, 88]},
{name: "Espanyol", overallRange: [76, 87]},
{name: "Mallorca", overallRange: [75, 86]},
{name: "Alavés", overallRange: [75, 85]},
{name: "Granada", overallRange: [75, 85]},
{name: "Levante", overallRange: [75, 85]},
{name: "Cadiz", overallRange: [75, 85]},
{name: "Elche", overallRange: [75, 85]},
{name: "Rayo Vallecano", overallRange: [75, 85]}
];

const BUNDESLIGA = [
{name: "Bayern Munich", overallRange: [95, 100]},
{name: "Borussia Dortmund", overallRange: [88, 98]},
{name: "RB Leipzig", overallRange: [85, 95]},
{name: "Bayer Leverkusen", overallRange: [83, 95]},
{name: "Wolfsburg", overallRange: [82, 92]},
{name: "Eintracht Frankfurt", overallRange: [81, 91]},
{name: "Borussia M.Gladbach", overallRange: [80, 90]},
{name: "TSG Hoffenheim", overallRange: [78, 88]},
{name: "VfB Stuttgart", overallRange: [77, 87]},
{name: "SC Freiburg", overallRange: [76, 86]},
{name: "FC Köln", overallRange: [75, 85]},
{name: "Hertha BSC", overallRange: [75, 85]},
{name: "Union Berlin", overallRange: [75, 85]},
{name: "Mainz 05", overallRange: [75, 85]},
{name: "Augsburg", overallRange: [75, 85]},
{name: "Bochum", overallRange: [75, 85]},
{name: "Greuther Fürth", overallRange: [75, 85]},
{name: "Arminia Bielefeld", overallRange: [75, 85]},
{name: "FC Köln II", overallRange: [75, 85]},
{name: "Hannover 96", overallRange: [75, 85]}
];

const SERIE_A_ITALIA = [
{name: "Juventus", overallRange: [90, 100]},
{name: "Inter Milan", overallRange: [88, 100]},
{name: "AC Milan", overallRange: [87, 100]},
{name: "Napoli", overallRange: [85, 95]},
{name: "Atalanta", overallRange: [84, 95]},
{name: "Roma", overallRange: [83, 95]},
{name: "Lazio", overallRange: [82, 92]},
{name: "Fiorentina", overallRange: [80, 90]},
{name: "Torino", overallRange: [78, 88]},
{name: "Sampdoria", overallRange: [77, 87]},
{name: "Udinese", overallRange: [76, 86]},
{name: "Sassuolo", overallRange: [75, 85]},
{name: "Bologna", overallRange: [75, 85]},
{name: "Verona", overallRange: [75, 85]},
{name: "Empoli", overallRange: [75, 85]},
{name: "Spezia", overallRange: [75, 85]},
{name: "Salernitana", overallRange: [75, 85]},
{name: "Cagliari", overallRange: [75, 85]},
{name: "Venezia", overallRange: [75, 85]},
{name: "Genoa", overallRange: [75, 85]}
];



// Sistema de Liga
let league = {
  currentCountry: 'Brazil',
  currentDivision: 'B',
  currentView: 'B',
  countries: {
    Brazil: {
      season: 1,
      round: 0,
      name: 'Brasileirão',
      divisions: {
        A: { teams: SERIE_A_TEAMS, standings: [] },
        B: { teams: SERIE_B_TEAMS, standings: [] }
      }
    },
    England: {
      season: 1,
      round: 0,
      name: 'Premier League',
      divisions: {
        Premier: { teams: PREMIER_LEAGUE, standings: [] }
      }
    },
    Spain: {
      season: 1,
      round: 0,
      name: 'La Liga',
      divisions: {
        LaLiga: { teams: LA_LIGA, standings: [] }
      }
    },
    Germany: {
      season: 1,
      round: 0,
      name: 'Bundesliga',
      divisions: {
        Bundesliga: { teams: BUNDESLIGA, standings: [] }
      }
    },
    Italy: {
      season: 1,
      round: 0,
      name: 'Serie A',
      divisions: {
        SerieA: { teams: SERIE_A_ITALIA, standings: [] }
      }
    }
  }
};

function switchCountry(country) {
  league.currentCountry = country;
  const divisions = Object.keys(league.countries[country].divisions);
  league.currentDivision = divisions[0];
  if (country === 'Brazil') {
    document.getElementById('brazil-buttons').style.display = 'block';
  } else {
    document.getElementById('brazil-buttons').style.display = 'none';
  }
  updateStandings();
  updateDashboard();
}

function switchDivision(div) {
  league.currentDivision = div;
  league.currentView = div; 
  updateStandings();
  updateDashboard();
}

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
  const country = league.countries[league.currentCountry];
  const season = country ? country.season : 1;
  document.getElementById('season').textContent = season;
  // Atualizar valores
  elements.age.textContent = player.age.toFixed(1);
  elements.club.textContent = player.club;
  elements.overall.textContent = player.overall;
  elements.marketValue.textContent = `€ ${player.marketValue.toLocaleString()}`;
  elements.balance.textContent = `€ ${player.balance.toLocaleString()}`;
  elements.season.textContent = country.season;
  elements.round.textContent = `${country.round}/38`;
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
  // Apenas reinicia as estatísticas, mantendo os times atuais
  Object.values(league.countries).forEach(country => {
    Object.values(country.divisions).forEach(division => {
      division.teams.forEach(team => {
        team.pts = 0;
        team.played = 0;
        team.wins = 0;
        team.draws = 0;
        team.losses = 0;
        team.gf = 0;
        team.ga = 0;
      });
      division.standings = [...division.teams];
    });
  });
  updateStandings();
}


// Função auxiliar para obter os times corretos
function getLeagueTeams(country, division) {
  switch(country) {
    case 'Brazil':
      return division === 'A' ? SERIE_A_TEAMS : SERIE_B_TEAMS;
    case 'England': return PREMIER_LEAGUE;
    case 'Spain': return LA_LIGA;
    case 'Germany': return BUNDESLIGA;
    case 'Italy': return SERIE_A_ITALIA;
    default: return [];
  }
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
  updateMarketValue();

  // Simular rodada para todas as ligas de todos os países
  Object.values(league.countries).forEach(country => {
    Object.values(country.divisions).forEach(division => {
      if (division.teams.length > 0 && country.round < 38) {
        simulateDivisionRound(division.teams);
      }
    });
    country.round++;
  });

  // Atualizar atributos do jogador
  Object.values(league.countries).forEach(country => {
    if (country.round % 5 === 0) {
      player.form = Math.min(100, player.form + Math.floor(Math.random() * 5));
      player.morale = Math.min(100, player.morale + Math.floor(Math.random() * 5));
    }
  });

  player.age = Number((player.age + (1/38)).toFixed(2));
  updateStandings();
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
  const country = league.countries[league.currentCountry];
  if (!country) return;

  const division = country.divisions[league.currentDivision];
  if (!division) return;
  
  // Atualizar apenas a divisão visível
  division.standings = [...division.teams].sort((a, b) => 
    b.pts - a.pts || 
    (b.wins - a.wins) || 
    ((b.gf - b.ga) - (a.gf - a.ga))
  );

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  
  division.standings.forEach((team, index) => {
    const row = document.createElement('tr');
    row.className = team.name === player.club ? 'user-team' : 
                   index < 4 ? 'promotion-zone' :
                   index >= division.teams.length - 4 ? 'relegation-zone' : '';
    
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
  const roundsToPlay = 5;
  
  for(let i = 0; i < roundsToPlay; i++) {
    simulateSingleRound();
  }

  // Verificar fim de temporada em todas as ligas
  Object.values(league.countries).forEach(country => {
    if(country.round >= 38) {
      endSeason(country);
    }
  });

  updateDashboard();
  checkStoryEvents();
  updateChart();
  updateMatchStats();

  if(Math.random() < 0.3) {
    // Garantir que não há modal aberto
    if(document.getElementById('event-modal').classList.contains('hidden')) {
      triggerRandomEvent();
    }
  }
}

function checkAchievements() {
  const country = league.countries[league.currentCountry];
  const season = country ? country.season : 1;
  const g = player.seasonalStats.goals;
  const a = player.seasonalStats.assists;
  
  if(g >= 25 && !player.achievements.includes(`Artilheiro da Série ${league.currentDivision} - T${season}`)) {
      const title = `Artilheiro da Série ${league.currentDivision} - T${season} (${g} gols)`;
      player.achievements.push(title);
      addHistoryEvent(title);
  }
  if(a >= 17 && !player.achievements.includes(`Líder de Assistências da Série ${league.currentDivision} - T${season}`)) {
      const title = `Líder de Assistências da Série ${league.currentDivision} - T${season} (${a} passes)`;
      player.achievements.push(title);
      addHistoryEvent(title);
  }
  if(g >= 18 && a >= 13 && !player.achievements.includes(`Melhor Jogador da Série ${league.currentDivision} - T${season}`)) {
      const title = `Melhor Jogador da Série ${league.currentDivision} - T${season}`;
      player.achievements.push(title);
      addHistoryEvent(title);
  }
  
  updateTrophyCase();
}

function endSeason(country) {
  // Processar todas as divisões do país
  Object.entries(country.divisions).forEach(([divName, division]) => {
    // Ordenar classificação
    division.standings = [...division.teams].sort((a, b) => 
      b.pts - a.pts || 
      (b.wins - a.wins) || 
      ((b.gf - b.ga) - (a.gf - a.ga))
    );

    // Sistema específico para o Brasil com duas divisões
    if(country.name === 'Brasileirão') {
      if(divName === 'A') {
        const rebaixadosSerieA = division.standings.slice(-4);
        const serieB = country.divisions['B'];
        
        // Promover apenas 4 times da Série B
        const promovidosSerieB = serieB.standings.slice(0, 4);
  
        // Mantém os times restantes da Série A e adiciona promovidos
        division.teams = [
          ...division.teams.slice(0, -4), 
          ...promovidosSerieB
        ];
  
        // Mantém os times restantes da Série B e adiciona rebaixados
        serieB.teams = [
          ...serieB.teams.slice(4),
          ...rebaixadosSerieA
        ];
      }
    }
    else {
      // Sistema genérico para outros países
      const divisions = Object.keys(country.divisions);
      const currentIndex = divisions.indexOf(divName);
      
      if(currentIndex === 0) {
        const rebaixados = division.standings.slice(-4);
        const lowerDivision = country.divisions[divisions[1]];
        
        if(lowerDivision) {
          const promovidos = lowerDivision.standings.slice(0, 4);
          division.teams = division.teams.filter(t => 
            !rebaixados.some(r => r.name === t.name)
          );
          lowerDivision.teams = [
            ...rebaixados,
            ...lowerDivision.teams.filter(t => 
              !promovidos.some(p => p.name === t.name))
          ];
        }
      }
      else if(currentIndex > 0) {
        const upperDivision = country.divisions[divisions[currentIndex - 1]];
        const lowerDivision = country.divisions[divisions[currentIndex + 1]];
        
        const promovidos = division.standings.slice(0, 4);
        const rebaixados = division.standings.slice(-4);
        
        if(upperDivision) {
          upperDivision.teams = [
            ...upperDivision.teams,
            ...promovidos
          ];
        }
        
        if(lowerDivision) {
          lowerDivision.teams = [
            ...rebaixados,
            ...lowerDivision.teams
          ];
        }
        
        division.teams = division.teams.filter(t => 
          !promovidos.some(p => p.name === t.name) &&
          !rebaixados.some(r => r.name === t.name)
        );
      }
    }
  });

  // Verificar conquistas do jogador
  checkChampionshipTitle();
  checkAchievements();
  
  // Resetar estatísticas sazonais
  player.seasonalStats = { goals: 0, assists: 0 };
  
  // Reiniciar temporada
  country.season++;
  country.round = 0;
  initLeague();
  
  // Mostrar evento de transferência
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
  let allTeams = [];
  Object.values(league.countries).forEach(country => {
    Object.values(country.divisions).forEach(div => {
      allTeams = allTeams.concat(div.teams.map(team => ({
        ...team,
        // Garantir que o range seja numérico
        minOverall: Math.min(...team.overallRange),
        maxOverall: Math.max(...team.overallRange)
      })));
    });
  });

  const validTeams = allTeams.filter(team => {
    const [min, max] = team.overallRange;
    return (
      player.overall >= min &&
      player.overall <= max &&
      team.name !== player.club &&
      !player.clubs.includes(team.name) // Evitar retorno a clubes anteriores
    );
  });

  if(validTeams.length > 0 && Math.random() < calculateTransferProbability()) {
    const newClub = getBestOffer(validTeams);
    
    showEvent({
      title: "Oferta de Transferência!",
      text: `${newClub.name} está interessado! (Requer Overall: ${newClub.minOverall}-${newClub.maxOverall})`,
      choices: [{
        text: `Assinar com ${newClub.name} (€${Math.round(player.marketValue * 1.3).toLocaleString()})`,
        action: () => acceptTransfer(newClub),
        tooltip: `+30% Valor de Mercado | +€500k Bônus`
      }, {
        text: "Recusar oferta",
        action: () => refuseTransfer(),
        tooltip: "Mantém-se no clube atual com moral renovada"
      }]
    });
  } else {
    initNewSeason();
  }
}

// Funções auxiliares
function calculateTransferProbability() {
  const baseProb = 0.65;
  const ageFactor = player.age <= 28 ? 1.2 : 0.8;
  return Math.min(0.85, baseProb * ageFactor);
}

function getBestOffer(teams) {
  // Prioriza ligas mais fortes e melhores salários
  return teams.sort((a, b) => 
    b.minOverall - a.minOverall || 
    b.maxOverall - a.maxOverall
  )[0];
}

function acceptTransfer(newClub) {
  player.club = newClub.name;
  player.marketValue = Math.round(player.marketValue * 1.3);
  player.balance += 500000;
  player.clubs.push(newClub.name);
  player.morale = Math.min(100, player.morale + 10);
  addHistoryEvent(`Transferido para ${newClub.name} por €${player.marketValue.toLocaleString()}`);
  initNewSeason();
}

function refuseTransfer() {
  player.morale = Math.min(100, player.morale + 15);
  player.form += 5;
  addHistoryEvent('Recusou proposta de transferência');
  initNewSeason();
}

// Funções de Eventos
function triggerRandomEvent() {
  const event = events[Math.floor(Math.random() * events.length)];
  showEvent(event);
}

function showEvent(event) {
  const modal = document.getElementById('event-modal');
  // Cancelar timeout pendente
  if(modalTimeout) {
    clearTimeout(modalTimeout);
    modalTimeout = null;
  }

  document.getElementById('event-title').textContent = event.title;
  document.getElementById('event-text').textContent = event.text;

  const choices = document.getElementById('event-choices');
  choices.innerHTML = '';
  
  event.choices.forEach(choice => {
      const button = document.createElement('button');
      button.className = 'choice-button';
      button.innerHTML = `${choice.text}<div class="tooltip">${choice.tooltip}</div>`;
      button.onclick = () => {
        // Cancela qualquer timeout pendente
        if (modalTimeout) clearTimeout(modalTimeout);
        // Executa a ação da escolha
        choice.action();
        // Esconde o modal imediatamente
        modal.classList.add('hidden');
        // Atualiza dashboard e gráfico
        updateDashboard();
        updateChart();
    };    
      choices.appendChild(button);
  });
  
  modal.classList.remove('hidden');

  // Fechamento automático após 30 segundos se não houver interação
  modalTimeout = setTimeout(() => {
      if(!modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
          addHistoryEvent('Oportunidade perdida: tempo esgotado');
      }
  }, 30000);
}

function showMessage(message, isSeasonEnd = false) {
  const modal = document.getElementById('event-modal');
    // Cancelar timeout anterior
    if(modalTimeout) {
      clearTimeout(modalTimeout);
      modalTimeout = null;
    }
  const choices = document.getElementById('event-choices');
  
  document.getElementById('event-title').textContent = isSeasonEnd ? 
      "Relatório Final da Temporada" : 
      "Resultado";
  
  document.getElementById('event-text').textContent = message;
  
  choices.innerHTML = isSeasonEnd ? 
      '<button class="choice-button" onclick="document.getElementById(\'event-modal\').classList.add(\'hidden\')">Iniciar Nova Temporada</button>' :
      '<button class="choice-button" onclick="document.getElementById(\'event-modal\').classList.add(\'hidden\')">Continuar</button>';
  
  modal.classList.remove('hidden');
  modalTimeout = setTimeout(() => {
    if(!modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
    }
}, 10000); // 10 segundos para mensagens simples
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



// Controle de Música
let currentTrack = 0;
const musicTracks = ['music2.mp3', 'music1.mp3'];
let audioPlayer = document.getElementById('background-music');
let isAudioInitialized = false;

function initAudio() {
  if (!isAudioInitialized) {
      audioPlayer.volume = 0.15;
      audioPlayer.src = musicTracks[currentTrack];
      audioPlayer.play().catch(() => {});
      audioPlayer.addEventListener('ended', handleAudioEnd);
      isAudioInitialized = true;
      updateMusicButton();
  }
}

function toggleTrack() {
  currentTrack = (currentTrack + 1) % musicTracks.length;
  audioPlayer.src = musicTracks[currentTrack];
  audioPlayer.play();
  updateMusicButton();
}

function handleAudioEnd() {
  currentTrack = (currentTrack + 1) % musicTracks.length;
  audioPlayer.src = musicTracks[currentTrack];
  audioPlayer.play();
  updateMusicButton();
}

function updateMusicButton() {
  const btn = document.getElementById('music-toggle');
  btn.textContent = `🎵${currentTrack + 1}`;
  btn.style.backgroundColor = currentTrack === 0 ? '#4CAF50' : '#2196F3';
}
document.addEventListener('click', function firstInteraction() {
  if (!isAudioInitialized) {
      initAudio();
  }
  document.removeEventListener('click', firstInteraction);
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  checkDomElements();
  updateTrophyCase();
  initLeague();
  initChart();
  updateDashboard();
});