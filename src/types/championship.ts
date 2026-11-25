export type AppTab = 'painel' | 'torneio' | 'registro' | 'etapas' | 'aves' | 'ranking';

export type MemberFilter = 'all' | 'members' | 'non_members';

export type TiebreakMode = 'manual' | 'shared';

export type ActiveRound = 'part1' | 'part2';

export interface Bird {
  id: string;
  name: string;
  ownerName: string;
  isMember: boolean;
  createdAt: string;
}

export interface Stage {
  id: string;
  stageNumber: number;
  name: string;
  date: string; // YYYY-MM-DD
  address: string;
  tiebreakMode: TiebreakMode;
  createdAt: string;
}

export interface StageEntry {
  id: string;
  stageId: string;
  birdId: string;
  stakeNumber: string; // Número da estaca na etapa (editável/removível)
  part1Songs: number; // 1ª Parte: 10 min
  part2Songs: number; // 2ª Parte: 15 min
  manualTiebreakOrder: number;
  updatedAt: string;
}

export interface RankedStageEntry {
  entry: StageEntry;
  bird: Bird;
  position: number;
  points: number;
  isTied: boolean;
  tieGroupKey: string;
  tieGroupSize: number;
}

export interface BirdStageBreakdown {
  stageId: string;
  stageNumber: number;
  stageName: string;
  date: string;
  position: number;
  points: number;
  part1Songs: number;
  part2Songs: number;
}

export interface GeneralRankingRow {
  bird: Bird;
  position: number;
  totalPoints: number;
  stagesDisputed: number;
  totalPart1Songs: number;
  totalPart2Songs: number;
  totalSongs: number;
  stageBreakdowns: BirdStageBreakdown[];
}

export interface StageReminderConfig {
  enabled: boolean;
  daysBefore: number;
  browserNotification: boolean;
}

export interface ChampionshipState {
  seasonYear: number;
  championshipName: string;
  birds: Bird[];
  stages: Stage[];
  entries: StageEntry[];
  stageReminder?: StageReminderConfig;
  eventLogoDataUrl?: string;
}
