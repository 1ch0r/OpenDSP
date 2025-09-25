import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useDSP } from '@/hooks/use-dsp-store';
import { COLORS } from '@/constants/dsp-config';
import Oscilloscope from '@/components/Oscilloscope';
import WaveformLineCard from '@/components/WaveformLineCard';
import WaveformAttributes from '@/components/WaveformAttributes';
import PlaybackControls from '@/components/PlaybackControls';

export default function BuilderScreen() {
  const {
    waveformLines,
    selectedLineId,
    setSelectedLineId,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    setCurrentTime,
    addWaveformLine,
    removeWaveformLine,
    addBlock,
    removeBlock,
    updateBlockParameter,
    toggleBlock,
    toggleMute,
    toggleVisible,
    toggleSolo,
    processWaveforms,
    globalSettings,
    updateGlobalSettings,
    exportWaveformData,
  } = useDSP();

  const processedWaveforms = useMemo(() => processWaveforms(), [processWaveforms]);



  return (
    <LinearGradient
      colors={[COLORS.background.dark, COLORS.primary.darkPurple + '20']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.visualSection}>
          <View style={styles.oscilloscopeContainer}>
            <Oscilloscope waveforms={processedWaveforms} />
          </View>
          
          <PlaybackControls
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSpeedChange={setPlaybackSpeed}
          />
        </View>

        <View style={styles.linesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerActions}>
              <WaveformAttributes
                globalSettings={globalSettings}
                onSettingsChange={updateGlobalSettings}
                onExportData={exportWaveformData}
              />
              {waveformLines.length < 5 && (
                <TouchableOpacity
                  style={styles.addLineButton}
                  onPress={addWaveformLine}
                  testID="add-line-button"
                >
                  <Plus size={20} color={COLORS.background.dark} />
                  <Text style={styles.addLineText}>Add Line</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {waveformLines.map((line) => (
            <WaveformLineCard
              key={line.id}
              line={line}
              isSelected={selectedLineId === line.id}
              onSelect={() => setSelectedLineId(line.id)}
              onRemove={() => removeWaveformLine(line.id)}
              onToggleMute={() => toggleMute(line.id)}
              onToggleVisible={() => toggleVisible(line.id)}
              onToggleSolo={() => toggleSolo(line.id)}
              onAddBlock={(type) => addBlock(line.id, type)}
              onRemoveBlock={(blockId) => removeBlock(line.id, blockId)}
              onToggleBlock={(blockId) => toggleBlock(line.id, blockId)}
              onUpdateParameter={(lineId, blockId, paramName, value) =>
                updateBlockParameter(lineId, blockId, paramName, value)
              }
            />
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  visualSection: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  oscilloscopeContainer: {
    marginBottom: 16,
  },

  linesSection: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text.primary,
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary.mint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0, // Square off rounded corners
  },
  addLineText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.background.dark,
  },
});
