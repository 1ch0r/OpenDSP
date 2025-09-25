import React, { useMemo, memo, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Plus, Minus, Zap } from 'lucide-react-native';
import { COLORS } from '@/constants/dsp-config';
import { SignalPoint } from '@/types/dsp';

interface OscilloscopeProps {
  waveforms: {
    points: SignalPoint[];
    color: string;
    visible: boolean;
  }[];
}

const SCOPE_HEIGHT = 250;

const Oscilloscope = memo(function Oscilloscope({ waveforms }: OscilloscopeProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [amplitudeScale, setAmplitudeScale] = useState<number>(1);
  const [frequencyScale, setFrequencyScale] = useState<number>(1);
  const [amplitudeAutoNormalize, setAmplitudeAutoNormalize] = useState<boolean>(false);
  const [frequencyAutoNormalize, setFrequencyAutoNormalize] = useState<boolean>(false);
  const [actualAmplitudeScale, setActualAmplitudeScale] = useState<number>(1);
  const [actualFrequencyScale, setActualFrequencyScale] = useState<number>(1);

  // Calculate auto-normalization scales
  const calculateAutoScales = useMemo(() => {
    const visibleWaveforms = waveforms.filter(w => w.visible && w.points && w.points.length > 0);
    if (visibleWaveforms.length === 0) {
      return { autoAmplitudeScale: 1, autoFrequencyScale: 1 };
    }

    let minY = Infinity, maxY = -Infinity;
    let minX = Infinity, maxX = -Infinity;

    visibleWaveforms.forEach(waveform => {
      waveform.points.forEach(point => {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
      });
    });

    // Calculate amplitude scale to fit waveform in oscilloscope
    const amplitudeRange = Math.max(Math.abs(maxY - 0.5), Math.abs(minY - 0.5));
    const autoAmplitudeScale = amplitudeRange > 0 ? Math.min(Number.MAX_SAFE_INTEGER, 0.4 / amplitudeRange) : 1;

    // Calculate frequency scale to fit waveform width
    const frequencyRange = Math.max(Math.abs(maxX - 0.5), Math.abs(minX - 0.5));
    const autoFrequencyScale = frequencyRange > 0 ? Math.min(Number.MAX_SAFE_INTEGER, 0.4 / frequencyRange) : 1;

    return { autoAmplitudeScale, autoFrequencyScale };
  }, [waveforms]);

  // Update actual scales based on auto-normalize mode
  useEffect(() => {
    if (amplitudeAutoNormalize) {
      setActualAmplitudeScale(calculateAutoScales.autoAmplitudeScale);
    } else {
      setActualAmplitudeScale(amplitudeScale);
    }
  }, [amplitudeAutoNormalize, amplitudeScale, calculateAutoScales.autoAmplitudeScale]);

  useEffect(() => {
    if (frequencyAutoNormalize) {
      setActualFrequencyScale(calculateAutoScales.autoFrequencyScale);
    } else {
      setActualFrequencyScale(frequencyScale);
    }
  }, [frequencyAutoNormalize, frequencyScale, calculateAutoScales.autoFrequencyScale]);

  const handleAmplitudeScaleUp = () => {
    if (amplitudeAutoNormalize) return;
    setAmplitudeScale(prev => Math.min(prev * 2, Number.MAX_SAFE_INTEGER));
  };

  const handleAmplitudeScaleDown = () => {
    if (amplitudeAutoNormalize) return;
    setAmplitudeScale(prev => Math.max(prev / 2, Number.MIN_VALUE));
  };

  const handleFrequencyScaleUp = () => {
    if (frequencyAutoNormalize) return;
    setFrequencyScale(prev => Math.min(prev * 2, Number.MAX_SAFE_INTEGER));
  };

  const handleFrequencyScaleDown = () => {
    if (frequencyAutoNormalize) return;
    setFrequencyScale(prev => Math.max(prev / 2, Number.MIN_VALUE));
  };

  const toggleAmplitudeAutoNormalize = () => {
    setAmplitudeAutoNormalize(prev => !prev);
  };

  const toggleFrequencyAutoNormalize = () => {
    setFrequencyAutoNormalize(prev => !prev);
  };
  const paths = useMemo(() => {
    return waveforms
      .filter((w) => w.visible)
      .map((waveform) => {
        if (!waveform.points || waveform.points.length === 0) return null;

        // Optimize path generation with reduced precision
        const step = Math.max(1, Math.floor(waveform.points.length / 200)); // Reduce points for performance
        const pathData = waveform.points
          .filter((_, index) => index % step === 0)
          .map((point, index) => {
            // Apply frequency scaling to x coordinate (time axis compression/expansion)
            const scaledX = (point.x - 0.5) * actualFrequencyScale + 0.5;
            const x = Math.round(Math.max(0, Math.min(1, scaledX)) * screenWidth);
            // Apply amplitude scaling to y coordinate
            const scaledY = (point.y - 0.5) * actualAmplitudeScale + 0.5;
            const y = Math.round(scaledY * SCOPE_HEIGHT);
            return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
          })
          .join(' ');

        return { path: pathData, color: waveform.color };
      })
      .filter(Boolean);
  }, [waveforms, actualAmplitudeScale, actualFrequencyScale, screenWidth]);

  return (
    <View style={styles.container}>
      {/* Scale Controls */}
      <View style={styles.scaleControlsContainer}>
        {/* Amplitude Scale Controls */}
        <View style={styles.scaleControls}>
          <Text style={styles.scaleLabel}>
            Amplitude: {amplitudeAutoNormalize ? 'Auto' : `${amplitudeScale.toExponential(2)}`}x
          </Text>
          <View style={styles.scaleButtons}>
            <TouchableOpacity 
              style={[styles.scaleButton, amplitudeAutoNormalize && styles.autoButton]} 
              onPress={toggleAmplitudeAutoNormalize}
            >
              <Zap size={16} color={amplitudeAutoNormalize ? COLORS.primary.mint : COLORS.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scaleButton, amplitudeAutoNormalize && styles.disabledButton]} 
              onPress={handleAmplitudeScaleDown}
              disabled={amplitudeAutoNormalize}
            >
              <Minus size={16} color={amplitudeAutoNormalize ? COLORS.text.secondary : COLORS.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scaleButton, amplitudeAutoNormalize && styles.disabledButton]} 
              onPress={handleAmplitudeScaleUp}
              disabled={amplitudeAutoNormalize}
            >
              <Plus size={16} color={amplitudeAutoNormalize ? COLORS.text.secondary : COLORS.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Frequency Scale Controls */}
        <View style={styles.scaleControls}>
          <Text style={styles.scaleLabel}>
            Frequency: {frequencyAutoNormalize ? 'Auto' : `${frequencyScale.toExponential(2)}`}x
          </Text>
          <View style={styles.scaleButtons}>
            <TouchableOpacity 
              style={[styles.scaleButton, frequencyAutoNormalize && styles.autoButton]} 
              onPress={toggleFrequencyAutoNormalize}
            >
              <Zap size={16} color={frequencyAutoNormalize ? COLORS.primary.mint : COLORS.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scaleButton, frequencyAutoNormalize && styles.disabledButton]} 
              onPress={handleFrequencyScaleDown}
              disabled={frequencyAutoNormalize}
            >
              <Minus size={16} color={frequencyAutoNormalize ? COLORS.text.secondary : COLORS.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.scaleButton, frequencyAutoNormalize && styles.disabledButton]} 
              onPress={handleFrequencyScaleUp}
              disabled={frequencyAutoNormalize}
            >
              <Plus size={16} color={frequencyAutoNormalize ? COLORS.text.secondary : COLORS.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <Svg width={screenWidth} height={SCOPE_HEIGHT} style={styles.svg}>
        <Defs>
          <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.primary.darkPurple} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={COLORS.background.dark} stopOpacity="0.8" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width={screenWidth} height={SCOPE_HEIGHT} fill="url(#bgGradient)" />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((y) => (
          <Line
            key={y}
            x1="0"
            y1={y * SCOPE_HEIGHT}
            x2={screenWidth}
            y2={y * SCOPE_HEIGHT}
            stroke={COLORS.text.secondary}
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        ))}

        {/* Center line */}
        <Line
          x1="0"
          y1={SCOPE_HEIGHT / 2}
          x2={screenWidth}
          y2={SCOPE_HEIGHT / 2}
          stroke={COLORS.text.secondary}
          strokeOpacity="0.2"
          strokeWidth="1"
          strokeDasharray="5,5"
        />

        {/* Waveforms */}
        {paths.map((pathData, index) => (
          pathData && (
            <Path
              key={`waveform-${index}`}
              d={pathData.path}
              stroke={pathData.color}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        ))}
      </Svg>
    </View>
  );
});

export default Oscilloscope;

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.dark,
    borderRadius: 0, // Square off rounded corners
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary.purple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scaleControlsContainer: {
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scaleControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  scaleLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600' as const,
  },
  scaleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  scaleButton: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.background.cardLight,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoButton: {
    backgroundColor: COLORS.primary.purple + '30',
    borderWidth: 1,
    borderColor: COLORS.primary.mint,
  },
  disabledButton: {
    opacity: 0.5,
  },
  svg: {
    position: 'relative',
  },
});
