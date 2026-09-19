import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import { AppShadow, AppRadius, AppTheme } from '../theme/colors';

export type BigButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'success';

interface BigButtonProps {
  label: string;
  onPressed?: (() => void) | null;
  variant?: BigButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  /** Petit motif (hauteur réduite) pour les actions secondaires en ligne. */
  compact?: boolean;
}

const VARIANT_COLORS: Record<BigButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: AppTheme.primary, text: '#FFFFFF' },
  secondary: { bg: AppTheme.navy, text: '#FFFFFF' },
  danger: { bg: AppTheme.danger, text: '#FFFFFF' },
  success: { bg: AppTheme.success, text: '#FFFFFF' },
  outline: { bg: 'transparent', text: AppTheme.primary, border: AppTheme.primary },
};

export const BigButton: React.FC<BigButtonProps> = ({
  label,
  onPressed,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  icon,
  style,
  compact = false,
}) => {
  const isButtonDisabled = disabled || isLoading || !onPressed;

  const colors = VARIANT_COLORS[variant];
  const base = isButtonDisabled ? { bg: '#D8DEE8', text: AppTheme.textMuted } : colors;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPressed ?? undefined}
      disabled={isButtonDisabled}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: base.bg,
          borderColor: base.border ?? 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        !isButtonDisabled && styles.shadow,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={base.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, compact && styles.textCompact, { color: base.text }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: AppRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonCompact: {
    height: 44,
    borderRadius: AppRadius.md,
    paddingHorizontal: 16,
  },
  shadow: AppShadow.card,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textCompact: {
    fontSize: 15,
  },
});