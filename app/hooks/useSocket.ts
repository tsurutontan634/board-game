"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  RoomView,
  ClientToServerEvents,
  ServerToClientEvents,
  OptionKey,
  AddTopicPayload,
  CreatePackagePayload,
  DeletePackagePayload,
  DeleteTopicPayload,
  AddTopicToPackagePayload,
  Package,
  Topic,
} from "@/lib/types";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export type PackagesData = {
  packages: Package[];
  topics: Topic[];
};

export type UseSocketReturn = {
  roomState: RoomView | null;
  error: string | null;
  connected: boolean;
  createRoom: (name: string, color: string) => void;
  joinRoom: (roomId: string, name: string, color: string) => void;
  startGame: (roundsPerPlayer: number, selectedPackageIds: string[]) => void;
  submitRanking: (ranking: [OptionKey, OptionKey, OptionKey]) => void;
  submitGuess: (guess: [OptionKey, OptionKey, OptionKey]) => void;
  revealNext: () => void;
  nextRound: () => void;
  clearError: () => void;
  // パッケージ・お題管理
  packagesData: PackagesData | null;
  requestPackagesList: () => void;
  createPackage: (payload: CreatePackagePayload) => void;
  deletePackage: (payload: DeletePackagePayload) => void;
  addTopic: (payload: AddTopicPayload) => void;
  deleteTopic: (payload: DeleteTopicPayload) => void;
  addTopicToPackage: (payload: AddTopicToPackagePayload) => void;
};

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<SocketType | null>(null);
  const [roomState, setRoomState] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null);

  useEffect(() => {
    const socket: SocketType = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:state", (state) => setRoomState(state));
    socket.on("room:error", ({ message }) => setError(message));
    socket.on("packages:data", (data) => setPackagesData(data));

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
    (roundsPerPlayer: number, selectedPackageIds: string[]) =>
      emit("game:start", { roundsPerPlayer, selectedPackageIds }),
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

  const revealNext    = useCallback(() => emit("reveal:next"), [emit]);
  const nextRound     = useCallback(() => emit("round:next"),  [emit]);
  const clearError    = useCallback(() => setError(null), []);

  const requestPackagesList = useCallback(() => emit("packages:list"), [emit]);

  const createPackage = useCallback(
    (payload: CreatePackagePayload) => emit("package:create", payload),
    [emit]
  );

  const deletePackage = useCallback(
    (payload: DeletePackagePayload) => emit("package:delete", payload),
    [emit]
  );

  const addTopic = useCallback(
    (payload: AddTopicPayload) => emit("topic:add", payload),
    [emit]
  );

  const deleteTopic = useCallback(
    (payload: DeleteTopicPayload) => emit("topic:delete", payload),
    [emit]
  );

  const addTopicToPackage = useCallback(
    (payload: AddTopicToPackagePayload) => emit("topic:addToPackage", payload),
    [emit]
  );

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
    packagesData,
    requestPackagesList,
    createPackage,
    deletePackage,
    addTopic,
    deleteTopic,
    addTopicToPackage,
  };
}
