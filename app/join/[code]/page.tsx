import Game from '@/components/Game';

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params;
  return <Game joinCode={code} />;
}
