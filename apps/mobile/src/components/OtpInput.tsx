import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
} from 'react-native';
import { AppRadius, AppTheme } from '../theme/colors';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
}) => {
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(autoFocus ? 0 : -1);

  // Split value into array of digits of exact length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleTextChange = (text: string, index: number) => {
    if (disabled) return;

    // Handle full paste
    const cleanText = text.replace(/\D/g, '');
    if (cleanText.length > 1) {
      const pastedCode = cleanText.slice(0, length);
      onChange(pastedCode);
      const nextIndex = Math.min(pastedCode.length, length - 1);
      inputsRef.current[nextIndex]?.focus();
      if (pastedCode.length === length && onComplete) {
        onComplete(pastedCode);
      }
      return;
    }

    // Single digit input
    const singleDigit = cleanText.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    const newValue = newDigits.join('').trimEnd();
    onChange(newValue);

    if (singleDigit) {
      if (index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      } else {
        inputsRef.current[index]?.blur();
        if (newValue.length === length && onComplete) {
          onComplete(newValue);
        }
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (disabled) return;

    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, move to previous box and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        const newValue = newDigits.join('').trimEnd();
        onChange(newValue);
        inputsRef.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join('').trimEnd());
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => {
        const isFocused = focusedIndex === index;
        const digit = digits[index];
        const isFilled = !!digit;

        return (
          <Pressable
            key={index}
            onPress={() => {
              if (!disabled) {
                inputsRef.current[index]?.focus();
              }
            }}
            style={[
              styles.box,
              isFocused && styles.boxFocused,
              isFilled && styles.boxFilled,
              hasError && styles.boxError,
              disabled && styles.boxDisabled,
            ]}
          >
            <TextInput
              ref={(ref) => {
                inputsRef.current[index] = ref;
              }}
              style={[
                styles.input,
                isFocused && styles.inputFocused,
                hasError && styles.inputError,
              ]}
              value={digit}
              onChangeText={(text) => handleTextChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              keyboardType="number-pad"
              maxLength={index === 0 ? length : 1}
              selectTextOnFocus
              editable={!disabled}
              accessibilityLabel={`Chiffre ${index + 1} du code de vérification`}
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  box: {
    flex: 1,
    height: 58,
    marginHorizontal: 4,
    borderRadius: AppRadius.md,
    borderWidth: 1.5,
    borderColor: AppTheme.border,
    backgroundColor: AppTheme.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxFocused: {
    borderColor: AppTheme.primary,
    backgroundColor: AppTheme.surface,
    shadowColor: AppTheme.primary,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
  },
  boxFilled: {
    borderColor: AppTheme.textMuted,
    backgroundColor: AppTheme.subtle,
  },
  boxError: {
    borderColor: AppTheme.danger,
    backgroundColor: `${AppTheme.danger}12`,
  },
  boxDisabled: {
    backgroundColor: AppTheme.subtle,
    borderColor: AppTheme.border,
    opacity: 0.6,
  },
  input: {
    fontSize: 24,
    fontWeight: '700',
    color: AppTheme.text,
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
  inputFocused: {
    color: AppTheme.primary,
  },
  inputError: {
    color: AppTheme.danger,
  },
});
