import type { Metadata } from "next";

import { RoomPage } from "@/components/game/RoomPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;

  return {
    title: decodeURIComponent(name),
  };
}

export default async function RoomRoute({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ player?: string | string[] }>;
}) {
  const [{ name }, query] = await Promise.all([params, searchParams]);
  const requestedPlayer = Array.isArray(query.player)
    ? query.player[0]
    : query.player;
  const impersonatedPlayerName =
    process.env.NODE_ENV === "development"
      ? requestedPlayer?.trim() || undefined
      : undefined;
  const roomName = decodeURIComponent(name);

  return (
    <RoomPage
      key={`${roomName}:${impersonatedPlayerName ?? ""}`}
      roomName={roomName}
      impersonatedPlayerName={impersonatedPlayerName}
    />
  );
}
