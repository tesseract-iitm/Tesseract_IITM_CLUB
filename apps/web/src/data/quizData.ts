export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  marks: number;
  explanation: string;
}

export interface QuizItem {
  id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarking: number;
  isActive: boolean;
  leaderboardEnabled: boolean;
  attemptsAllowed: number;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userEmail: string;
  userName: string;
  score: number;
  totalPossible: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeTakenSeconds: number;
  answers: Record<string, number>;
  submittedAt: string;
}

export interface QuizLeaderboardEntry {
  id: string;
  quizId: string;
  quizTitle: string;
  userEmail: string;
  userName: string;
  userAvatar: string;
  score: number;
  timeTakenSeconds: number;
  isVerified: boolean;
}

export const TESSERACT_QUIZZES: QuizItem[] = [
  {
    id: 'quiz-tactical-meta',
    title: 'Tactical Meta & Esports History Quiz (Vol. 01)',
    description: '10 high-octane questions on tactical shooter mechanics, legendary tournament clutch plays, and esports trivia. Timed, single-attempt, competitive leaderboard enabled.',
    category: 'Competitive Trivia',
    durationMinutes: 10,
    totalMarks: 40,
    negativeMarking: 1,
    isActive: true,
    leaderboardEnabled: true,
    attemptsAllowed: 1,
    questions: [
      {
        id: 'q1',
        text: 'In Valorant, what is the maximum duration in seconds that a standard Spike takes to detonate after being planted?',
        options: ['40 seconds', '45 seconds', '35 seconds', '50 seconds'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'A planted Spike in Valorant takes exactly 45 seconds to detonate, with audio cues ramping up at 20s and 10s.'
      },
      {
        id: 'q2',
        text: 'Which legendary Counter-Strike tournament play earned coldzera an in-game jumping AWP graffiti on Mirage B Apartments?',
        options: [
          'DreamHack Winter 2014',
          'MLG Major Championship: Columbus 2016',
          'ESL One Cologne 2015',
          'ELEAGUE Major Boston 2018'
        ],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'Coldzera executed the iconic jumping 4K collateral with the AWP at MLG Columbus 2016 against Team Liquid.'
      },
      {
        id: 'q3',
        text: 'What was the first year that IIT Madras BS Degree officially sanctioned the Tesseract Esports Society?',
        options: ['2021', '2022', '2023', '2024'],
        correctAnswerIndex: 3,
        marks: 4,
        explanation: 'Tesseract was officially ratified as the premier gaming & esports society for the IITM BS Degree student body in 2024.'
      },
      {
        id: 'q4',
        text: 'In standard competitive Rocket League Soccar, how long is the base regulation match clock?',
        options: ['5 minutes', '7 minutes', '10 minutes', '3 minutes'],
        correctAnswerIndex: 0,
        marks: 4,
        explanation: 'A standard match lasts 5 minutes of active clock time, excluding stoppages and sudden-death overtime.'
      },
      {
        id: 'q5',
        text: 'In competitive chess notation, what does the suffix symbol "!!" represent?',
        options: ['Blunder', 'Brilliant move', 'Checkmate', 'Interesting move'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: '"!!" denotes a brilliant, non-obvious move that often involves a tactical sacrifice for decisive advantage.'
      },
      {
        id: 'q6',
        text: 'Which weapon in Counter-Strike 2 yields the highest kill award bonus ($900) in standard competitive economy?',
        options: ['AWP', 'Shotguns (e.g. Nova, XM1014)', 'P90', 'Desert Eagle'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'Shotguns reward $900 in CS2, providing a massive economic boost on anti-eco rounds.'
      },
      {
        id: 'q7',
        text: 'What is the maximum number of players that can compete simultaneously in a standard BGMI battle royale lobby?',
        options: ['64 players', '100 players', '128 players', '80 players'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'Classic Battlegrounds lobbies feature up to 100 players (or 25 four-man squads).'
      },
      {
        id: 'q8',
        text: 'What is the approved primary email domain for verified student accounts on Tesseract IIT Madras BS?',
        options: ['@gmail.com', '@study.iitm.ac.in', '@alumni.iitm.ac.in', '@esports.iitm.edu'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'All active student emails follow the official IIT Madras BS domain `@study.iitm.ac.in` (including ds, es, and ae).'
      },
      {
        id: 'q9',
        text: 'In Valorant, which agent’s ultimate ability is named "Lockdown"?',
        options: ['Killjoy', 'Cypher', 'Deadlock', 'Breach'],
        correctAnswerIndex: 0,
        marks: 4,
        explanation: 'Killjoy deploys the Lockdown device which detains all enemies caught in its wide radius after a brief wind-up.'
      },
      {
        id: 'q10',
        text: 'What is the primary motto and positioning statement of Tesseract Esports Society?',
        options: [
          'We Play For Trophies',
          'Where IITM Students Play, Compete & Connect',
          'The Premier Tech Guild of India',
          'Gaming Without Limits'
        ],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'The official motto is "Where IITM Students Play, Compete & Connect".'
      }
    ]
  },
  {
    id: 'quiz-gaming-lore',
    title: 'Gaming Lore, Mechanics & Engine Architecture',
    description: 'Explore the internal logic of modern gaming engines, hitscan vs projectile ballistics, tick rates, and gaming culture.',
    category: 'Game Tech & Lore',
    durationMinutes: 8,
    totalMarks: 32,
    negativeMarking: 1,
    isActive: true,
    leaderboardEnabled: true,
    attemptsAllowed: 1,
    questions: [
      {
        id: 'l1',
        text: 'What game engine powers Epic Games\' Unreal Tournament and Fortnite?',
        options: ['Source 2', 'Unity', 'Unreal Engine', 'CryEngine'],
        correctAnswerIndex: 2,
        marks: 4,
        explanation: 'Unreal Engine was originally developed by Tim Sweeney and Epic Games in 1998.'
      },
      {
        id: 'l2',
        text: 'What is the difference between "Hitscan" and "Projectile" weapons in multiplayer FPS?',
        options: [
          'Hitscan weapons deal damage instantly along a raycast; Projectile weapons simulate velocity and travel time',
          'Hitscan is melee only; Projectile is ranged only',
          'Hitscan weapons pierce walls; Projectiles explode on impact',
          'There is no difference; they are synonymous'
        ],
        correctAnswerIndex: 0,
        marks: 4,
        explanation: 'Hitscan calculates line-of-sight intersection instantaneously upon trigger pull, whereas projectile weapons calculate velocity and bullet drop.'
      },
      {
        id: 'l3',
        text: 'In multiplayer networking, what does a server "tick rate" of 128Hz indicate?',
        options: [
          'The display refreshes 128 times per second',
          'The server calculates game world physics and network state updates 128 times per second',
          'The player must click 128 times to shoot',
          'The network latency is capped at 128 milliseconds'
        ],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'Tick rate defines the frequency at which the game server processes inputs and computes physics states each second.'
      },
      {
        id: 'l4',
        text: 'Which legendary 1993 id Software title pioneered shareware distribution and network deathmatch multiplayer?',
        options: ['Wolfenstein 3D', 'DOOM', 'Quake', 'Half-Life'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'DOOM revolutionized gaming in 1993 with pioneering network deathmatches and 3D graphics.'
      },
      {
        id: 'l5',
        text: 'What does "strafe-jumping" or "bunny-hopping" exploit in classic Quake-engine derived physics?',
        options: [
          'Memory leaks in rendering buffer',
          'Vector addition of player movement acceleration while airborne with continuous ground jumps',
          'Overclocked CPU cycles',
          'Graphic card driver desynchronization'
        ],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'Air acceleration math in the Quake engine did not clamp velocity along perpendicular axes when jumping repeatedly, enabling compounding speed gains.'
      },
      {
        id: 'l6',
        text: 'Which of the following is considered an Anti-Cheat driver level in modern competitive titles (e.g., Vanguard, BattlEye)?',
        options: ['User space Ring 3', 'Kernel space Ring 0', 'Application Sandbox', 'Browser WebAssembly'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'Kernel space Ring 0 drivers operate at the lowest OS privilege level to detect unauthorized memory injection tools.'
      },
      {
        id: 'l7',
        text: 'In MOBA design (such as Dota 2 or League of Legends), what does the term "CS" commonly abbreviate?',
        options: ['Critical Strike', 'Creep Score', 'Crowd Stun', 'Combat Shield'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'Creep Score (CS) indicates the total number of neutral or enemy minions/creeps a player has scored the killing blow on.'
      },
      {
        id: 'l8',
        text: 'In fighting game community (FGC) frame data, what is the term for the window of time before an attack becomes active?',
        options: ['Recovery frames', 'Startup frames', 'Active frames', 'Hitstun'],
        correctAnswerIndex: 1,
        marks: 4,
        explanation: 'Startup frames represent the initial startup animation time before the offensive hitbox becomes active.'
      }
    ]
  }
];

export const INITIAL_QUIZ_LEADERBOARD: QuizLeaderboardEntry[] = [
  {
    id: 'lb-1',
    quizId: 'quiz-tactical-meta',
    quizTitle: 'Tactical Meta & Esports History Quiz (Vol. 01)',
    userEmail: '22f1001234@study.iitm.ac.in',
    userName: 'Karthik Raman',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80',
    score: 40,
    timeTakenSeconds: 245,
    isVerified: true
  },
  {
    id: 'lb-2',
    quizId: 'quiz-tactical-meta',
    quizTitle: 'Tactical Meta & Esports History Quiz (Vol. 01)',
    userEmail: '23f2005678@study.iitm.ac.in',
    userName: 'Ananya Sharma',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
    score: 36,
    timeTakenSeconds: 310,
    isVerified: true
  },
  {
    id: 'lb-3',
    quizId: 'quiz-tactical-meta',
    quizTitle: 'Tactical Meta & Esports History Quiz (Vol. 01)',
    userEmail: '21f3009012@study.iitm.ac.in',
    userName: 'Rohan Deshmukh',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80',
    score: 35,
    timeTakenSeconds: 340,
    isVerified: true
  },
  {
    id: 'lb-4',
    quizId: 'quiz-tactical-meta',
    quizTitle: 'Tactical Meta & Esports History Quiz (Vol. 01)',
    userEmail: '24f1003456@study.iitm.ac.in',
    userName: 'Vikram Sengupta',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
    score: 31,
    timeTakenSeconds: 410,
    isVerified: true
  },
  {
    id: 'lb-5',
    quizId: 'quiz-tactical-meta',
    quizTitle: 'Tactical Meta & Esports History Quiz (Vol. 01)',
    userEmail: '22f3007890@study.iitm.ac.in',
    userName: 'Priya Sundaram',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80',
    score: 28,
    timeTakenSeconds: 460,
    isVerified: true
  }
];

export function calculateQuizScore(
  quiz: QuizItem,
  answers: Record<string, number>
): {
  score: number;
  totalPossible: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
} {
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  quiz.questions.forEach((q) => {
    const selected = answers[q.id];
    if (selected === undefined) {
      unansweredCount++;
    } else if (selected === q.correctAnswerIndex) {
      correctCount++;
      score += q.marks;
    } else {
      incorrectCount++;
      score -= quiz.negativeMarking;
    }
  });

  return {
    score: Math.max(0, score),
    totalPossible: quiz.totalMarks,
    correctCount,
    incorrectCount,
    unansweredCount
  };
}
