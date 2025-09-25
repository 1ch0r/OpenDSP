import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Trash2, Power, Wine, Square, Zap, Filter, Radio, Minus, TrendingUp, Triangle, Activity, Pause, RotateCcw } from 'lucide-react-native';
import { Block, BlockType } from '@/types/dsp';
import { COLORS } from '@/constants/dsp-config';
import ParameterSlider from './ParameterSlider';

interface BlockCardProps {
  block: Block;
  lineId: string;
  onRemove: (lineId: string, blockId: string) => void;
  onToggle: (lineId: string, blockId: string) => void;
  onParameterChange: (lineId: string, blockId: string, paramName: string, value: number) => void;
}

const getBlockIcon = (type: BlockType) => {
  const iconProps = { size: 20, color: COLORS.primary.mint };
  switch (type) {
    case 'sine':
      return <Wine {...iconProps} />;
    case 'square':
      return <Square {...iconProps} />;
    case 'sawtooth':
      return <Activity {...iconProps} />;
    case 'triangle':
      return <Triangle {...iconProps} />;
    case 'pulse':
      return <Pause {...iconProps} />;
    case 'chirp':
      return <RotateCcw {...iconProps} />;
    case 'noise':
      return <Zap {...iconProps} />;
    case 'lowpass':
    case 'highpass':
      return <Filter {...iconProps} />;
    case 'bandpass':
      return <Radio {...iconProps} />;
    case 'notch':
      return <Minus {...iconProps} />;
    case 'interpolate':
      return <TrendingUp {...iconProps} />;
    default:
      return null;
  }
};

const getBlockTitle = (type: BlockType) => {
  switch (type) {
    case 'sine': return 'Sine Wave';
    case 'square': return 'Square Wave';
    case 'sawtooth': return 'Sawtooth Wave';
    case 'triangle': return 'Triangle Wave';
    case 'pulse': return 'Pulse Wave';
    case 'chirp': return 'Chirp/Sweep';
    case 'noise': return 'Noise';
    case 'lowpass': return 'Low-Pass Filter';
    case 'highpass': return 'High-Pass Filter';
    case 'bandpass': return 'Band-Pass Filter';
    case 'notch': return 'Notch Filter';
    case 'interpolate': return 'Interpolation';
    default: return type;
  }
};

export default function BlockCard({ block, lineId, onRemove, onToggle, onParameterChange }: BlockCardProps) {
  return (
    <View style={[styles.container, !block.enabled && styles.disabled]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {getBlockIcon(block.type)}
          <Text style={styles.title}>{getBlockTitle(block.type)}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onToggle(lineId, block.id)}
            style={[styles.actionButton, !block.enabled && styles.powerOff]}
            testID={`toggle-${block.id}`}
          >
            <Power size={18} color={block.enabled ? COLORS.primary.mint : COLORS.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRemove(lineId, block.id)}
            style={styles.actionButton}
            testID={`remove-${block.id}`}
          >
            <Trash2 size={18} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {block.enabled && (
        <View style={styles.parameters}>
          {Object.entries(block.parameters).map(([key, param]) => (
            <ParameterSlider
              key={key}
              parameter={param}
              onChange={(value) => onParameterChange(lineId, block.id, key, value)}
              disabled={!block.enabled}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.card,
    borderRadius: 0, // Square off rounded corners
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primary.purple + '30',
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
  disabled: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 0, // Square off rounded corners
    backgroundColor: COLORS.background.cardLight,
  },
  powerOff: {
    backgroundColor: COLORS.background.dark,
  },
  parameters: {
    gap: 12,
  },
});
