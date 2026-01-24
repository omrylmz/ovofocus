import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface EggContainerProps {
  children: React.ReactNode;
}

/**
 * A responsive container for the egg and timer that:
 * - Centers content in available space
 * - Scales proportionally to screen size
 * - Never overlaps with header or controls
 */
export function EggContainer({ children }: EggContainerProps) {
  const { progressRingSize } = useResponsive();

  return (
    <View style={[styles.container, { minHeight: progressRingSize + 60 }]}>
      <View style={[styles.content, { width: progressRingSize, height: progressRingSize }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
