import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { AppRadius, AppTheme } from '../theme/colors';

interface AppTextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  containerStyle?: ViewStyle;
  prefix?: string;
}

export const AppTextField: React.FC<AppTextFieldProps> = ({
  label,
  error,
  containerStyle,
  prefix,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputError : null,
        ]}
      >
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          placeholderTextColor={AppTheme.textMuted}
          style={[styles.input, style]}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.surface,
    borderWidth: 1.5,
    borderColor: AppTheme.border,
    borderRadius: AppRadius.md,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: AppTheme.danger,
    backgroundColor: `${AppTheme.danger}12`,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    color: AppTheme.textSecondary,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AppTheme.text,
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    color: AppTheme.danger,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
});