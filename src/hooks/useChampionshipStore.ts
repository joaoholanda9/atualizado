import { useCallback, useEffect, useState } from 'react';
import cantoFibraLogo from '../assets/aope-logo.svg';
import { createEmptyChampionship, createSampleChampionship } from '../data/seedData';
import type {
  Bird,
  ChampionshipState,
  Stage,
  StageEntry,
  StageReminderConfig,
  TiebreakMode,
} from '../types/championship';
import {
  compareStakeNumbers,
  getNextAvailableStakeNumber,
  MAX_STAGES,
} from '../utils/scoring';

const STORAGE_KEY = 'canto_anilha_championship_v2';
const V3_BACKUP_STORAGE_KEY = 'canto_anilha_championships_v3';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sanitizeEntries(entries: StageEntry[]): StageEntry[] {
  return entries.map((e) => ({
    ...e,
    stakeNumber: typeof e.stakeNumber === 'string' ? e.stakeNumber : '',
  }));
}

const DEFAULT_CHAMPIONSHIP_NAME =
  'Campeonato Pernambucano de Coleiro e Papa Capim AOPE';
const LEGACY_CHAMPIONSHIP_NAME = 'Campeonato Anual de Canto de Aves 2026';

function migrateChampionshipName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim() || name === LEGACY_CHAMPIONSHIP_NAME) {
    return DEFAULT_CHAMPIONSHIP_NAME;
  }
  return name;
}

function sanitizeStageReminder(
  reminder: unknown
): StageReminderConfig {
  if (reminder && typeof reminder === 'object') {
    const r = reminder as Partial<StageReminderConfig>;
    const days = Number(r.daysBefore);
    return {
      enabled: Boolean(r.enabled),
      daysBefore:
        Number.isFinite(days) && days >= 0 && days <= 60 ? Math.floor(days) : 3,
      browserNotification: Boolean(r.browserNotification),
    };
  }
  return {
    enabled: false,
    daysBefore: 3,
    browserNotification: false,
  };
}

export const DEFAULT_EVENT_LOGO_URL = cantoFibraLogo;

function isLegacyGeneratedRasterLogo(trimmed: string): boolean {
  return (
    trimmed.includes('canto_fibra_mark_') ||
    trimmed.includes('canto_fibra_logo_') ||
    trimmed.includes('canto_fibra_emblem_') ||
    trimmed.includes('canto-fibra-logo') ||
    trimmed.includes('Logotipo%20Canto')
  );
}

function sanitizeEventLogo(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (isLegacyGeneratedRasterLogo(trimmed)) {
      return cantoFibraLogo;
    }
    if (
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('/src/assets/') ||
      trimmed.startsWith('/assets/') ||
      trimmed === cantoFibraLogo
    ) {
      return trimmed;
    }
  }
  return undefined;
}

function resolveLoadedEventLogo(value: unknown): string {
  if (value === '') return '';
  return sanitizeEventLogo(value) ?? cantoFibraLogo;
}

function loadInitialState(): ChampionshipState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChampionshipState;
      if (
        parsed &&
        Array.isArray(parsed.birds) &&
        Array.isArray(parsed.stages) &&
        Array.isArray(parsed.entries)
      ) {
        return {
          ...parsed,
          championshipName: migrateChampionshipName(parsed.championshipName),
          entries: sanitizeEntries(parsed.entries),
          stageReminder: sanitizeStageReminder(parsed.stageReminder),
          eventLogoDataUrl: resolveLoadedEventLogo(parsed.eventLogoDataUrl),
        };
      }
    }
  } catch {
    // Try v3 recovery fallback before falling back to sample data
  }

  // Fallback: if v2 key was somehow absent, recover Coleiro data from v3 workspace
  try {
    const rawV3 = localStorage.getItem(V3_BACKUP_STORAGE_KEY);
    if (rawV3) {
      const parsedV3 = JSON.parse(rawV3) as {
        championships?: Array<{
          id?: string;
          name?: string;
          modality?: string;
          year?: number;
          birds?: Bird[];
          stages?: Stage[];
          entries?: StageEntry[];
          settings?: { stageReminder?: unknown; eventLogoDataUrl?: unknown };
        }>;
      };
      const target =
        parsedV3?.championships?.find(
          (c) =>
            c.id === 'champ-2026-coleiro' ||
            c.modality?.toLowerCase() === 'coleiro'
        ) ?? parsedV3?.championships?.[0];
      if (
        target &&
        Array.isArray(target.birds) &&
        Array.isArray(target.stages) &&
        Array.isArray(target.entries)
      ) {
        return {
          seasonYear: Number(target.year) || 2026,
          championshipName: migrateChampionshipName(target.name),
          birds: target.birds,
          stages: target.stages,
          entries: sanitizeEntries(target.entries),
          stageReminder: sanitizeStageReminder(target.settings?.stageReminder),
          eventLogoDataUrl: resolveLoadedEventLogo(target.settings?.eventLogoDataUrl),
        };
      }
    }
  } catch {
    // Fallback to sample data if storage is corrupted
  }

  return createSampleChampionship();
}

export function useChampionshipStore() {
  const [state, setState] = useState<ChampionshipState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [state]);

  const updateChampionshipSettings = useCallback(
    (input: { championshipName: string; seasonYear: number }): {
      ok: boolean;
      error?: string;
    } => {
      const trimmedName = input.championshipName.trim();
      const parsedYear = Math.floor(Number(input.seasonYear));
      if (!trimmedName) {
        return { ok: false, error: 'Informe o nome do campeonato.' };
      }
      if (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        return { ok: false, error: 'Informe um ano válido entre 2000 e 2100.' };
      }
      setState((prev) => ({
        ...prev,
        championshipName: trimmedName,
        seasonYear: parsedYear,
      }));
      return { ok: true };
    },
    []
  );

  const updateStageReminder = useCallback(
    (input: StageReminderConfig) => {
      const days = Math.floor(Number(input.daysBefore));
      const clampedDays =
        Number.isFinite(days) && days >= 0 && days <= 60 ? days : 3;
      setState((prev) => ({
        ...prev,
        stageReminder: {
          enabled: Boolean(input.enabled),
          daysBefore: clampedDays,
          browserNotification: Boolean(input.browserNotification),
        },
      }));
    },
    []
  );

  const updateEventLogo = useCallback((logoDataUrl: string | undefined) => {
    setState((prev) => ({
      ...prev,
      eventLogoDataUrl:
        logoDataUrl === undefined ? '' : (sanitizeEventLogo(logoDataUrl) ?? ''),
    }));
  }, []);

  // --- BIRDS CRUD (sem número da anilha) ---
  const addBird = useCallback(
    (input: { name: string; ownerName: string; isMember: boolean }): {
      ok: boolean;
      error?: string;
      bird?: Bird;
    } => {
      if (!input.name.trim() || !input.ownerName.trim()) {
        return { ok: false, error: 'Informe o nome da ave e o proprietário.' };
      }

      const newBird: Bird = {
        id: generateId('bird'),
        name: input.name.trim(),
        ownerName: input.ownerName.trim(),
        isMember: input.isMember,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        birds: [...prev.birds, newBird],
      }));
      return { ok: true, bird: newBird };
    },
    []
  );

  const updateBird = useCallback(
    (
      id: string,
      input: { name: string; ownerName: string; isMember: boolean }
    ): { ok: boolean; error?: string } => {
      if (!input.name.trim() || !input.ownerName.trim()) {
        return { ok: false, error: 'Informe o nome da ave e o proprietário.' };
      }

      setState((prev) => ({
        ...prev,
        birds: prev.birds.map((b) =>
          b.id === id
            ? {
                ...b,
                name: input.name.trim(),
                ownerName: input.ownerName.trim(),
                isMember: input.isMember,
              }
            : b
        ),
      }));
      return { ok: true };
    },
    []
  );

  const deleteBird = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      birds: prev.birds.filter((b) => b.id !== id),
      entries: prev.entries.filter((e) => e.birdId !== id),
    }));
  }, []);

  // --- STAGES CRUD (Up to 30) ---
  const addStage = useCallback(
    (input: { stageNumber: number; name: string; date: string; address: string }): {
      ok: boolean;
      error?: string;
      stage?: Stage;
    } => {
      if (state.stages.length >= MAX_STAGES) {
        return {
          ok: false,
          error: `Limite máximo de ${MAX_STAGES} etapas anuais atingido.`,
        };
      }

      const duplicateNum = state.stages.find(
        (s) => s.stageNumber === input.stageNumber
      );
      if (duplicateNum) {
        return {
          ok: false,
          error: `Já existe uma etapa com o número ${input.stageNumber}.`,
        };
      }

      const newStage: Stage = {
        id: generateId('stage'),
        stageNumber: input.stageNumber,
        name: input.name.trim(),
        date: input.date,
        address: input.address.trim(),
        tiebreakMode: 'manual',
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        stages: [...prev.stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber),
      }));
      return { ok: true, stage: newStage };
    },
    [state.stages]
  );

  const updateStage = useCallback(
    (
      id: string,
      input: { stageNumber: number; name: string; date: string; address: string }
    ): { ok: boolean; error?: string } => {
      const duplicateNum = state.stages.find(
        (s) => s.id !== id && s.stageNumber === input.stageNumber
      );
      if (duplicateNum) {
        return {
          ok: false,
          error: `Já existe outra etapa com o número ${input.stageNumber}.`,
        };
      }

      setState((prev) => ({
        ...prev,
        stages: prev.stages
          .map((s) =>
            s.id === id
              ? {
                  ...s,
                  stageNumber: input.stageNumber,
                  name: input.name.trim(),
                  date: input.date,
                  address: input.address.trim(),
                }
              : s
          )
          .sort((a, b) => a.stageNumber - b.stageNumber),
      }));
      return { ok: true };
    },
    [state.stages]
  );

  const deleteStage = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== id),
      entries: prev.entries.filter((e) => e.stageId !== id),
    }));
  }, []);

  const setStageTiebreakMode = useCallback((stageId: string, mode: TiebreakMode) => {
    setState((prev) => ({
      ...prev,
      stages: prev.stages.map((s) =>
        s.id === stageId ? { ...s, tiebreakMode: mode } : s
      ),
    }));
  }, []);

  const sortStageEntriesByStake = (entries: StageEntry[], stageId: string): StageEntry[] => {
    const otherEntries: StageEntry[] = [];
    const targetEntries: StageEntry[] = [];
    for (const entry of entries) {
      if (entry.stageId === stageId) {
        targetEntries.push(entry);
      } else {
        otherEntries.push(entry);
      }
    }
    targetEntries.sort((a, b) => compareStakeNumbers(a.stakeNumber, b.stakeNumber));
    return [...otherEntries, ...targetEntries];
  };

  // --- STAGE ENTRIES, STAKES (ESTACAS) & SCORING ---
  const enrollBirdInStage = useCallback(
    (stageId: string, birdId: string, stakeNumber = '') => {
      setState((prev) => {
        const exists = prev.entries.some(
          (e) => e.stageId === stageId && e.birdId === birdId
        );
        if (exists) return prev;
        const stageEntries = prev.entries.filter((e) => e.stageId === stageId);
        const resolvedStake = stakeNumber.trim()
          ? stakeNumber.trim().toUpperCase()
          : getNextAvailableStakeNumber(stageEntries);
        const newEntry: StageEntry = {
          id: generateId('entry'),
          stageId,
          birdId,
          stakeNumber: resolvedStake,
          part1Songs: 0,
          part2Songs: 0,
          manualTiebreakOrder: stageEntries.length + 1,
          updatedAt: new Date().toISOString(),
        };
        return {
          ...prev,
          entries: sortStageEntriesByStake([...prev.entries, newEntry], stageId),
        };
      });
    },
    []
  );

  const enrollMultipleBirdsInStage = useCallback((stageId: string, birdIds: string[]) => {
    setState((prev) => {
      const stageEntries = prev.entries.filter((e) => e.stageId === stageId);
      const existingSet = new Set(stageEntries.map((e) => e.birdId));
      let nextOrder = existingSet.size + 1;
      const now = new Date().toISOString();
      const virtualStageEntries = [...stageEntries];
      const added: StageEntry[] = [];
      for (const birdId of birdIds) {
        if (!existingSet.has(birdId)) {
          const autoStake = getNextAvailableStakeNumber(virtualStageEntries);
          const created: StageEntry = {
            id: generateId('entry'),
            stageId,
            birdId,
            stakeNumber: autoStake,
            part1Songs: 0,
            part2Songs: 0,
            manualTiebreakOrder: nextOrder++,
            updatedAt: now,
          };
          added.push(created);
          virtualStageEntries.push(created);
        }
      }
      if (added.length === 0) return prev;
      return {
        ...prev,
        entries: sortStageEntriesByStake([...prev.entries, ...added], stageId),
      };
    });
  }, []);

  const removeBirdFromStage = useCallback((stageId: string, birdId: string) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter(
        (e) => !(e.stageId === stageId && e.birdId === birdId)
      ),
    }));
  }, []);

  const updateEntryStakeNumber = useCallback((entryId: string, stakeNumber: string) => {
    setState((prev) => {
      let affectedStageId: string | null = null;
      const updated = prev.entries.map((e) => {
        if (e.id !== entryId) return e;
        affectedStageId = e.stageId;
        return {
          ...e,
          stakeNumber: stakeNumber.trim().toUpperCase(),
          updatedAt: new Date().toISOString(),
        };
      });
      return {
        ...prev,
        entries: affectedStageId
          ? sortStageEntriesByStake(updated, affectedStageId)
          : updated,
      };
    });
  }, []);

  const updateEntrySongs = useCallback(
    (entryId: string, field: 'part1Songs' | 'part2Songs', value: number) => {
      const sanitized = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
      setState((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === entryId
            ? { ...e, [field]: sanitized, updatedAt: new Date().toISOString() }
            : e
        ),
      }));
    },
    []
  );

  const incrementEntrySong = useCallback(
    (entryId: string, field: 'part1Songs' | 'part2Songs', delta: number) => {
      setState((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                [field]: Math.max(0, e[field] + delta),
                updatedAt: new Date().toISOString(),
              }
            : e
        ),
      }));
    },
    []
  );

  const updateManualTiebreakOrder = useCallback((entryId: string, order: number) => {
    const sanitized = Math.max(1, Math.floor(Number.isFinite(order) ? order : 1));
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.id === entryId
          ? { ...e, manualTiebreakOrder: sanitized, updatedAt: new Date().toISOString() }
          : e
      ),
    }));
  }, []);

  const swapManualTiebreakOrder = useCallback((entryIdA: string, entryIdB: string) => {
    setState((prev) => {
      const entryA = prev.entries.find((e) => e.id === entryIdA);
      const entryB = prev.entries.find((e) => e.id === entryIdB);
      if (!entryA || !entryB) return prev;
      let orderA = entryA.manualTiebreakOrder;
      let orderB = entryB.manualTiebreakOrder;
      if (orderA === orderB) {
        orderA = 1;
        orderB = 2;
      }
      return {
        ...prev,
        entries: prev.entries.map((e) => {
          if (e.id === entryIdA) return { ...e, manualTiebreakOrder: orderB };
          if (e.id === entryIdB) return { ...e, manualTiebreakOrder: orderA };
          return e;
        }),
      };
    });
  }, []);

  const drawTieGroupRandomly = useCallback((entryIds: string[]) => {
    const shuffled = [...entryIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const orderMap = new Map<string, number>();
    shuffled.forEach((id, index) => orderMap.set(id, index + 1));

    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        orderMap.has(e.id)
          ? {
              ...e,
              manualTiebreakOrder: orderMap.get(e.id)!,
              updatedAt: new Date().toISOString(),
            }
          : e
      ),
    }));
  }, []);

  // --- SEASON BACKUP / RESET ---
  const resetToEmpty = useCallback(() => {
    setState(createEmptyChampionship());
  }, []);

  const loadSampleData = useCallback(() => {
    setState(createSampleChampionship());
  }, []);

  const importStateJson = useCallback((jsonText: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonText) as ChampionshipState & {
        championships?: Array<{
          id?: string;
          name?: string;
          modality?: string;
          year?: number;
          birds?: Bird[];
          stages?: Stage[];
          entries?: StageEntry[];
          settings?: { stageReminder?: unknown; eventLogoDataUrl?: unknown };
        }>;
      };

      if (
        parsed &&
        Array.isArray(parsed.championships) &&
        parsed.championships.length > 0
      ) {
        const target =
          parsed.championships.find(
            (c) =>
              c.id === 'champ-2026-coleiro' ||
              c.modality?.toLowerCase() === 'coleiro'
          ) ?? parsed.championships[0];
        if (
          target &&
          Array.isArray(target.birds) &&
          Array.isArray(target.stages) &&
          Array.isArray(target.entries)
        ) {
          setState({
            seasonYear: Number(target.year) || 2026,
            championshipName: migrateChampionshipName(target.name),
            birds: target.birds,
            stages: target.stages,
            entries: sanitizeEntries(target.entries),
            stageReminder: sanitizeStageReminder(target.settings?.stageReminder),
            eventLogoDataUrl: resolveLoadedEventLogo(target.settings?.eventLogoDataUrl),
          });
          return { ok: true };
        }
      }

      if (
        !parsed ||
        !Array.isArray(parsed.birds) ||
        !Array.isArray(parsed.stages) ||
        !Array.isArray(parsed.entries)
      ) {
        return { ok: false, error: 'Arquivo JSON inválido para o campeonato.' };
      }
      if (parsed.stages.length > MAX_STAGES) {
        return {
          ok: false,
          error: `O arquivo excede o limite de ${MAX_STAGES} etapas.`,
        };
      }
      setState({
        ...parsed,
        championshipName: migrateChampionshipName(parsed.championshipName),
        entries: sanitizeEntries(parsed.entries),
        stageReminder: sanitizeStageReminder(parsed.stageReminder),
        eventLogoDataUrl: resolveLoadedEventLogo(parsed.eventLogoDataUrl),
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Não foi possível ler o arquivo JSON selecionado.' };
    }
  }, []);

  return {
    state,
    updateChampionshipSettings,
    updateStageReminder,
    updateEventLogo,
    addBird,
    updateBird,
    deleteBird,
    addStage,
    updateStage,
    deleteStage,
    setStageTiebreakMode,
    enrollBirdInStage,
    enrollMultipleBirdsInStage,
    removeBirdFromStage,
    updateEntryStakeNumber,
    updateEntrySongs,
    incrementEntrySong,
    updateManualTiebreakOrder,
    swapManualTiebreakOrder,
    drawTieGroupRandomly,
    resetToEmpty,
    loadSampleData,
    importStateJson,
  };
}
