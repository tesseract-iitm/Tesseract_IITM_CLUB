import assert from 'node:assert/strict';
import test from 'node:test';
import { 
  TESSERACT_QUIZZES, 
  calculateQuizScore, 
  type QuizItem, 
  type QuizLeaderboardEntry 
} from '../src/data/quizData.ts';

test('calculateQuizScore computes perfect score for all correct answers', () => {
  const quiz = TESSERACT_QUIZZES[0];
  const perfectAnswers: Record<string, number> = {};
  quiz.questions.forEach((q) => {
    perfectAnswers[q.id] = q.correctAnswerIndex;
  });

  const result = calculateQuizScore(quiz, perfectAnswers);
  assert.equal(result.score, quiz.totalMarks);
  assert.equal(result.correctCount, quiz.questions.length);
  assert.equal(result.incorrectCount, 0);
  assert.equal(result.unansweredCount, 0);
});

test('calculateQuizScore applies negative penalty for incorrect answers', () => {
  const quiz = TESSERACT_QUIZZES[0];
  // 1 correct (+4) and 1 incorrect (-1), rest unanswered (0)
  const q0 = quiz.questions[0];
  const q1 = quiz.questions[1];
  const mixedAnswers: Record<string, number> = {
    [q0.id]: q0.correctAnswerIndex,
    [q1.id]: (q1.correctAnswerIndex + 1) % q1.options.length, // deliberately wrong
  };

  const result = calculateQuizScore(quiz, mixedAnswers);
  assert.equal(result.correctCount, 1);
  assert.equal(result.incorrectCount, 1);
  assert.equal(result.unansweredCount, quiz.questions.length - 2);
  assert.equal(result.score, 4 - 1); // 3
});

test('calculateQuizScore clamps negative scores at zero', () => {
  const mockQuiz: QuizItem = {
    id: 'test-quiz',
    title: 'Penalties Only',
    description: 'Testing clamping',
    category: 'Test',
    durationMinutes: 5,
    totalMarks: 4,
    negativeMarking: 5,
    isActive: true,
    leaderboardEnabled: true,
    attemptsAllowed: 1,
    questions: [
      {
        id: 't1',
        text: 'Question 1',
        options: ['A', 'B'],
        correctAnswerIndex: 0,
        marks: 4,
        explanation: 'Test'
      }
    ]
  };

  const wrongAnswers = { t1: 1 };
  const result = calculateQuizScore(mockQuiz, wrongAnswers);
  assert.equal(result.incorrectCount, 1);
  assert.equal(result.score, 0); // clamped at 0
});

test('leaderboard sorting applies higher score first, lower completion time second', () => {
  const entries: QuizLeaderboardEntry[] = [
    {
      id: '1',
      quizId: 'q1',
      quizTitle: 'Quiz 1',
      userEmail: 'alice@study.iitm.ac.in',
      userName: 'Alice',
      userAvatar: '',
      score: 30,
      timeTakenSeconds: 300,
      isVerified: true
    },
    {
      id: '2',
      quizId: 'q1',
      quizTitle: 'Quiz 1',
      userEmail: 'bob@study.iitm.ac.in',
      userName: 'Bob',
      userAvatar: '',
      score: 35,
      timeTakenSeconds: 400,
      isVerified: true
    },
    {
      id: '3',
      quizId: 'q1',
      quizTitle: 'Quiz 1',
      userEmail: 'charlie@study.iitm.ac.in',
      userName: 'Charlie',
      userAvatar: '',
      score: 35,
      timeTakenSeconds: 250, // Tied with Bob on score, but faster time
      isVerified: true
    }
  ];

  const sorted = [...entries].sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds);

  assert.equal(sorted[0].userName, 'Charlie'); // 35 score in 250s
  assert.equal(sorted[1].userName, 'Bob');     // 35 score in 400s
  assert.equal(sorted[2].userName, 'Alice');   // 30 score in 300s
});
