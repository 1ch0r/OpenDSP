import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/dsp-config';

interface FrequencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function FrequencyInput({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 10000000000, 
  disabled 
}: FrequencyInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');

  const parseFrequency = useCallback((input: string): number => {
    const cleanInput = input.trim().toLowerCase();
    let numValue = parseFloat(cleanInput);
    
    if (isNaN(numValue)) return value; // Return current value if invalid
    
    // Handle unit suffixes with case-insensitive matching
    if (cleanInput.includes('ghz') || cleanInput.includes('g')) {
      numValue = parseFloat(cleanInput.replace(/[ghz\s]/g, '')) * 1e9;
    } else if (cleanInput.includes('mhz') || cleanInput.includes('m')) {
      numValue = parseFloat(cleanInput.replace(/[mhz\s]/g, '')) * 1e6;
    } else if (cleanInput.includes('khz') || cleanInput.includes('k')) {
      numValue = parseFloat(cleanInput.replace(/[khz\s]/g, '')) * 1e3;
    } else if (cleanInput.includes('hz')) {
      numValue = parseFloat(cleanInput.replace(/[hz\s]/g, ''));
    }
    
    // Clamp to bounds
    return Math.max(min, Math.min(max, numValue));
  }, [value, min, max]);

  const formatFrequency = useCallback((freq: number): string => {
    if (freq >= 1e9) {
      return `${(freq / 1e9).toFixed(freq >= 10e9 ? 1 : 2)} GHz`;
    } else if (freq >= 1e6) {
      return `${(freq / 1e6).toFixed(freq >= 10e6 ? 1 : 2)} MHz`;
    } else if (freq >= 1e3) {
      return `${(freq / 1e3).toFixed(freq >= 10e3 ? 1 : 2)} kHz`;
    } else {
      return `${freq.toFixed(freq >= 100 ? 0 : freq >= 10 ? 1 : 2)} Hz`;
    }
  }, []);

  const handleStartEdit = () => {
    if (disabled) return;
    setTempValue(formatFrequency(value));
    setIsEditing(true);
  };

  const handleSubmit = () => {
    const newValue = parseFrequency(tempValue);
    onChange(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempValue('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {isEditing ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={tempValue}
            onChangeText={setTempValue}
            onSubmitEditing={handleSubmit}
            onBlur={handleCancel}
            placeholder="e.g. 2.4 GHz"
            placeholderTextColor={COLORS.text.secondary + '60'}
            keyboardType="default" // Use default keyboard, not numeric
            autoFocus
            selectTextOnFocus
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.valueContainer, disabled && styles.disabled]} 
          onPress={handleStartEdit}
          disabled={disabled}
        >
          <Text style={[styles.value, disabled && styles.disabledText]}>
            {formatFrequency(value)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.primary.mint,
    fontWeight: '600' as const,
    borderWidth: 2,
    borderColor: COLORS.primary.mint,
    borderRadius: 0, // Square off rounded corners
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background.card,
  },
  submitButton: {
    marginLeft: 8,
    backgroundColor: COLORS.primary.mint,
    borderRadius: 0, // Square off rounded corners
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  submitText: {
    color: COLORS.background.dark,
    fontWeight: 'bold' as const,
    fontSize: 16,
  },
  valueContainer: {
    backgroundColor: COLORS.background.cardLight,
    borderRadius: 0, // Square off rounded corners
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary.mint + '40',
  },
  value: {
    fontSize: 16,
    color: COLORS.primary.mint,
    fontWeight: '600' as const,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: COLORS.text.secondary,
  },
});
