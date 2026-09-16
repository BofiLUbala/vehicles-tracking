import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import { AppTheme } from '../theme/colors';

export type BigButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

interface BigButtonProps {
  label: string;
  onPressed?: (() => void) | null;
  variant?: BigButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const BigButton: React.FC<BigButtonProps> = ({
  label,
  onPressed,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  icon,
  style,
}) => {
  const isButtonDisabled = disabled || isLoading || !onPressed;

  const getBackgroundColor = (): string => {
    if (isButtonDisabled) return '#CBD5E1'; // Slate 300
    switch (variant) {
      case 'primary':
        return AppTheme.primary;
      case 'secondary':
        return '#0F172A'; // Slate 900
      case 'danger':
        return AppTheme.danger;
      case 'outline':
        return 'transparent';
      default:
        return AppTheme.primary;
    }
  };

  const getTextColor = (): string => {
    if (isButtonDisabled) return '#64748B'; // Slate 500
    if (variant === 'outline') return AppTheme.primary;
    return '#FFFFFF';
  };

  const getBorderColor = (): string => {
    if (variant === 'outline') {
      return isButtonDisabled ? '#CBD5E1' : AppTheme.primary;
    }
    return 'transparent';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPressed ?? undefined}
      disabled={isButtonDisabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 2 : 0,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, { color: getTextColor() }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
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
    letterSpacing: 0.3,
  },
});
