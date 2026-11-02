import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  Copy,
  Check,
  RotateCcw,
  LogOut,
  Zap,
  Play,
  Users,
  Crown,
  Share2,
  Activity,
  ArrowRight,
  Flame,
} from 'lucide-react';
import {
  api,
  SOCKET_URL,
  type TypeWarsRoom,
  type GameDifficulty,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayLoading, PlayShell } from './PlayShell';
import { Brackets } from '@/components/tesseract';

export default function TypeWarsPlay() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();

  const socketRef = useRef<Socket | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const [room, setRoom] = useState<TypeWarsRoom | null>(null);
  const [passage, setPassage] = useState('');
  const [typed, setTyped] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('MEDIUM');
  const [liveProgressMap, setLiveProgressMap] = useState<Record<string, number>>({});

  const roomCodeFromUrl = params.get('room');

  // Clean room reset
  const handleLeaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('room:leave');
      socketRef.current.disconnect();
    }
    setRoom(null);
    setPassage('');
    setTyped('');
    setCountdown(null);
    setLiveProgressMap({});
    setParams({});
  }, [setParams]);

  // Connect to the Type Wars Socket.io room
  const connectSocket = useCallback(
    (roomCode: string) => {
      if (!token) return;
      socketRef.current?.disconnect();

      const socket = io(`${SOCKET_URL}/games/type-wars`, {
        transports: ['polling', 'websocket'],
        auth: { token },
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit(
          'room:join',
          { code: roomCode },
          (response: { ok: boolean; room?: TypeWarsRoom; error?: string }) => {
            if (!response.ok) {
              toast.error(response.error || 'Failed to join game room');
            }
            if (response.room) {
              setRoom(response.room);
              if (response.room.passage?.text) {
                setPassage(response.room.passage.text);
              }
            }
          },
        );
      });

      socket.on('room:state', (nextRoom: TypeWarsRoom) => {
        setRoom(nextRoom);
        if (nextRoom.passage?.text) {
          setPassage(nextRoom.passage.text);
        }
      });

      socket.on('room:host_migrated', ({ newHostUserId }: { newHostUserId: string }) => {
        if (newHostUserId === user?.id) {
          toast.success('You are now the room host!');
        } else {
          toast.info('Room host changed');
        }
      });

      socket.on('race:countdown', ({ value }: { value: number }) => {
        setCountdown(value);
      });

      socket.on(
        'race:start',
        ({
          startedAt,
          passage: nextPassage,
        }: {
          startedAt: number;
          passage: { text: string };
        }) => {
          startedAtRef.current = startedAt;
          setCountdown(null);
          setPassage(nextPassage.text);
          setTyped('');
          setElapsedSeconds(0);
          setLiveProgressMap({});

          // Start client timer
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = window.setInterval(() => {
            if (startedAtRef.current) {
              setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
            }
          }, 500);

          // Focus typing input
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        },
      );

      // Listen to real-time participant progress tick!
      socket.on('progress:tick', ({ userId, charsTyped }: { userId: string; charsTyped: number }) => {
        setLiveProgressMap((prev) => ({
          ...prev,
          [userId]: charsTyped,
        }));
      });

      socket.on('room:rematched', () => {
        setTyped('');
        setCountdown(null);
        setElapsedSeconds(0);
        setLiveProgressMap({});
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        toast.success('Rematch started! Ready up for the next race.');
      });

      socket.on('race:results', () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        void queryClient.invalidateQueries({ queryKey: ['games-leaderboard'] });
        toast.success('Race complete! Results submitted.');
      });

      socket.on('room:aborted', () => {
        toast.error('The room was closed.');
        handleLeaveRoom();
      });
    },
    [token, user?.id, queryClient, handleLeaveRoom],
  );

  // Initial load or param sync
  useEffect(() => {
    if (roomCodeFromUrl && token) {
      api
        .getTypeWarsRoom(roomCodeFromUrl, token)
        .then(({ room: fetched }) => {
          setRoom(fetched);
          if (fetched.passage?.text) setPassage(fetched.passage.text);
          connectSocket(fetched.code);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : 'Failed to load room');
          setParams({});
        });
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      socketRef.current?.disconnect();
    };
  }, [roomCodeFromUrl, token, connectSocket, setParams]);

  // Create room
  const handleCreateRoom = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api.createTypeWarsRoom(token, {
        passageDifficulty: difficulty,
      });
      setRoom(response.room);
      setPassage(response.passage.text);
      setParams({ room: response.code });
      connectSocket(response.code);
      toast.success(`Race room #${response.code} created!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  // Join room
  const handleJoinRoom = async (codeToJoin: string) => {
    if (!token) return;
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a room code');
      return;
    }
    setLoading(true);
    try {
      const response = await api.joinTypeWarsRoom(cleanCode, token);
      setRoom(response.room);
      setParams({ room: response.room.code });
      connectSocket(response.room.code);
      toast.success(`Joined room #${response.room.code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  // Copy code helper
  const copyRoomCode = () => {
    if (!room) return;
    void navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    toast.success('Room code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy invite link helper
  const copyInviteLink = () => {
    if (!room) return;
    const url = `${window.location.origin}/games/type-wars/play?room=${room.code}`;
    void navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Invite link copied! Share with competitors.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Finish race
  const handleFinish = (finalTyped: string) => {
    if (!room || !startedAtRef.current) return;
    const correctChars = Array.from(finalTyped).filter(
      (char, index) => char === passage[index],
    ).length;

    socketRef.current?.emit('progress:finish', {
      charsTyped: finalTyped.length,
      correctChars,
    });
  };

  // Handle typing change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value.length > passage.length) return;

    setTyped(value);

    // Throttle progress emissions
    socketRef.current?.emit('progress:update', {
      charsTyped: value.length,
    });

    if (value.length >= passage.length && passage.length > 0) {
      handleFinish(value);
    }
  };

  // Rematch inside existing room
  const handleRematch = () => {
    if (!room || !socketRef.current) return;
    socketRef.current.emit(
      'room:rematch',
      { difficulty },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok) {
          toast.error(res.error || 'Failed to trigger rematch');
        }
      },
    );
  };

  // Real-time typing telemetry
  const stats = useMemo(() => {
    const correct = Array.from(typed).filter((char, index) => char === passage[index]).length;
    const elapsedMinutes = startedAtRef.current
      ? Math.max((Date.now() - startedAtRef.current) / 60000, 1 / 60)
      : 1;

    const wpm = Math.max(0, Math.round(correct / 5 / elapsedMinutes));
    const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 100;
    const progressPercent = passage.length
      ? Math.min(100, Math.round((typed.length / passage.length) * 100))
      : 0;

    return {
      wpm,
      accuracy,
      progressPercent,
      correctChars: correct,
      errorsCount: typed.length - correct,
    };
  }, [passage, typed]);

  // Is current user host?
  const isHost = room?.hostUserId === user?.id;
  const currentParticipant = room?.participants.find((p) => p.userId === user?.id);

  if (!token) {
    return (
      <PlayShell title="TYPE WARS">
        <PlayError message="Please sign in with your student account to enter Type Wars arena." />
      </PlayShell>
    );
  }

  return (
    <PlayShell title="TYPE WARS" accent="yellow">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* VIEW 1: LOBBY SELECTOR / JOIN FORM (when not in a room) */}
        {!room && (
          <div className="space-y-8 py-4">
            {/* Arena Banner */}
            <div className="border border-[var(--c-yellow-soft)] bg-[rgba(201,160,46,0.06)] p-6 md:p-8 relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 lb-mono text-xs uppercase px-2 py-0.5 border border-[var(--c-yellow)] text-[var(--c-yellow)]">
                    <Zap className="h-3.5 w-3.5" />
                    <span>REAL-TIME MULTIPLAYER ARENA</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--fg)]">
                    COMPETE HEAD-TO-HEAD IN PURE TYPING SPEED
                  </h2>
                  <p className="text-xs md:text-sm text-[var(--fg-dim)] leading-relaxed">
                    Race against student peers in real time, benchmark your words-per-minute, or practice
                    solo to climb the society leaderboard.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="lb-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3"
                  >
                    <Play className="h-4 w-4" />
                    <span>{loading ? 'CREATING ARENA...' : 'CREATE NEW RACE'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Room Options & Direct Join */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Create Custom Match */}
              <Brackets tag="setup_match" accent="yellow">
                <div className="lb-module space-y-4">
                  <div className="flex items-center gap-2 lb-mono text-xs text-[var(--c-yellow)] uppercase">
                    <Flame className="h-4 w-4" />
                    <span>RACE DIFFICULTY</span>
                  </div>
                  <p className="text-xs text-[var(--fg-mute)]">
                    Choose passage complexity before deploying your race lobby.
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {(['EASY', 'MEDIUM', 'HARD'] as GameDifficulty[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`py-2 px-3 lb-mono text-xs font-bold border transition-all ${
                          difficulty === diff
                            ? 'border-[var(--c-yellow)] text-black bg-[var(--c-yellow)]'
                            : 'border-[var(--line)] text-[var(--fg-dim)] hover:border-white/30'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-dashed border-[var(--line)]">
                    <button
                      onClick={handleCreateRoom}
                      disabled={loading}
                      className="w-full lb-btn-primary justify-center text-xs py-2.5"
                    >
                      {loading ? 'DEPLOYING...' : `LAUNCH ${difficulty} ROOM`}
                    </button>
                  </div>
                </div>
              </Brackets>

              {/* Card 2: Join Existing Room Code */}
              <Brackets tag="join_code" accent="green">
                <div className="lb-module space-y-4">
                  <div className="flex items-center gap-2 lb-mono text-xs text-[var(--c-green)] uppercase">
                    <Users className="h-4 w-4" />
                    <span>ENTER ROOM CODE</span>
                  </div>
                  <p className="text-xs text-[var(--fg-mute)]">
                    Have an invite code from a classmate? Enter it below to join their lobby immediately.
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const codeVal = formData.get('code');
                      if (typeof codeVal === 'string') void handleJoinRoom(codeVal);
                    }}
                    className="space-y-3 pt-2"
                  >
                    <div className="flex gap-2">
                      <input
                        name="code"
                        placeholder="e.g. RACE-4X9"
                        autoCapitalize="characters"
                        className="flex-1 px-3 py-2 bg-[var(--surface-0)] border border-[var(--line)] text-sm text-white placeholder:text-[var(--fg-mute)] lb-mono focus:border-[var(--c-green)] focus:outline-none uppercase"
                      />
                      <button type="submit" disabled={loading} className="lb-btn-ghost px-5 text-xs">
                        JOIN RACE
                      </button>
                    </div>
                  </form>

                  <div className="pt-3 border-t border-dashed border-[var(--line)] flex items-center justify-between text-[11px] lb-mono text-[var(--fg-mute)]">
                    <span>ROOM FORMAT: 4-8 ALPHANUMERIC</span>
                    <span className="text-[var(--c-green)]">INSTANT CONNECT</span>
                  </div>
                </div>
              </Brackets>
            </div>
          </div>
        )}

        {/* VIEW 2: ACTIVE ROOM (Lobby, Countdown, Racing, Finished) */}
        {room && (
          <div className="space-y-6">
            {/* Header Telemetry Bar */}
            <div className="p-4 border border-[var(--line)] bg-[var(--surface-1)] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="lb-mono text-xs px-2.5 py-1 bg-[var(--surface-0)] border border-[var(--c-yellow)] text-[var(--c-yellow)] font-bold">
                  ROOM #{room.code}
                </div>
                <div
                  className={`lb-mono text-xs px-2 py-0.5 border uppercase ${
                    room.status === 'RACING'
                      ? 'border-[var(--c-green)] text-[var(--c-green)] bg-[rgba(94,255,122,0.1)] animate-pulse'
                      : room.status === 'FINISHED'
                        ? 'border-[var(--c-purple)] text-[var(--c-purple)]'
                        : 'border-[var(--c-yellow-soft)] text-[var(--c-yellow-soft)]'
                  }`}
                >
                  ● {room.status}
                </div>
                <div className="lb-mono text-xs text-[var(--fg-dim)] hidden sm:inline">
                  {room.participants.length} RACER{room.participants.length === 1 ? '' : 'S'}
                </div>
              </div>

              {/* Room Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyRoomCode}
                  className="px-2.5 py-1.5 border border-[var(--line)] hover:border-white/40 text-[var(--fg-dim)] hover:text-white lb-mono text-xs inline-flex items-center gap-1.5 transition-colors"
                  title="Copy Room Code"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-[var(--c-green)]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? 'COPIED' : 'CODE'}</span>
                </button>

                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="px-2.5 py-1.5 border border-[var(--line)] hover:border-white/40 text-[var(--fg-dim)] hover:text-white lb-mono text-xs inline-flex items-center gap-1.5 transition-colors"
                  title="Copy Invite Link"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-[var(--c-green)]" /> : <Share2 className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'LINK COPIED' : 'INVITE'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="px-2.5 py-1.5 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 lb-mono text-xs inline-flex items-center gap-1.5 transition-colors ml-2"
                  title="Leave Room"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>LEAVE</span>
                </button>
              </div>
            </div>

            {/* STAGE A: LOBBY & PRE-RACE PREPARATION */}
            {room.status === 'LOBBY' && (
              <div className="space-y-6">
                {/* Roster & Readiness Grid */}
                <div className="border border-[var(--line)] bg-[var(--surface-1)] p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[var(--c-yellow)]" />
                      <span className="lb-mono text-xs uppercase font-bold text-[var(--fg)]">
                        RACERS IN GRID ({room.participants.length}/6)
                      </span>
                    </div>
                    <span className="lb-mono text-xs text-[var(--fg-mute)]">
                      {isHost ? '👑 YOU ARE THE HOST' : 'WAITING FOR HOST TO START'}
                    </span>
                  </div>

                  {/* Racer Tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {room.participants.map((participant) => {
                      const isMe = participant.userId === user?.id;
                      const isRoomHost = room.hostUserId === participant.userId;

                      return (
                        <div
                          key={participant.userId}
                          className={`p-3 border flex items-center justify-between gap-3 ${
                            isMe
                              ? 'border-[var(--c-yellow)] bg-[rgba(201,160,46,0.06)]'
                              : 'border-[var(--line)] bg-[var(--surface-0)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-none border border-[var(--line)] bg-[var(--surface-2)] flex items-center justify-center font-bold text-xs shrink-0">
                              {participant.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate max-w-[110px]">
                                  {participant.name}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] text-[var(--c-yellow)] lb-mono">(YOU)</span>
                                )}
                              </div>
                              {isRoomHost && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--c-yellow)] lb-mono">
                                  <Crown className="h-2.5 w-2.5" /> HOST
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Ready State */}
                          <div className="shrink-0">
                            {participant.ready ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--c-green)] text-[var(--c-green)] text-[10px] lb-mono bg-[rgba(94,255,122,0.08)]">
                                <Check className="h-3 w-3" /> READY
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 border border-[var(--line)] text-[var(--fg-mute)] text-[10px] lb-mono">
                                WAITING
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Controls for Participants & Host */}
                  <div className="pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-[var(--fg-mute)] lb-mono text-center sm:text-left">
                      {room.participants.length === 1 ? (
                        <span className="text-[var(--c-yellow-soft)]">
                          💡 Solo practice mode active: start now to test your typing benchmark!
                        </span>
                      ) : (
                        <span>
                          Multiplayer race: all participants should toggle ready before the flag drops.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Non-host Ready Toggle */}
                      {!isHost && (
                        <button
                          type="button"
                          onClick={() => socketRef.current?.emit('room:ready')}
                          className={`lb-btn-ghost flex-1 sm:flex-none text-xs py-2 px-4 ${
                            currentParticipant?.ready
                              ? 'border-[var(--c-green)] text-[var(--c-green)]'
                              : ''
                          }`}
                        >
                          {currentParticipant?.ready ? '✓ READY (TOGGLE)' : 'READY UP'}
                        </button>
                      )}

                      {/* Host Start Button */}
                      {isHost && (
                        <button
                          type="button"
                          onClick={() => socketRef.current?.emit('room:start')}
                          className="lb-btn-primary flex-1 sm:flex-none text-xs py-2.5 px-6 flex items-center justify-center gap-2"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>START RACE</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE B: COUNTDOWN OVERLAY */}
            {countdown !== null && (
              <div className="py-16 text-center space-y-4 border border-[var(--c-yellow)] bg-[rgba(0,0,0,0.85)] backdrop-blur-md">
                <div className="lb-mono text-xs text-[var(--c-yellow)] uppercase tracking-widest">
                  // ENGAGE KEYBOARDS · COUNTDOWN
                </div>
                <div className="font-display text-8xl md:text-9xl font-bold text-[var(--c-yellow)] animate-pulse">
                  {countdown}
                </div>
                <div className="text-xs lb-mono text-[var(--fg-dim)]">
                  Race begins automatically when the timer reaches zero!
                </div>
              </div>
            )}

            {/* STAGE C: RACING ARENA (Active gameplay) */}
            {room.status === 'RACING' && (
              <div className="space-y-6">
                {/* 1. Multiplayer Racing Lanes (Track Visualization) */}
                <div className="border border-[var(--line)] bg-[var(--surface-1)] p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs lb-mono text-[var(--fg-mute)] pb-1">
                    <span className="flex items-center gap-1.5 text-[var(--c-yellow)]">
                      <Activity className="h-3.5 w-3.5" /> LIVE RACETRACK
                    </span>
                    <span>FINISH LINE 🏁</span>
                  </div>

                  <div className="space-y-2.5">
                    {room.participants.map((p) => {
                      const isMe = p.userId === user?.id;
                      const userChars = isMe
                        ? typed.length
                        : liveProgressMap[p.userId] ?? p.charsTyped ?? 0;
                      const progressPct = passage.length
                        ? Math.min(100, Math.round((userChars / passage.length) * 100))
                        : 0;
                      const isFinished = p.finished || progressPct >= 100;

                      return (
                        <div
                          key={p.userId}
                          className="p-2 border border-[var(--line)] bg-[var(--surface-0)] relative overflow-hidden"
                        >
                          {/* Track Progress Fill */}
                          <div
                            className="absolute top-0 bottom-0 left-0 bg-[rgba(201,160,46,0.12)] transition-all duration-200 pointer-events-none"
                            style={{ width: `${progressPct}%` }}
                          />

                          <div className="flex items-center justify-between relative z-10 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="lb-mono text-[10px] text-[var(--fg-mute)] w-4">
                                {isFinished && p.rank ? `#${p.rank}` : '🏎️'}
                              </span>
                              <span className={`font-bold truncate max-w-[120px] ${isMe ? 'text-[var(--c-yellow)]' : 'text-white'}`}>
                                {p.name} {isMe && '(YOU)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 lb-mono text-[11px]">
                              {isFinished ? (
                                <span className="text-[var(--c-green)] font-bold">
                                  FINISHED · {p.wpm || stats.wpm} WPM
                                </span>
                              ) : (
                                <>
                                  <span className="text-[var(--fg-dim)]">{progressPct}%</span>
                                  <span className="text-[var(--c-yellow-soft)] font-bold">
                                    {isMe ? `${stats.wpm} WPM` : `${p.wpm ?? 0} WPM`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Progress Line */}
                          <div className="w-full bg-[var(--surface-2)] h-1 mt-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-200 ${
                                isMe ? 'bg-[var(--c-yellow)]' : 'bg-[var(--c-blue)]'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Cockpit Telemetry HUD */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 border border-[var(--line)] bg-[var(--surface-1)] text-center">
                    <div className="text-[10px] lb-mono text-[var(--fg-mute)] uppercase">SPEED</div>
                    <div className="text-2xl font-bold font-mono text-[var(--c-yellow)]">
                      {stats.wpm} <span className="text-xs font-normal text-[var(--fg-dim)]">WPM</span>
                    </div>
                  </div>

                  <div className="p-3 border border-[var(--line)] bg-[var(--surface-1)] text-center">
                    <div className="text-[10px] lb-mono text-[var(--fg-mute)] uppercase">ACCURACY</div>
                    <div className="text-2xl font-bold font-mono text-[var(--c-green)]">
                      {stats.accuracy}%
                    </div>
                  </div>

                  <div className="p-3 border border-[var(--line)] bg-[var(--surface-1)] text-center">
                    <div className="text-[10px] lb-mono text-[var(--fg-mute)] uppercase">PROGRESS</div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {stats.progressPercent}%
                    </div>
                  </div>

                  <div className="p-3 border border-[var(--line)] bg-[var(--surface-1)] text-center">
                    <div className="text-[10px] lb-mono text-[var(--fg-mute)] uppercase">ELAPSED</div>
                    <div className="text-2xl font-bold font-mono text-[var(--fg-dim)]">
                      {elapsedSeconds}s
                    </div>
                  </div>
                </div>

                {/* 3. High-Contrast Interactive Typing Board */}
                <div
                  onClick={() => inputRef.current?.focus()}
                  className="border border-[var(--line)] bg-[var(--surface-0)] p-6 cursor-text relative shadow-inner"
                >
                  {/* Passage Visualizer */}
                  <div className="font-mono text-lg md:text-xl leading-relaxed tracking-wide select-none">
                    {Array.from(passage).map((char, index) => {
                      const typedChar = typed[index];
                      const isCurrent = index === typed.length;
                      let color = 'rgba(255,255,255,0.38)';
                      let bg = 'transparent';

                      if (typedChar !== undefined) {
                        if (typedChar === char) {
                          color = 'var(--c-green)';
                        } else {
                          color = 'var(--c-red)';
                          bg = 'rgba(255,59,59,0.25)';
                        }
                      }

                      return (
                        <span
                          key={`${char}-${index}`}
                          style={{ color, backgroundColor: bg }}
                          className={`${
                            isCurrent
                              ? 'border-b-2 border-[var(--c-yellow)] bg-[rgba(201,160,46,0.2)] animate-pulse'
                              : ''
                          } transition-colors`}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>

                  {/* Hidden Input Layer for immediate capture */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={typed}
                    onChange={handleInputChange}
                    onPaste={(e) => {
                      e.preventDefault();
                      toast.error('Copy-pasting is disabled in race mode!');
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className="absolute opacity-0 pointer-events-none inset-0 w-full h-full"
                  />

                  <div className="mt-4 pt-3 border-t border-[var(--line)]/40 flex items-center justify-between text-xs lb-mono text-[var(--fg-mute)]">
                    <span>CLICK ANYWHERE ON PASSAGE TO FOCUS INPUT</span>
                    <span>
                      {typed.length} / {passage.length} CHARS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE D: FINISHED / PODIUM RESULTS */}
            {room.status === 'FINISHED' && (
              <div className="space-y-6">
                <div className="border border-[var(--c-yellow)] bg-[var(--surface-1)] p-6 md:p-8 space-y-6">
                  {/* Podium Header */}
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 lb-mono text-xs uppercase px-2.5 py-1 border border-[var(--c-yellow)] text-[var(--c-yellow)]">
                      <Trophy className="h-4 w-4" />
                      <span>RACE CONCLUDED · PODIUM RESULTS</span>
                    </div>
                    <h2 className="text-3xl font-bold font-display uppercase tracking-wider text-white">
                      FINAL STANDINGS
                    </h2>
                  </div>

                  {/* Leaderboard Table */}
                  <div className="border border-[var(--line)] bg-[var(--surface-0)] divide-y divide-[var(--line)]">
                    {room.participants
                      .slice()
                      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                      .map((p, idx) => {
                        const isMe = p.userId === user?.id;
                        const rank = p.rank ?? idx + 1;

                        return (
                          <div
                            key={p.userId}
                            className={`p-4 flex items-center justify-between gap-4 ${
                              rank === 1
                                ? 'bg-[rgba(201,160,46,0.1)] border-l-4 border-l-[var(--c-yellow)]'
                                : rank === 2
                                  ? 'border-l-4 border-l-gray-300'
                                  : rank === 3
                                    ? 'border-l-4 border-l-amber-600'
                                    : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold lb-mono text-sm shrink-0 ${
                                  rank === 1
                                    ? 'bg-[var(--c-yellow)] text-black'
                                    : rank === 2
                                      ? 'bg-gray-300 text-black'
                                      : rank === 3
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-[var(--surface-2)] text-[var(--fg-dim)]'
                                }`}
                              >
                                {rank}
                              </div>

                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                                  <span>{p.name}</span>
                                  {isMe && (
                                    <span className="text-[10px] text-[var(--c-yellow)] lb-mono">(YOU)</span>
                                  )}
                                </div>
                                <div className="text-xs text-[var(--fg-mute)] lb-mono">
                                  ACCURACY: {p.accuracy ?? 100}%
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xl font-bold font-mono text-[var(--c-yellow)]">
                                {p.wpm ?? 0} <span className="text-xs font-normal">WPM</span>
                              </div>
                              <div className="text-[10px] lb-mono text-[var(--fg-mute)]">
                                SCORE: {p.score ?? 0} PTS
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Actions: Rematch in same room vs Back to games */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    {/* Host or solo player can trigger rematch */}
                    {(isHost || room.participants.length === 1) && (
                      <button
                        type="button"
                        onClick={handleRematch}
                        className="lb-btn-primary w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>REMATCH (NEW PASSAGE)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLeaveRoom}
                      className="lb-btn-ghost w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>EXIT TO LOBBY</span>
                    </button>

                    <Link
                      to="/games"
                      className="lb-btn-ghost w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2 text-[var(--fg-dim)] hover:text-white"
                    >
                      <span>ALL GAMES</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && <PlayLoading />}
      </div>
    </PlayShell>
  );
}
