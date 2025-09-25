import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Eye, EyeOff, Volume2, VolumeX, Trash2, Plus } from 'lucide-react-native';
import { WaveformLine, BlockType } from '@/types/dsp';
import { COLORS } from '@/constants/dsp-config';
import BlockCard from './BlockCard';

interface WaveformLineCardProps {
  line: WaveformLine;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onToggleMute: () => void;
  onToggleVisible: () => void;
  onToggleSolo: () => void;
  onAddBlock: (type: BlockType) => void;
  onRemoveBlock: (blockId: string) => void;
  onToggleBlock: (blockId: string) => void;
  onUpdateParameter: (lineId: string, blockId: string, paramName: string, value: number) => void;
}

const blockCategories = {
  waveforms: [
    { type: 'sine' as BlockType, label: 'Sine' },
    { type: 'square' as BlockType, label: 'Square' },
    { type: 'sawtooth' as BlockType, label: 'Sawtooth' },
    { type: 'triangle' as BlockType, label: 'Triangle' },
    { type: 'pulse' as BlockType, label: 'Pulse' },
    { type: 'chirp' as BlockType, label: 'Chirp' },
    { type: 'noise' as BlockType, label: 'Noise' },
  ],
  filters: [
    { type: 'lowpass' as BlockType, label: 'LPF' },
    { type: 'highpass' as BlockType, label: 'HPF' },
    { type: 'bandpass' as BlockType, label: 'BPF' },
    { type: 'notch' as BlockType, label: 'Notch' },
  ],
  processing: [
    { type: 'interpolate' as BlockType, label: 'Interp' },
  ],
};

export default function WaveformLineCard({
  line,
  isSelected,
  onSelect,
  onRemove,
  onToggleMute,
  onToggleVisible,
  onToggleSolo,
  onAddBlock,
  onRemoveBlock,
  onToggleBlock,
  onUpdateParameter,
}: WaveformLineCardProps) {
  return (
    <View style={[styles.container, isSelected && styles.selected]}>
      <TouchableOpacity onPress={onSelect} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.colorIndicator, { backgroundColor: line.color }]} />
            <Text style={styles.title}>{line.name}</Text>
          </View>
          
          <View style={styles.controls}>

            <TouchableOpacity onPress={onToggleMute} style={styles.controlButton}>
              {line.muted ? (
                <VolumeX size={18} color={COLORS.text.secondary} />
              ) : (
                <Volume2 size={18} color={COLORS.primary.mint} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onToggleVisible} style={styles.controlButton}>
              {line.visible ? (
                <Eye size={18} color={COLORS.primary.mint} />
              ) : (
                <EyeOff size={18} color={COLORS.text.secondary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onRemove} style={styles.controlButton}>
              <Trash2 size={18} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {isSelected && (
        <View style={styles.content}>
          <View style={styles.categoriesContainer}>
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>Waveforms & Noise</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blockTypesRow}>
                {blockCategories.waveforms.map((blockType) => (
                  <TouchableOpacity
                    key={blockType.type}
                    style={styles.addBlockButton}
                    onPress={() => onAddBlock(blockType.type)}
                  >
                    <Plus size={14} color={COLORS.text.primary} />
                    <Text style={styles.addBlockText}>{blockType.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>Filters</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blockTypesRow}>
                {blockCategories.filters.map((blockType) => (
                  <TouchableOpacity
                    key={blockType.type}
                    style={styles.addBlockButton}
                    onPress={() => onAddBlock(blockType.type)}
                  >
                    <Plus size={14} color={COLORS.text.primary} />
                    <Text style={styles.addBlockText}>{blockType.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>Processing</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blockTypesRow}>
                {blockCategories.processing.map((blockType) => (
                  <TouchableOpacity
                    key={blockType.type}
                    style={styles.addBlockButton}
                    onPress={() => onAddBlock(blockType.type)}
                  >
                    <Plus size={14} color={COLORS.text.primary} />
                    <Text style={styles.addBlockText}>{blockType.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {line.blocks.length === 0 ? (
            <Text style={styles.emptyText}>No blocks added. Tap + to add a signal generator or filter.</Text>
          ) : (
            <View style={styles.blocksList}>
              {line.blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  lineId={line.id}
                  onRemove={(lineId, blockId) => onRemoveBlock(blockId)}
                  onToggle={(lineId, blockId) => onToggleBlock(blockId)}
                  onParameterChange={(lineId, blockId, paramName, value) => onUpdateParameter(lineId, blockId, paramName, value)}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.card,
    borderRadius: 0, // Square off rounded corners
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: COLORS.primary.purple,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 0, // Square off rounded corners
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    padding: 8,
    borderRadius: 0, // Square off rounded corners
    backgroundColor: COLORS.background.cardLight,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  blockTypesRow: {
    flexGrow: 0,
  },
  addBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary.purple + '30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0, // Square off rounded corners
    marginRight: 8,
  },
  addBlockText: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '500' as const,
  },
  blocksList: {
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.text.secondary,
    fontSize: 14,
    paddingVertical: 20,
  },
});
