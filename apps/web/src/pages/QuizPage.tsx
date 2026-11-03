import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Trophy, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Zap 
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { BreadcrumbSchema } from '@/components/ui/schema';
import { Brackets } from '@/components/tesseract';
import { useAuth } from '@/context/AuthContext';
import { 
  TESSERACT_QUIZZES, 
  INITIAL_QUIZ_LEADERBOARD, 
  type QuizItem, 
  type QuizAttempt, 
  type QuizLeaderboardEntry,
  calculateQuizScore 
} from '@/data/quizData';

type QuizState = 'catalog' | 'briefing' | 'runner' | 'results' | 'leaderboard';

function formatTimer(totalSecs: number): string {
  const m = Math.floor(Math.max(0, totalSecs) / 60);
  const s = Math.max(0, totalSecs) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuizPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token } = useAuth();

  const quizzes = TESSERACT_QUIZZES;
  const initialQuizId = searchParams.get('id') || quizzes[0].id;
  const targetQuiz = quizzes.find((q) => q.id === initialQuizId) || quizzes[0];

  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem>(targetQuiz);
  const [quizState, setQuizState] = useState<QuizState>('catalog');

  // Active quiz runner state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(targetQuiz.durationMinutes * 60);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Results & Leaderboard state
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);
  const [leaderboard, setLeaderboard] = useState<QuizLeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem('tesseract_quiz_leaderboard');
      return saved ? JSON.parse(saved) : INITIAL_QUIZ_LEADERBOARD;
    } catch {
      return INITIAL_QUIZ_LEADERBOARD;
    }
  });

  const [completedQuizIds, setCompletedQuizIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('tesseract_completed_quizzes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Finish and compute score
  const handleFinalSubmit = useCallback(() => {
    setShowSubmitModal(false);
    const duration = selectedQuiz.durationMinutes * 60 - timeLeftSeconds;
    const scoreResult = calculateQuizScore(selectedQuiz, answers);

    const studentEmail = user?.email || 'guest.student@study.iitm.ac.in';
    const studentName = user?.name || 'Verified Challenger';

    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      quizId: selectedQuiz.id,
      userEmail: studentEmail,
      userName: studentName,
      score: scoreResult.score,
      totalPossible: scoreResult.totalPossible,
      correctCount: scoreResult.correctCount,
      incorrectCount: scoreResult.incorrectCount,
      unansweredCount: scoreResult.unansweredCount,
      timeTakenSeconds: Math.max(1, duration),
      answers,
      submittedAt: new Date().toISOString(),
    };

    setLastAttempt(attempt);
    setCompletedQuizIds((prev) => {
      const updated = new Set(prev).add(selectedQuiz.id);
      try {
        localStorage.setItem('tesseract_completed_quizzes', JSON.stringify(Array.from(updated)));
      } catch {
        // ignore
      }
      return updated;
    });

    // Append to leaderboard
    const newEntry: QuizLeaderboardEntry = {
      id: attempt.id,
      quizId: selectedQuiz.id,
      quizTitle: selectedQuiz.title,
      userEmail: studentEmail,
      userName: studentName,
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
      score: scoreResult.score,
      timeTakenSeconds: Math.max(1, duration),
      isVerified: Boolean(token),
    };

    setLeaderboard((prev) => {
      const updated = [newEntry, ...prev.filter((e) => e.userEmail !== studentEmail || e.quizId !== selectedQuiz.id)]
        .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds);
      try {
        localStorage.setItem('tesseract_quiz_leaderboard', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setQuizState('results');
    toast.success('Assessment successfully evaluated!');
  }, [selectedQuiz, timeLeftSeconds, answers, user, token]);

  // Timed quiz countdown effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (quizState === 'runner' && timeLeftSeconds > 0) {
      timer = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            toast.error('Time expired! Auto-evaluating responses...');
            handleFinalSubmit();
            return 0;
          }
          if (prev === 60) {
            toast.warning('60 SECONDS REMAINING ON CLOCK', {
              description: 'Please review your remaining questions.'
            });
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizState, timeLeftSeconds, handleFinalSubmit]);

  const handleStartQuiz = () => {
    if (completedQuizIds.has(selectedQuiz.id)) {
      toast.error('Single attempt policy: You have already completed this competitive assessment.');
      return;
    }
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeftSeconds(selectedQuiz.durationMinutes * 60);
    setQuizState('runner');
  };

  const handleSelectOption = (optionIndex: number) => {
    const currentQ = selectedQuiz.questions[currentQuestionIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex
    }));
  };

  const handleClearCurrentOption = () => {
    const currentQ = selectedQuiz.questions[currentQuestionIndex];
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
  };

  const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  const currentQuizLeaderboard = useMemo(() => {
    return leaderboard
      .filter((e) => e.quizId === selectedQuiz.id)
      .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds);
  }, [leaderboard, selectedQuiz.id]);

  return (
    <Layout>
      <SEO
        title="Competitive Quizzes & Evaluations"
        description="Official in-browser competitive quizzes and esports assessments with negative marking and real-time leaderboards."
        url="/quiz"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://tesseract.iitm.ac.in' },
        { name: 'Quiz Platform', url: 'https://tesseract.iitm.ac.in/quiz' },
      ]} />

      {/* Cybernetic Header */}
      <section className="events-hero" style={{ borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <span 
            className="lb-mono"
            style={{
              background: 'rgba(255, 215, 59, 0.12)',
              color: 'var(--c-yellow, #ffd73b)',
              border: '1px solid var(--c-yellow, #ffd73b)',
              padding: '3px 9px',
              fontSize: '11px',
              letterSpacing: '0.12em',
              fontWeight: 700
            }}
          >
            SECTION 12 // EVALUATION PROTOCOL
          </span>
          <span className="lb-kicker" style={{ margin: 0 }}>
            // IN-BROWSER ENGINE • NO EXTERNAL UNSTOP REQUIRED
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="events-title">
              TESSERACT <span className="lb-h-accent">QUIZ PLATFORM</span>
            </h1>
            <p className="lb-sub" style={{ maxWidth: '780px' }}>
              Timed, verified competitive assessments with negative marking penalties and live collegiate leaderboards.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                if (quizState === 'runner') {
                  if (confirm('Leave current quiz session? Your progress will be evaluated as is.')) {
                    handleFinalSubmit();
                  }
                  return;
                }
                setQuizState('catalog');
              }}
              className={quizState === 'catalog' ? 'lb-btn-primary' : 'lb-btn-ghost'}
              style={{ fontSize: '11px', padding: '8px 14px' }}
            >
              ALL QUIZZES
            </button>
            <button
              onClick={() => {
                if (quizState === 'runner') {
                  toast.error('Finish assessment before viewing leaderboards.');
                  return;
                }
                setQuizState('leaderboard');
              }}
              className={quizState === 'leaderboard' ? 'lb-btn-primary' : 'lb-btn-ghost'}
              style={{ fontSize: '11px', padding: '8px 14px' }}
            >
              LEADERBOARD
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
         STATE 1: CATALOG VIEW
         ========================================================================= */}
      {quizState === 'catalog' && (
        <section style={{ padding: '32px 40px', minHeight: '500px' }}>
          <div className="lb-sect-head" style={{ marginBottom: '24px' }}>
            <div>
              <div className="lb-kicker">// active modules · {quizzes.length} available</div>
              <h2 className="lb-section-title">ACTIVE COMPETITIVE ASSESSMENTS</h2>
            </div>
            <div className="lb-kicker-right">engine · ready</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
            {quizzes.map((quiz, idx) => {
              const isCompleted = completedQuizIds.has(quiz.id);
              const accent = idx === 0 ? 'yellow' : 'cyan';

              return (
                <div
                  key={quiz.id}
                  className="card-hover"
                  style={{
                    background: 'var(--bg-1)',
                    border: '1px solid var(--line-2)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderTop: `2px solid var(--c-${accent})`, borderLeft: `2px solid var(--c-${accent})` }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderTop: `2px solid var(--c-${accent})`, borderRight: `2px solid var(--c-${accent})` }} />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <span
                        className="lb-mono"
                        style={{
                          background: `rgba(255, 255, 255, 0.06)`,
                          color: `var(--c-${accent})`,
                          border: `1px solid var(--c-${accent})`,
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 700
                        }}
                      >
                        #{quiz.category.toLowerCase().replace(/\s+/g, '_')}
                      </span>
                      {isCompleted && (
                        <span className="lb-mono" style={{ color: 'var(--c-green)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> COMPLETED
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '18px', color: '#fff', margin: '0 0 10px', lineHeight: 1.3 }}>
                      {quiz.title}
                    </h3>

                    <p style={{ fontSize: '13px', color: 'var(--fg-dim)', lineHeight: 1.5, margin: '0 0 18px' }}>
                      {quiz.description}
                    </p>

                    {/* Metadata Chips */}
                    <div style={{
                      background: 'var(--bg)',
                      border: '1px dashed var(--line-2)',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '11px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ color: 'var(--fg-mute)' }}>
                        DURATION: <b style={{ color: '#fff' }}>{quiz.durationMinutes} MIN</b>
                      </div>
                      <div style={{ color: 'var(--fg-mute)' }}>
                        ITEMS: <b style={{ color: '#fff' }}>{quiz.questions.length} Qs</b>
                      </div>
                      <div style={{ color: 'var(--c-green)' }}>
                        MAX MARKS: <b>+{quiz.totalMarks}</b>
                      </div>
                      <div style={{ color: 'var(--c-red)' }}>
                        PENALTY: <b>-{quiz.negativeMarking}</b>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedQuiz(quiz);
                        setSearchParams({ id: quiz.id });
                        setQuizState('briefing');
                      }}
                      className="lb-btn-primary"
                      style={{ flex: 1, padding: '10px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <span>{isCompleted ? 'REVIEW MODULE' : 'START ASSESSMENT'}</span>
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedQuiz(quiz);
                        setQuizState('leaderboard');
                      }}
                      className="lb-btn-ghost"
                      style={{ padding: '10px 14px', fontSize: '11px' }}
                      title="View Rankings"
                    >
                      <Trophy size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
         STATE 2: BRIEFING & RULES VIEW
         ========================================================================= */}
      {quizState === 'briefing' && (
        <section style={{ padding: '32px 40px', maxWidth: '840px', margin: '0 auto' }}>
          <Brackets tag="module_briefing" accent="yellow">
            <div style={{ padding: '24px 30px' }}>
              <button
                onClick={() => setQuizState('catalog')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--fg-mute)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '11px',
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
              >
                <ArrowLeft size={14} />
                <span>BACK TO QUIZ CATALOG</span>
              </button>

              <h2 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '24px', color: '#fff', margin: '0 0 12px' }}>
                {selectedQuiz.title}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--fg-dim)', lineHeight: 1.6, marginBottom: '24px' }}>
                {selectedQuiz.description}
              </p>

              {/* Assessment Rules Matrix */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', padding: '20px', marginBottom: '24px' }}>
                <div className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-yellow)', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  // OFFICIAL REGULATIONS & PROTOCOLS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--fg-mute)' }}>CLOCK DURATION:</span>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                      {selectedQuiz.durationMinutes} Minutes (Continuous)
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--fg-mute)' }}>SCORING SCHEME:</span>
                    <div style={{ color: 'var(--c-green)', fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                      +4 Marks Correct / -{selectedQuiz.negativeMarking} Penalty
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--fg-mute)' }}>TOTAL CAPACITY:</span>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                      {selectedQuiz.questions.length} Items ({selectedQuiz.totalMarks} Total Points)
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--fg-mute)' }}>ATTEMPTS POLICY:</span>
                    <div style={{ color: 'var(--c-cyan)', fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                      1 Verified Attempt Allowed
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning Callout */}
              <div 
                style={{
                  background: 'rgba(255, 170, 0, 0.08)',
                  border: '1px solid var(--c-yellow)',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '28px'
                }}
              >
                <AlertTriangle size={20} style={{ color: 'var(--c-yellow)', flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: 'var(--fg)', lineHeight: 1.5 }}>
                  Once the countdown timer begins, you cannot pause or restart. If time runs out, answers are automatically compiled and submitted.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleStartQuiz}
                  className="lb-btn-primary lb-btn-lg"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Zap size={16} />
                  <span>START TIMED ASSESSMENT</span>
                </button>
                <button
                  onClick={() => setQuizState('leaderboard')}
                  className="lb-btn-ghost lb-btn-lg"
                >
                  VIEW CURRENT RANKINGS
                </button>
              </div>
            </div>
          </Brackets>
        </section>
      )}

      {/* =========================================================================
         STATE 3: TIMED QUIZ RUNNER
         ========================================================================= */}
      {quizState === 'runner' && (
        <section style={{ padding: '24px 40px', maxWidth: '920px', margin: '0 auto' }}>
          {/* Top HUD Bar */}
          <div 
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)', letterSpacing: '0.1em' }}>
                // MODULE: {selectedQuiz.title.toUpperCase()}
              </div>
              <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '16px', color: '#fff', marginTop: '2px' }}>
                QUESTION {currentQuestionIndex + 1} OF {selectedQuiz.questions.length}
              </div>
            </div>

            {/* Countdown Clock Display */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: timeLeftSeconds <= 60 ? 'rgba(255, 59, 48, 0.2)' : 'var(--bg)',
                border: `1px solid ${timeLeftSeconds <= 60 ? 'var(--c-red)' : 'var(--line-2)'}`,
                padding: '8px 16px',
                fontFamily: '"JetBrains Mono", monospace',
                color: timeLeftSeconds <= 60 ? 'var(--c-red)' : 'var(--c-yellow)',
                fontWeight: 800,
                fontSize: '18px',
                animation: timeLeftSeconds <= 60 ? 'pulse 1s infinite' : 'none'
              }}
            >
              <Clock size={18} />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>
          </div>

          {/* Question Navigator Palette */}
          <div 
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--line-2)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}
          >
            <span className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)', marginRight: '6px' }}>
              ITEMS [{answeredCount}/{selectedQuiz.questions.length}]:
            </span>
            {selectedQuiz.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: isCurrent ? 'var(--c-yellow)' : isAnswered ? 'rgba(0, 255, 102, 0.15)' : 'var(--bg)',
                    color: isCurrent ? '#000' : isAnswered ? 'var(--c-green)' : 'var(--fg-mute)',
                    border: `1px solid ${isCurrent ? 'var(--c-yellow)' : isAnswered ? 'var(--c-green)' : 'var(--line-2)'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Question Box */}
          <Brackets tag={`item_${currentQuestionIndex + 1}_of_${selectedQuiz.questions.length}`} accent="yellow">
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-yellow)', letterSpacing: '0.1em' }}>
                  VALUE: +{currentQuestion.marks} MARKS / -{selectedQuiz.negativeMarking} PENALTY
                </span>
                {answers[currentQuestion.id] !== undefined && (
                  <span className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-green)' }}>
                    ✓ ANSWER RECORDED
                  </span>
                )}
              </div>

              <h2 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '20px', color: '#fff', lineHeight: 1.4, marginBottom: '24px' }}>
                {currentQuestion.text}
              </h2>

              {/* Options Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                {currentQuestion.options.map((opt, optIdx) => {
                  const isSelected = answers[currentQuestion.id] === optIdx;

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className="card-hover"
                      style={{
                        padding: '14px 18px',
                        background: isSelected ? 'rgba(255, 215, 59, 0.12)' : 'var(--bg)',
                        border: `1px solid ${isSelected ? 'var(--c-yellow)' : 'var(--line-2)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '2px',
                          border: `1px solid ${isSelected ? 'var(--c-yellow)' : 'var(--fg-mute)'}`,
                          background: isSelected ? 'var(--c-yellow)' : 'transparent',
                          color: isSelected ? '#000' : 'var(--fg-mute)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0
                        }}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <span style={{ fontSize: '14px', color: isSelected ? '#fff' : 'var(--fg-dim)', fontWeight: isSelected ? 600 : 400 }}>
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Question Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    className="lb-btn-ghost"
                    style={{ fontSize: '11px', padding: '8px 14px', opacity: currentQuestionIndex === 0 ? 0.4 : 1 }}
                  >
                    ← PREVIOUS
                  </button>
                  {answers[currentQuestion.id] !== undefined && (
                    <button
                      onClick={handleClearCurrentOption}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--c-red)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '8px 12px'
                      }}
                    >
                      CLEAR CHOICE
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      className="lb-btn-primary"
                      style={{ fontSize: '11px', padding: '8px 18px' }}
                    >
                      NEXT QUESTION →
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="lb-btn-primary"
                      style={{ fontSize: '11px', padding: '8px 18px', background: 'var(--c-green)', color: '#000' }}
                    >
                      SUBMIT ASSESSMENT ✓
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Brackets>

          {/* Submit Confirmation Modal */}
          {showSubmitModal && (
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}
            >
              <div style={{ background: 'var(--bg-1)', border: '1px solid var(--c-yellow)', maxWidth: '440px', width: '100%', padding: '24px' }}>
                <div className="lb-mono" style={{ color: 'var(--c-yellow)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  // CONFIRM FINAL SUBMISSION
                </div>
                <h3 style={{ fontFamily: '"Audiowide", sans-serif', color: '#fff', fontSize: '18px', margin: '0 0 12px' }}>
                  Ready to calculate your score?
                </h3>
                <p style={{ color: 'var(--fg-dim)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 16px' }}>
                  You have recorded answers for <b>{answeredCount} of {selectedQuiz.questions.length}</b> questions.
                  Unanswered items receive 0 marks; incorrect answers incur a 1-mark penalty.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowSubmitModal(false)}
                    className="lb-btn-ghost"
                    style={{ fontSize: '11px', padding: '8px 14px' }}
                  >
                    CONTINUE QUIZ
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    className="lb-btn-primary"
                    style={{ fontSize: '11px', padding: '8px 16px', background: 'var(--c-green)', color: '#000' }}
                  >
                    CONFIRM & SUBMIT
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
         STATE 4: RESULTS & REVIEW VIEW
         ========================================================================= */}
      {quizState === 'results' && lastAttempt && (
        <section style={{ padding: '32px 40px', maxWidth: '880px', margin: '0 auto' }}>
          <Brackets tag="evaluation_summary" accent="green">
            <div style={{ padding: '28px 32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div 
                  className="lb-mono"
                  style={{
                    color: 'var(--c-green)',
                    background: 'rgba(0, 255, 102, 0.1)',
                    display: 'inline-block',
                    padding: '4px 12px',
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    fontWeight: 700,
                    marginBottom: '12px'
                  }}
                >
                  ASSESSMENT COMPLETED
                </div>
                <h2 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '32px', color: '#fff', margin: '0 0 8px' }}>
                  SCORE: {lastAttempt.score} / {lastAttempt.totalPossible}
                </h2>
                <p style={{ color: 'var(--fg-dim)', fontSize: '13px' }}>
                  Completed in {formatTimer(lastAttempt.timeTakenSeconds)} • Tie-breaker formula: higher score first, lower completion time second.
                </p>
              </div>

              {/* KPI Breakdown Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', padding: '16px', textAlign: 'center' }}>
                  <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)' }}>CORRECT ITEMS (+4)</div>
                  <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '24px', color: 'var(--c-green)', marginTop: '4px' }}>
                    {lastAttempt.correctCount}
                  </div>
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', padding: '16px', textAlign: 'center' }}>
                  <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)' }}>INCORRECT (-1 PENALTY)</div>
                  <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '24px', color: 'var(--c-red)', marginTop: '4px' }}>
                    {lastAttempt.incorrectCount}
                  </div>
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', padding: '16px', textAlign: 'center' }}>
                  <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--fg-mute)' }}>UNANSWERED (0)</div>
                  <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '24px', color: 'var(--fg-mute)', marginTop: '4px' }}>
                    {lastAttempt.unansweredCount}
                  </div>
                </div>
              </div>

              {/* Question By Question Explanations */}
              <div style={{ marginBottom: '32px' }}>
                <div className="lb-mono" style={{ fontSize: '11px', color: 'var(--c-yellow)', letterSpacing: '0.1em', marginBottom: '16px' }}>
                  // TACTICAL BREAKDOWN & EXPLANATIONS
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedQuiz.questions.map((q, idx) => {
                    const userAns = lastAttempt.answers[q.id];
                    const isCorrect = userAns === q.correctAnswerIndex;
                    const isUnanswered = userAns === undefined;

                    return (
                      <div
                        key={q.id}
                        style={{
                          background: 'var(--bg)',
                          border: `1px solid ${isCorrect ? 'rgba(0, 255, 102, 0.4)' : isUnanswered ? 'var(--line-2)' : 'rgba(255, 59, 48, 0.4)'}`,
                          padding: '16px 20px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="lb-mono" style={{ fontSize: '11px', color: 'var(--fg-mute)' }}>
                            ITEM #{idx + 1}
                          </span>
                          <span 
                            className="lb-mono"
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isCorrect ? 'var(--c-green)' : isUnanswered ? 'var(--fg-mute)' : 'var(--c-red)'
                            }}
                          >
                            {isCorrect ? '+4 MARKS (CORRECT)' : isUnanswered ? '0 MARKS (SKIPPED)' : '-1 MARK (INCORRECT)'}
                          </span>
                        </div>

                        <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '10px' }}>
                          {q.text}
                        </div>

                        <div style={{ fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--fg-mute)' }}>Your Answer: </span>
                          <b style={{ color: isCorrect ? 'var(--c-green)' : 'var(--c-red)' }}>
                            {userAns !== undefined ? q.options[userAns] : 'None (Unanswered)'}
                          </b>
                        </div>

                        {!isCorrect && (
                          <div style={{ fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--fg-mute)' }}>Correct Answer: </span>
                            <b style={{ color: 'var(--c-green)' }}>{q.options[q.correctAnswerIndex]}</b>
                          </div>
                        )}

                        <div style={{ fontSize: '12px', color: 'var(--fg-dim)', lineHeight: 1.5, marginTop: '8px', borderTop: '1px dashed var(--line-2)', paddingTop: '8px' }}>
                          <span style={{ color: 'var(--c-cyan)', fontWeight: 600 }}>Debrief: </span>
                          {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setQuizState('leaderboard')}
                  className="lb-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '11px' }}
                >
                  <Trophy size={14} />
                  <span>VIEW TOURNAMENT LEADERBOARD</span>
                </button>
                <button
                  onClick={() => setQuizState('catalog')}
                  className="lb-btn-ghost"
                  style={{ padding: '10px 18px', fontSize: '11px' }}
                >
                  RETURN TO ALL QUIZZES
                </button>
              </div>
            </div>
          </Brackets>
        </section>
      )}

      {/* =========================================================================
         STATE 5: LEADERBOARD VIEW
         ========================================================================= */}
      {quizState === 'leaderboard' && (
        <section style={{ padding: '32px 40px', maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="lb-mono" style={{ fontSize: '10px', color: 'var(--c-cyan)', letterSpacing: '0.12em' }}>
                // SECTION 13 // RANKINGS MATRIX
              </div>
              <h2 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '24px', color: '#fff', margin: '4px 0 0' }}>
                {selectedQuiz.title}
              </h2>
            </div>

            <button
              onClick={() => setQuizState('catalog')}
              className="lb-btn-ghost"
              style={{ fontSize: '11px', padding: '8px 14px' }}
            >
              ← RETURN TO QUIZZES
            </button>
          </div>

          <Brackets tag="leaderboard_table" accent="blue">
            <div style={{ padding: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line-2)', color: 'var(--fg-mute)', fontSize: '11px' }}>
                    <th style={{ padding: '12px 14px' }}>RANK</th>
                    <th style={{ padding: '12px 14px' }}>CHALLENGER</th>
                    <th style={{ padding: '12px 14px' }}>SCORE (MAX {selectedQuiz.totalMarks})</th>
                    <th style={{ padding: '12px 14px' }}>COMPLETION TIME</th>
                    <th style={{ padding: '12px 14px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentQuizLeaderboard.map((item, idx) => {
                    const isUserRow = item.userEmail === user?.email;
                    const rankColor = idx === 0 ? 'var(--c-yellow)' : idx === 1 ? 'var(--c-cyan)' : idx === 2 ? 'var(--c-orange)' : '#fff';

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--line-2)',
                          background: isUserRow ? 'rgba(255, 215, 59, 0.08)' : idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '14px', fontWeight: 800, fontSize: '14px', color: rankColor }}>
                          #{idx + 1}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={item.userAvatar}
                              alt={item.userName}
                              style={{ width: '28px', height: '28px', borderRadius: '2px', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff' }}>
                                {item.userName} {isUserRow && <span style={{ color: 'var(--c-yellow)', fontSize: '10px' }}>(YOU)</span>}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--fg-mute)' }}>
                                {item.userEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px', fontWeight: 800, fontSize: '15px', color: 'var(--c-green)' }}>
                          {item.score}
                        </td>
                        <td style={{ padding: '14px', color: 'var(--c-cyan)' }}>
                          {formatTimer(item.timeTakenSeconds)}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span 
                            className="lb-mono"
                            style={{
                              background: 'rgba(0, 255, 102, 0.12)',
                              color: 'var(--c-green)',
                              border: '1px solid var(--c-green)',
                              padding: '2px 8px',
                              fontSize: '9px',
                              fontWeight: 700
                            }}
                          >
                            VERIFIED
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Brackets>
        </section>
      )}
    </Layout>
  );
}
