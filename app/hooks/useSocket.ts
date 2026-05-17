"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  RoomView,
  ClientToServerEvents,
  ServerToClientEvents,
  OptionKey,
} from "@/lib/types";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export type UseSocketReturn = {
  roomState: RoomView | null;
  error: string | null;
  connected: boolean;
  createRoom: (name: string, color: string) => void;
  joinRoom: (roomId: string, name: string, color: string) => void;
  startGame: (roundsPerPlayer: number) => void;
  submitRanking: (ranking: [OptionKey, OptionKey, OptionKey]) => void;
  submitGuess: (guess: [OptionKey, OptionKey, OptionKey]) => void;
  revealNext: () => void;
  nextRound: () => void;
  clearError: () => void;
};

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<SocketType | null>(null);
  const [roomState, setRoomState] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // サーバーと同じオリジンに接続
    const socket: SocketType = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:state", (state) => setRoomState(state));
    socket.on("room:error", ({ message }) => setError(message));

    return () => {
      socket.disconnect();
    };
  }, []);

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      socketRef.current?.emit(event, ...args);
    },
    []
  );

  const createRoom = useCallback(
    (name: string, color: string) => emit("room:create", { name, color }),
    [emit]
  );

  const joinRoom = useCallback(
    (roomId: string, name: string, color: string) =>
      emit("room:join", { roomId, name, color }),
    [emit]
  );

  const startGame = useCallback(
    (roundsPerPlayer: number) => emit("game:start", { roundsPerPlayer }),
    [emit]
  );

  const submitRanking = useCallback(
    (ranking: [OptionKey, OptionKey, OptionKey]) =>
      emit("host:submitRanking", { ranking }),
    [emit]
  );

  const submitGuess = useCallback(
    (guess: [OptionKey, OptionKey, OptionKey]) =>
      emit("player:submitGuess", { guess }),
    [emit]
  );

  const revealNext = useCallback(() => emit("reveal:next"), [emit]);
  const nextRound = useCallback(() => emit("round:next"), [emit]);
  const clearError = useCallback(() => setError(null), []);

  return {
    roomState,
    error,
    connected,
    createRoom,
    joinRoom,
    startGame,
    submitRanking,
    submitGuess,
    revealNext,
    nextRound,
    clearError,
  };
}
