import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useDSP } from '@/hooks/use-dsp-store';
import { COLORS } from '@/constants/dsp-config';
import WaterfallDisplay from '@/components/WaterfallDisplay';
import PlaybackControls from '@/components/PlaybackControls';
import FrequencyInput from '@/components/FrequencyInput';
import ParameterSlider from '@/components/ParameterSlider';
import { generateWaterfallData } from '@/utils/dsp-processing';
import { BlockParameter } from '@/types/dsp';

export default function WaterfallScreen() {
  const insets = useSafeAreaInsets();
  const [squelchLevel, setSquelchLevel] = useState(-60); // dB squelch level
  
  const {
    waveformLines,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    currentTime,
    processWaveforms,
    waterfallHistory,
    processWaterfall,
    globalSettings,
    updateWaterfallCenter,
  } = useDSP();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Process waterfall data at optimal rate for smooth performance with error handling
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        try {
          processWaterfall();
        } catch (error) {
          console.warn('Error processing waterfall:', error);
        }
      }, 150); // Increased to 150ms for better performance
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, processWaterfall]);

  const processedWaveforms = useMemo(() => {
    try {
      return processWaveforms();
    } catch (error) {
      console.warn('Error processing waveforms:', error);
      return [];
    }
  }, [processWaveforms]);
  
  const waterfallData = useMemo(() => {
    try {
      if (!processedWaveforms || processedWaveforms.length === 0) {
        return [];
      }
      return generateWaterfallData(
        processedWaveforms, 
        currentTime, 
        globalSettings.waterfallCenterFreq, 
        globalSettings.waterfallBandwidth
      );
    } catch (error) {
      console.warn('Error generating waterfall data:', error);
      return [];
    }
  }, [processedWaveforms, currentTime, globalSettings.waterfallCenterFreq, globalSettings.waterfallBandwidth]);



  const activeWaveforms = waveformLines.filter(line => line.visible && !line.muted);

  return (
    <LinearGradient
      colors={[COLORS.background.dark, COLORS.primary.darkPurple + '20']}
      style={styles.container}
    >
      <ScrollView 
        style={[styles.scrollView, { paddingTop: insets.top }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Frequency Analysis</Text>
          <Text style={styles.subtitle}>
            {activeWaveforms.length} active waveform{activeWaveforms.length !== 1 ? 's' : ''} • Center/Bandwidth control
          </Text>
          
          <PlaybackControls
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSpeedChange={setPlaybackSpeed}
          />
        </View>



        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Waterfall Controls</Text>
          <View style={styles.controlsGrid}>
            <View style={styles.frequencyInputContainer}>
              <FrequencyInput
                label="Center Frequency"
                value={globalSettings.waterfallCenterFreq}
                onChange={(value) => updateWaterfallCenter(value, globalSettings.waterfallBandwidth)}
                min={globalSettings.waterfallBandwidth / 2}
                max={10000000000 - globalSettings.waterfallBandwidth / 2} // 10GHz max center frequency
              />
            </View>
            <View style={styles.frequencyInputContainer}>
              <FrequencyInput
                label="Bandwidth"
                value={globalSettings.waterfallBandwidth}
                onChange={(value) => updateWaterfallCenter(globalSettings.waterfallCenterFreq, value)}
                min={1}
                max={2000000000} // 2GHz max bandwidth
              />
            </View>
            <View style={styles.squelchContainer}>
              <ParameterSlider
                parameter={{
                  name: 'Squelch',
                  value: squelchLevel,
                  min: -100,
                  max: 0,
                  step: 1,
                  unit: 'dB'
                } as BlockParameter}
                onChange={setSquelchLevel}
              />
            </View>
          </View>
        </View>

        <View style={styles.waterfallSection}>
          {waterfallData && Array.isArray(waterfallData) ? (
            <WaterfallDisplay 
              waterfallData={waterfallData} 
              history={waterfallHistory}
              centerFreq={globalSettings.waterfallCenterFreq}
              bandwidth={globalSettings.waterfallBandwidth}
              squelchLevel={squelchLevel}
              isPlaying={isPlaying}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No waterfall data available</Text>
              <Text style={styles.errorSubtext}>Add waveforms in the Builder tab to see frequency analysis</Text>
            </View>
          )}
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Waveform Legend</Text>
          {activeWaveforms.map((line, index) => (
            <View key={line.id} style={styles.legendItem}>
              <View style={[styles.colorIndicator, { backgroundColor: line.color }]} />
              <Text style={styles.legendText}>{line.name}</Text>
              <Text style={styles.legendBlocks}>{line.blocks.length} blocks</Text>
            </View>
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
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  controlsSection: {
    padding: 20,
    backgroundColor: COLORS.background.card + '80',
    marginHorizontal: 16,
    borderRadius: 0, // Square off rounded corners
    marginBottom: 16,
    alignSelf: 'center',
    width: '92%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  controlsGrid: {
    gap: 16,
  },
  frequencyInputContainer: {
    marginBottom: 8,
  },
  squelchContainer: {
    marginTop: 8,
  },
  waterfallSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  legendSection: {
    padding: 20,
    backgroundColor: COLORS.background.card + '80',
    marginHorizontal: 16,
    borderRadius: 0, // Square off rounded corners
    marginBottom: 20,
    alignSelf: 'center',
    width: '92%',
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 0, // Square off rounded corners
    marginRight: 12,
  },
  legendText: {
    fontSize: 16,
    color: COLORS.text.primary,
    flex: 1,
  },
  legendBlocks: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.card + '40',
    borderRadius: 0,
    marginHorizontal: 16,
    minHeight: 200,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
