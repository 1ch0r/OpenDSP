import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Play, Pause, Gauge } from 'lucide-react-native';
import { COLORS } from '@/constants/dsp-config';
import * as Haptics from 'expo-haptics';

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
}

const speeds = [0.5, 1, 2, 4];

export default function PlaybackControls({
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onSpeedChange,
}: PlaybackControlsProps) {
  const handleSpeedChange = () => {
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    onSpeedChange(speeds[nextIndex]);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.playButton, isPlaying && styles.playing]}
        onPress={onTogglePlay}
        testID="play-button"
      >
        {isPlaying ? (
          <Pause size={24} color={COLORS.background.dark} />
        ) : (
          <Play size={24} color={COLORS.background.dark} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.speedButton]}
        onPress={handleSpeedChange}
        testID="speed-button"
      >
        <Gauge size={18} color={COLORS.text.primary} />
        <Text style={styles.speedText}>{playbackSpeed}x</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  button: {
    borderRadius: 0, // Square off rounded corners
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  playButton: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.primary.mint,
  },
  playing: {
    backgroundColor: COLORS.primary.purple,
  },

  speedButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    height: 44,
    gap: 6,
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
  },
});
