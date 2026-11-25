import type {
  Bird,
  BirdStageBreakdown,
  GeneralRankingRow,
  MemberFilter,
  RankedStageEntry,
  Stage,
  StageEntry,
} from '../types/championship';

export const MAX_STAGES = 26;

export function calculateStagePoints(position: number): number {
  if (position < 1 || position > 30) return 0;
  return 31 - position;
}

export function countConcludedStages(stages: Stage[], entries: StageEntry[]): number {
  const activeStageIds = new Set(
    entries
      .filter((e) => e.part1Songs > 0)
      .map((e) => e.stageId)
  );
  return stages.filter((s) => activeStageIds.has(s.id)).length;
}

export function calculateApprovalPercent(points: number, stageCount: number): number {
  if (!Number.isFinite(points) || !Number.isFinite(stageCount) || stageCount <= 0) {
    return 0;
  }
  const maxPoints = stageCount * 30;
  return (points / maxPoints) * 100;
}

export function formatPercentPtBr(percent: number): string {
  const safe = Number.isFinite(percent) ? percent : 0;
  return `${safe.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function formatDatePtBr(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function filterByMemberStatus<T extends { bird: Bird }>(
  items: T[],
  filter: MemberFilter
): T[] {
  if (filter === 'members') return items.filter((i) => i.bird.isMember);
  if (filter === 'non_members') return items.filter((i) => !i.bird.isMember);
  return items;
}

export function parseStakeNumeric(stakeNumber: string): number | null {
  const trimmed = stakeNumber.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function compareStakeNumbers(stakeA: string, stakeB: string): number {
  const numA = parseStakeNumeric(stakeA);
  const numB = parseStakeNumeric(stakeB);

  if (numA !== null && numB !== null) {
    if (numA !== numB) return numA - numB;
    return stakeA.trim().localeCompare(stakeB.trim(), 'pt-BR', { numeric: true });
  }
  if (numA !== null) return -1;
  if (numB !== null) return 1;

  const trimA = stakeA.trim();
  const trimB = stakeB.trim();
  if (trimA && !trimB) return -1;
  if (!trimA && trimB) return 1;
  if (trimA && trimB) {
    return trimA.localeCompare(trimB, 'pt-BR', { numeric: true });
  }
  return 0;
}

export function getNextAvailableStakeNumber(
  stageEntries: Pick<StageEntry, 'stakeNumber'>[]
): string {
  const usedNumbers = new Set<number>();
  for (const entry of stageEntries) {
    const num = parseStakeNumeric(entry.stakeNumber);
    if (num !== null && num > 0) {
      usedNumbers.add(num);
    }
  }
  let next = 1;
  while (usedNumbers.has(next)) {
    next += 1;
  }
  return String(next).padStart(2, '0');
}

export function computeStageRanking(
  stage: Stage,
  entries: StageEntry[],
  birds: Bird[]
): RankedStageEntry[] {
  const birdMap = new Map<string, Bird>(birds.map((b) => [b.id, b]));
  const stageEntries = entries.filter((e) => e.stageId === stage.id && birdMap.has(e.birdId));

  const entryIndexMap = new Map<string, number>(
    stageEntries.map((e, idx) => [e.id, idx])
  );

  // Count tie groups based on exact (part2Songs, part1Songs) for scored entries (10m > 0)
  const groupCounts = new Map<string, number>();
  for (const e of stageEntries) {
    if (e.part1Songs <= 0) continue;
    const key = `${e.part2Songs}-${e.part1Songs}`;
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
  }

  const sorted = [...stageEntries].sort((a, b) => {
    const aQualified = a.part1Songs > 0;
    const bQualified = b.part1Songs > 0;
    if (aQualified !== bQualified) {
      return bQualified ? 1 : -1;
    }

    if (!aQualified && !bQualified) {
      const stakeCmp = compareStakeNumbers(a.stakeNumber, b.stakeNumber);
      if (stakeCmp !== 0) return stakeCmp;
      if (b.part2Songs !== a.part2Songs) {
        return b.part2Songs - a.part2Songs;
      }
      return (entryIndexMap.get(a.id) ?? 0) - (entryIndexMap.get(b.id) ?? 0);
    }

    // Critério Principal: 2ª Parte (15 minutos) - maior para o menor
    if (b.part2Songs !== a.part2Songs) {
      return b.part2Songs - a.part2Songs;
    }
    // 1º Critério de Desempate: 1ª Parte (10 minutos) - maior para o menor
    if (b.part1Songs !== a.part1Songs) {
      return b.part1Songs - a.part1Songs;
    }
    // 2º Critério / Ordem de registro: manualTiebreakOrder -> ordem de inscrição
    if (a.manualTiebreakOrder !== b.manualTiebreakOrder) {
      return a.manualTiebreakOrder - b.manualTiebreakOrder;
    }
    return (entryIndexMap.get(a.id) ?? 0) - (entryIndexMap.get(b.id) ?? 0);
  });

  const ranked: RankedStageEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const bird = birdMap.get(entry.birdId)!;
    const isScored = entry.part1Songs > 0;
    const tieGroupKey = `${entry.part2Songs}-${entry.part1Songs}`;
    const tieGroupSize = isScored ? (groupCounts.get(tieGroupKey) ?? 1) : 1;
    const isTied = isScored && tieGroupSize > 1;

    let position = i + 1;
    if (stage.tiebreakMode === 'shared' && isScored && i > 0) {
      const prev = ranked[i - 1];
      if (
        prev.entry.part2Songs === entry.part2Songs &&
        prev.entry.part1Songs === entry.part1Songs
      ) {
        position = prev.position;
      }
    }

    const points = isScored ? calculateStagePoints(position) : 0;

    ranked.push({
      entry,
      bird,
      position,
      points,
      isTied,
      tieGroupKey,
      tieGroupSize,
    });
  }

  return ranked;
}

export function computeGeneralRanking(
  stages: Stage[],
  entries: StageEntry[],
  birds: Bird[]
): GeneralRankingRow[] {
  const stageBreakdownsByBird = new Map<string, BirdStageBreakdown[]>();
  for (const bird of birds) {
    stageBreakdownsByBird.set(bird.id, []);
  }

  const orderedStages = [...stages].sort((a, b) => a.stageNumber - b.stageNumber);

  for (const stage of orderedStages) {
    const ranked = computeStageRanking(stage, entries, birds);
    for (const item of ranked) {
      const list = stageBreakdownsByBird.get(item.bird.id);
      if (list) {
        list.push({
          stageId: stage.id,
          stageNumber: stage.stageNumber,
          stageName: stage.name,
          date: stage.date,
          position: item.position,
          points: item.points,
          part1Songs: item.entry.part1Songs,
          part2Songs: item.entry.part2Songs,
        });
      }
    }
  }

  const rows: Omit<GeneralRankingRow, 'position'>[] = birds.map((bird) => {
    const breakdowns = stageBreakdownsByBird.get(bird.id) ?? [];
    const totalPoints = breakdowns.reduce((acc, b) => acc + b.points, 0);
    const totalPart1Songs = breakdowns.reduce((acc, b) => acc + b.part1Songs, 0);
    const totalPart2Songs = breakdowns.reduce((acc, b) => acc + b.part2Songs, 0);
    const totalSongs = totalPart1Songs + totalPart2Songs;

    return {
      bird,
      totalPoints,
      stagesDisputed: breakdowns.length,
      totalPart1Songs,
      totalPart2Songs,
      totalSongs,
      stageBreakdowns: breakdowns,
    };
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalSongs !== a.totalSongs) return b.totalSongs - a.totalSongs;
    if (b.totalPart2Songs !== a.totalPart2Songs) return b.totalPart2Songs - a.totalPart2Songs;
    if (b.totalPart1Songs !== a.totalPart1Songs) return b.totalPart1Songs - a.totalPart1Songs;
    if (b.stagesDisputed !== a.stagesDisputed) return b.stagesDisputed - a.stagesDisputed;
    return a.bird.name.localeCompare(b.bird.name, 'pt-BR');
  });

  return rows.map((row, idx) => ({
    ...row,
    position: idx + 1,
  }));
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  metadataRows?: (string | number)[][]
): void {
  const bom = '\uFEFF';
  const lines: string[] = [];
  if (metadataRows && metadataRows.length > 0) {
    for (const meta of metadataRows) {
      lines.push(meta.map(escapeCsvCell).join(','));
    }
    lines.push('');
  }
  lines.push(headers.map(escapeCsvCell).join(','));
  for (const r of rows) {
    lines.push(r.map(escapeCsvCell).join(','));
  }
  const csvContent = bom + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
