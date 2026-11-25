/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BirdsView } from './components/BirdsView';
import { MobileRegisterView } from './components/MobileRegisterView';
import { MobileBottomNav, TopNav } from './components/Navigation';
import { OverviewPanel } from './components/OverviewPanel';
import { RankingView } from './components/RankingView';
import { StagesView } from './components/StagesView';
import { TournamentView } from './components/TournamentView';
import { useChampionshipStore } from './hooks/useChampionshipStore';
import type { AppTab } from './types/championship';

export default function App() {
  const store = useChampionshipStore();
  const [activeTab, setActiveTab] = useState<AppTab>('painel');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(() => {
    const ordered = [...store.state.stages].sort(
      (a, b) => a.stageNumber - b.stageNumber
    );
    return ordered[ordered.length - 1]?.id ?? null;
  });

  useEffect(() => {
    document.title = `Canto & Fibra — ${store.state.championshipName} (${store.state.seasonYear})`;
  }, [store.state.championshipName, store.state.seasonYear]);

  const handleOpenStageTournament = (stageId: string) => {
    setSelectedStageId(stageId);
    setActiveTab('torneio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickStartTournament = () => {
    const ordered = [...store.state.stages].sort(
      (a, b) => a.stageNumber - b.stageNumber
    );
    if (!selectedStageId || !ordered.some((s) => s.id === selectedStageId)) {
      const target = ordered[ordered.length - 1]?.id ?? null;
      setSelectedStageId(target);
    }
    setActiveTab('torneio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9] text-slate-900">
      <TopNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onQuickStartTournament={handleQuickStartTournament}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-5 pt-3.5 sm:pt-5 pb-20 md:pb-8">
        {activeTab === 'painel' && (
          <OverviewPanel
            state={store.state}
            onOpenStageTournament={handleOpenStageTournament}
            onGoToStages={() => handleSelectTab('etapas')}
            onGoToBirds={() => handleSelectTab('aves')}
            onGoToRanking={() => handleSelectTab('ranking')}
            onUpdateSettings={store.updateChampionshipSettings}
            onUpdateStageReminder={store.updateStageReminder}
            onImportJson={store.importStateJson}
            onResetToEmpty={store.resetToEmpty}
            onLoadSampleData={store.loadSampleData}
          />
        )}

        {activeTab === 'torneio' && (
          <TournamentView
            championshipName={store.state.championshipName}
            seasonYear={store.state.seasonYear}
            stages={store.state.stages}
            birds={store.state.birds}
            entries={store.state.entries}
            selectedStageId={selectedStageId}
            onSelectStage={setSelectedStageId}
            onGoToStages={() => handleSelectTab('etapas')}
            onGoToBirds={() => handleSelectTab('aves')}
            onEnrollBird={store.enrollBirdInStage}
            onEnrollMultipleBirds={store.enrollMultipleBirdsInStage}
            onRemoveBirdFromStage={store.removeBirdFromStage}
            onUpdateStakeNumber={store.updateEntryStakeNumber}
            onUpdateSongs={store.updateEntrySongs}
            onIncrementSong={store.incrementEntrySong}
            onSetTiebreakMode={store.setStageTiebreakMode}
            onSwapTiebreakOrder={store.swapManualTiebreakOrder}
            onUpdateManualTiebreakOrder={store.updateManualTiebreakOrder}
            onDrawTieGroupRandomly={store.drawTieGroupRandomly}
          />
        )}

        {activeTab === 'registro' && (
          <MobileRegisterView
            championshipName={store.state.championshipName}
            seasonYear={store.state.seasonYear}
            stages={store.state.stages}
            birds={store.state.birds}
            entries={store.state.entries}
            selectedStageId={selectedStageId}
            onSelectStage={setSelectedStageId}
            onGoToStages={() => handleSelectTab('etapas')}
            onGoToBirds={() => handleSelectTab('aves')}
            onEnrollBird={store.enrollBirdInStage}
            onRemoveBirdFromStage={store.removeBirdFromStage}
            onUpdateStakeNumber={store.updateEntryStakeNumber}
            onUpdateSongs={store.updateEntrySongs}
          />
        )}

        {activeTab === 'etapas' && (
          <StagesView
            championshipName={store.state.championshipName}
            seasonYear={store.state.seasonYear}
            stages={store.state.stages}
            birds={store.state.birds}
            entries={store.state.entries}
            onAddStage={(input) => {
              const res = store.addStage(input);
              if (res.ok && res.stage) {
                setSelectedStageId(res.stage.id);
              }
              return res;
            }}
            onUpdateStage={store.updateStage}
            onDeleteStage={store.deleteStage}
            onOpenStageTournament={handleOpenStageTournament}
            onEnrollBird={store.enrollBirdInStage}
            onRemoveBirdFromStage={store.removeBirdFromStage}
            onUpdateStakeNumber={store.updateEntryStakeNumber}
          />
        )}

        {activeTab === 'aves' && (
          <BirdsView
            championshipName={store.state.championshipName}
            seasonYear={store.state.seasonYear}
            birds={store.state.birds}
            stages={store.state.stages}
            entries={store.state.entries}
            eventLogoDataUrl={store.state.eventLogoDataUrl}
            onAddBird={store.addBird}
            onUpdateBird={store.updateBird}
            onDeleteBird={store.deleteBird}
          />
        )}

        {activeTab === 'ranking' && (
          <RankingView
            championshipName={store.state.championshipName}
            seasonYear={store.state.seasonYear}
            stages={store.state.stages}
            birds={store.state.birds}
            entries={store.state.entries}
            eventLogoDataUrl={store.state.eventLogoDataUrl}
            onUpdateEventLogo={store.updateEventLogo}
            onOpenStageTournament={handleOpenStageTournament}
          />
        )}
      </main>

      <MobileBottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />
    </div>
  );
}
