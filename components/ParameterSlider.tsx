import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, PanResponder } from 'react-native';
import { BlockParameter } from '@/types/dsp';
import { COLORS } from '@/constants/dsp-config';
import * as Haptics from 'expo-haptics';

interface ParameterSliderProps {
  parameter: BlockParameter;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function ParameterSlider({ parameter, onChange, disabled }: ParameterSliderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(parameter.value.toString());
  const [sliderWidth, setSliderWidth] = useState(0);

  // Calculate normalized value with improved scaling
  const normalizedValue = (() => {
    if (parameter.unit === 'Hz' && parameter.max > 100000) {
      // Improved logarithmic scaling for frequency with better distribution
      const logMin = Math.log10(Math.max(parameter.min, 0.001));
      const logMax = Math.log10(parameter.max);
      const logValue = Math.log10(Math.max(parameter.value, 0.001));
      return (logValue - logMin) / (logMax - logMin);
    } else {
      // Linear scaling for other parameters
      return (parameter.value - parameter.min) / (parameter.max - parameter.min);
    }
  })();

  const handleSliderChange = useCallback((gestureX: number) => {
    if (disabled || sliderWidth === 0) return;

    const normalized = Math.max(0, Math.min(1, gestureX / sliderWidth));
    
    // Use improved scaling for frequency parameters with large ranges
    let newValue: number;
    if (parameter.unit === 'Hz' && parameter.max > 100000) {
      // Improved logarithmic scaling for frequency with better distribution
      const logMin = Math.log10(Math.max(parameter.min, 0.001));
      const logMax = Math.log10(parameter.max);
      const logValue = logMin + normalized * (logMax - logMin);
      newValue = Math.pow(10, logValue);
    } else {
      // Linear scaling for other parameters
      newValue = parameter.min + normalized * (parameter.max - parameter.min);
    }
    
    const steppedValue = Math.round(newValue / parameter.step) * parameter.step;
    
    onChange(steppedValue);
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, [disabled, sliderWidth, parameter, onChange]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // More stable movement detection - require minimum horizontal movement
      return !disabled && Math.abs(gestureState.dx) > 3;
    },
    onPanResponderGrant: (evt) => {
      // Use locationX for initial touch position
      const touchX = evt.nativeEvent.locationX;
      handleSliderChange(touchX);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Use locationX for more stable tracking during movement
      const touchX = evt.nativeEvent.locationX;
      // Only update if we have significant horizontal movement
      if (Math.abs(gestureState.dx) > 1) {
        handleSliderChange(touchX);
      }
    },
    onPanResponderTerminationRequest: () => false, // Don't allow termination during slide
    onShouldBlockNativeResponder: () => true, // Block native responder to prevent scroll
    onPanResponderRelease: () => {
      // Smooth release without additional changes
    },
  });

  const handleTextSubmit = () => {
    if (!tempValue.trim()) {
      setIsEditing(false);
      return;
    }
    
    let numValue = parseFloat(tempValue);
    
    // Handle unit suffixes for frequency input with better parsing
    if (parameter.unit === 'Hz' && typeof tempValue === 'string') {
      const lowerValue = tempValue.toLowerCase().trim();
      if (lowerValue.includes('ghz') || lowerValue.includes('g')) {
        numValue = parseFloat(lowerValue.replace(/ghz?/g, '')) * 1000000000;
      } else if (lowerValue.includes('mhz') || lowerValue.includes('m')) {
        numValue = parseFloat(lowerValue.replace(/mhz?/g, '')) * 1000000;
      } else if (lowerValue.includes('khz') || lowerValue.includes('k')) {
        numValue = parseFloat(lowerValue.replace(/khz?/g, '')) * 1000;
      } else if (lowerValue.includes('hz')) {
        numValue = parseFloat(lowerValue.replace(/hz/g, ''));
      }
    }
    
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(parameter.min, Math.min(parameter.max, numValue));
      onChange(clampedValue);
    }
    setIsEditing(false);
  };

  const formatValue = (value: number) => {
    // Use improved frequency formatting for Hz parameters
    if (parameter.unit === 'Hz') {
      if (value >= 1e9) {
        return `${(value / 1e9).toFixed(value >= 10e9 ? 1 : 2)}G`;
      } else if (value >= 1e6) {
        return `${(value / 1e6).toFixed(value >= 10e6 ? 1 : 2)}M`;
      } else if (value >= 1e3) {
        return `${(value / 1e3).toFixed(value >= 10e3 ? 1 : 2)}k`;
      } else {
        return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2);
      }
    }
    
    // Special formatting for dB values
    if (parameter.unit === 'dB') {
      return value.toFixed(1);
    }
    
    // Handle large amplitude values with appropriate formatting
    if (parameter.name === 'Amplitude' || parameter.name === 'Intensity') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      } else if (value >= 100) {
        return Math.round(value).toString();
      } else if (value >= 10) {
        return value.toFixed(1);
      } else {
        return value.toFixed(2);
      }
    }
    
    if (parameter.step >= 1) return Math.round(value).toString();
    if (parameter.step >= 0.1) return value.toFixed(1);
    return value.toFixed(2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{parameter.name}</Text>
        {isEditing ? (
          <TextInput
            style={styles.valueInput}
            value={tempValue}
            onChangeText={setTempValue}
            onBlur={handleTextSubmit}
            onSubmitEditing={handleTextSubmit}
            keyboardType={(parameter.unit === 'Hz' || parameter.unit === 'dB' || parameter.name === 'Amplitude' || parameter.name === 'Phase') ? 'default' : 'numeric'}
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Text
            style={styles.value}
            onPress={() => {
              setTempValue(formatValue(parameter.value));
              setIsEditing(true);
            }}
          >
            {formatValue(parameter.value)}{parameter.unit || ''}
          </Text>
        )}
      </View>
      
      <View
        style={styles.sliderTrack}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.sliderFill,
            { 
              width: sliderWidth > 0 ? normalizedValue * (sliderWidth - 20) : `${normalizedValue * 100}%`
            },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            { 
              left: sliderWidth > 0 ? normalizedValue * (sliderWidth - 20) : `${normalizedValue * 100}%`
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  value: {
    fontSize: 14,
    color: COLORS.primary.mint,
    fontWeight: '600' as const,
    padding: 4,
  },
  valueInput: {
    fontSize: 14,
    color: COLORS.primary.mint,
    fontWeight: '600' as const,
    borderWidth: 1,
    borderColor: COLORS.primary.mint,
    borderRadius: 0, // Square off rounded corners
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 60,
    textAlign: 'right',
  },
  sliderTrack: {
    height: 32,
    backgroundColor: COLORS.background.cardLight,
    borderRadius: 0, // Square off rounded corners
    justifyContent: 'center',
    overflow: 'visible',
    marginHorizontal: 12, // Add margin to prevent thumb from falling off edges
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: '100%',
    backgroundColor: COLORS.primary.purple + '40',
    borderRadius: 0, // Square off rounded corners
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 32, // Fill the full height of the track
    borderRadius: 0, // Square off rounded corners
    backgroundColor: COLORS.primary.mint,
    marginLeft: 0, // Attach to left edge instead of centering
    top: 0, // Align to top of track to fill completely
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary.mint,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
