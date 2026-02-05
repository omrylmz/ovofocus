import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';

type Language = 'en' | 'tr' | 'es';

interface SessionHeaderProps {
    currentStreak: number;
    dailyCompletedSessions: number;
    dailyGoal: number;
    collectionLabel: string;
    onCollectionPress: () => void;
    onSettingsPress: () => void;
    onStatsPress: () => void;
    language?: Language;
}

// Minimum touch target size for accessibility (44x44 points)
const TOUCH_TARGET_SIZE = 44;

// Animated icon button with press feedback
function IconButton({
    onPress,
    icon,
    accessibilityLabel,
    accessibilityHint,
    testID,
}: {
    onPress: () => void;
    icon: string;
    accessibilityLabel: string;
    accessibilityHint: string;
    testID?: string;
}) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
        opacity.value = withTiming(0.7, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        opacity.value = withTiming(1, { duration: 100 });
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.iconButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={testID}
        >
            <Animated.View style={[styles.iconButtonInner, animatedStyle]}>
                <Text style={styles.iconText}>{icon}</Text>
            </Animated.View>
        </Pressable>
    );
}

// App logo/title component
function AppLogo() {
    return (
        <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🥚</Text>
            <View style={styles.logoTextContainer}>
                <Text style={styles.logoTitle}>Ovo</Text>
                <Text style={styles.logoSubtitle}>Focus</Text>
            </View>
        </View>
    );
}

export function SessionHeader({
    currentStreak,
    dailyCompletedSessions,
    dailyGoal,
    collectionLabel,
    onCollectionPress,
    onSettingsPress,
    onStatsPress,
    language = 'en',
}: SessionHeaderProps) {
    // Accessibility labels with Spanish support
    const a11y = {
        collectionLabel: language === 'tr'
            ? 'Koleksiyonu aç'
            : language === 'es'
            ? 'Abrir coleccion'
            : 'Open collection',
        collectionHint: language === 'tr'
            ? 'Hayvan koleksiyonunuzu görüntüleyin'
            : language === 'es'
            ? 'Ver tu coleccion de animales'
            : 'View your animal collection',
        settingsLabel: language === 'tr'
            ? 'Ayarları aç'
            : language === 'es'
            ? 'Abrir configuracion'
            : 'Open settings',
        settingsHint: language === 'tr'
            ? 'Uygulama tercihlerini düzenleyin'
            : language === 'es'
            ? 'Ajustar preferencias de la aplicacion'
            : 'Adjust app preferences',
        statsLabel: language === 'tr'
            ? 'İstatistikleri aç'
            : language === 'es'
            ? 'Abrir estadisticas'
            : 'Open statistics',
        statsHint: language === 'tr'
            ? 'Odaklanma istatistiklerini görüntüleyin'
            : language === 'es'
            ? 'Ver tus estadisticas de enfoque'
            : 'View your focus statistics',
    };

    return (
        <View style={styles.headerContainer}>
            {/* Main header row */}
            <View style={styles.header} accessibilityRole="toolbar">
                {/* Left: App logo/title */}
                <AppLogo />

                {/* Right: Action icons */}
                <View style={styles.headerActions}>
                    <IconButton
                        onPress={onCollectionPress}
                        icon="📦"
                        accessibilityLabel={a11y.collectionLabel}
                        accessibilityHint={a11y.collectionHint}
                    />
                    <IconButton
                        onPress={onStatsPress}
                        icon="📊"
                        accessibilityLabel={a11y.statsLabel}
                        accessibilityHint={a11y.statsHint}
                    />
                    <IconButton
                        onPress={onSettingsPress}
                        icon="⚙️"
                        accessibilityLabel={a11y.settingsLabel}
                        accessibilityHint={a11y.settingsHint}
                        testID="settings-button"
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: theme.spacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
    },
    // Logo styles
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    logoEmoji: {
        fontSize: 28,
    },
    logoTextContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    logoTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        letterSpacing: theme.typographyConfig.letterSpacing.tight,
    },
    logoSubtitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.accent,
        letterSpacing: theme.typographyConfig.letterSpacing.tight,
    },
    // Action icons
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    iconButton: {
        minWidth: TOUCH_TARGET_SIZE,
        minHeight: TOUCH_TARGET_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtonInner: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
    },
    iconText: {
        fontSize: 20,
    },
});
