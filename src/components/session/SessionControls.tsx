import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';
import { PixelButton } from '../PixelButton';

type SessionState = 'idle' | 'active' | 'completed' | 'failed';

type Language = 'en' | 'tr' | 'es';

interface SessionControlsProps {
    sessionState: SessionState;
    isPaused: boolean;
    pauseCount: number;
    maxPauses: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onGiveUp: () => void;
    onReset: () => void;
    // Power-up props (consolidated from PowerUpControls)
    emergencyPauseUsed?: boolean;
    activeShieldBonus?: number;
    shieldCount?: number;
    onEmergencyPause?: () => void;
    onOpenShieldSelector?: () => void;
    labels: {
        startFocus: string;
        pause: string;
        giveUp: string;
        paused: string;
        pausesRemaining: string;
        resume: string;
        tryAgain: string;
        // Power-up labels
        emergencyPause?: string;
        activateShield?: string;
        shieldActive?: string;
    };
    language?: Language;
}

// Minimal icon button for secondary actions
function IconButton({
    icon,
    onPress,
    disabled,
    accessibilityLabel,
    accessibilityHint,
    variant = 'default',
}: {
    icon: string;
    onPress: () => void;
    disabled?: boolean;
    accessibilityLabel: string;
    accessibilityHint?: string;
    variant?: 'default' | 'warning' | 'danger';
}) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 15 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    const variantStyles = {
        default: styles.iconButtonDefault,
        warning: styles.iconButtonWarning,
        danger: styles.iconButtonDanger,
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled }}
        >
            <Animated.View
                style={[
                    styles.iconButton,
                    variantStyles[variant],
                    disabled && styles.iconButtonDisabled,
                    animatedStyle,
                ]}
            >
                <Text style={[styles.iconButtonText, disabled && styles.iconButtonTextDisabled]}>
                    {icon}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

export function SessionControls({
    sessionState,
    isPaused,
    pauseCount,
    maxPauses,
    onStart,
    onPause,
    onResume,
    onGiveUp,
    onReset,
    // Power-up props
    emergencyPauseUsed = false,
    activeShieldBonus = 0,
    shieldCount = 0,
    onEmergencyPause,
    onOpenShieldSelector,
    labels,
    language = 'en',
}: SessionControlsProps) {
    // Accessibility hints based on language
    const a11yHints = {
        start: language === 'tr' ? 'Yeni bir odaklanma seansı başlatır' :
               language === 'es' ? 'Inicia una nueva sesión de enfoque' :
               'Starts a new focus session',
        pause: language === 'tr' ? 'Mevcut seansı duraklatır' :
               language === 'es' ? 'Pausa la sesión actual' :
               'Pauses the current session',
        resume: language === 'tr' ? 'Duraklatılmış seansa devam eder' :
                language === 'es' ? 'Reanuda la sesión pausada' :
                'Resumes the paused session',
        giveUp: language === 'tr' ? 'Mevcut seansı iptal eder' :
                language === 'es' ? 'Abandona la sesión actual' :
                'Abandons the current session',
        tryAgain: language === 'tr' ? 'Başarısızlıktan sonra yeni seans başlatır' :
                  language === 'es' ? 'Inicia una nueva sesión después del fracaso' :
                  'Starts a new session after failure',
        emergencyPause: language === 'tr' ? 'Otomatik devam eden acil duraklatma' :
                        language === 'es' ? 'Pausa de emergencia con reanudación automática' :
                        'Emergency pause with auto-resume',
        shield: language === 'tr' ? 'Tolerans kalkanı etkinleştir' :
                language === 'es' ? 'Activar escudo de tolerancia' :
                'Activate tolerance shield',
    };

    // Show power-up controls only during active non-paused sessions
    const showPowerUps = sessionState === 'active' && !isPaused && (onEmergencyPause || onOpenShieldSelector);

    return (
        <View style={styles.container} accessibilityRole="toolbar">
            {/* IDLE: Start button */}
            {sessionState === 'idle' && (
                <PixelButton
                    title={labels.startFocus}
                    onPress={onStart}
                    variant="primary"
                    size="large"
                    icon="🥚"
                    prominent
                    accessibilityHint={a11yHints.start}
                />
            )}

            {/* ACTIVE (not paused): Unified control bar */}
            {sessionState === 'active' && !isPaused && (
                <View style={styles.activeControls}>
                    {/* Primary action: Pause button (prominent) */}
                    <PixelButton
                        title={labels.pause}
                        onPress={onPause}
                        variant="secondary"
                        size="medium"
                        icon="⏸️"
                        disabled={pauseCount >= maxPauses}
                        accessibilityHint={a11yHints.pause}
                    />

                    {/* Secondary actions: Icon buttons */}
                    <View style={styles.secondaryActions}>
                        {/* Emergency Pause */}
                        {onEmergencyPause && (
                            <IconButton
                                icon="🛡️"
                                onPress={onEmergencyPause}
                                disabled={emergencyPauseUsed}
                                accessibilityLabel={labels.emergencyPause || 'Emergency Pause'}
                                accessibilityHint={a11yHints.emergencyPause}
                                variant="warning"
                            />
                        )}

                        {/* Shield */}
                        {onOpenShieldSelector && (
                            <View style={styles.shieldContainer}>
                                <IconButton
                                    icon="⚔️"
                                    onPress={onOpenShieldSelector}
                                    disabled={shieldCount === 0}
                                    accessibilityLabel={`${labels.activateShield || 'Shield'} (${shieldCount})`}
                                    accessibilityHint={a11yHints.shield}
                                />
                                {shieldCount > 0 && (
                                    <View style={styles.shieldBadge}>
                                        <Text style={styles.shieldBadgeText}>{shieldCount}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Give Up */}
                        <IconButton
                            icon="✕"
                            onPress={onGiveUp}
                            accessibilityLabel={labels.giveUp}
                            accessibilityHint={a11yHints.giveUp}
                            variant="danger"
                        />
                    </View>

                    {/* Active shield indicator */}
                    {activeShieldBonus > 0 && (
                        <View style={styles.shieldActiveIndicator}>
                            <Text style={styles.shieldActiveText}>
                                🛡️ +{activeShieldBonus}s
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* PAUSED: Resume controls */}
            {sessionState === 'active' && isPaused && (
                <View style={styles.pausedContainer}>
                    <Text
                        style={styles.pausedText}
                        accessible={true}
                        accessibilityRole="header"
                        accessibilityLiveRegion="polite"
                    >
                        {labels.paused}
                    </Text>
                    <Text
                        style={styles.pauseCountText}
                        accessible={true}
                        accessibilityLabel={`${maxPauses - pauseCount} ${labels.pausesRemaining}`}
                    >
                        {maxPauses - pauseCount} {labels.pausesRemaining}
                    </Text>
                    <View style={styles.pausedButtonsRow}>
                        <PixelButton
                            title={labels.resume}
                            onPress={onResume}
                            variant="primary"
                            size="large"
                            icon="▶️"
                            prominent
                            accessibilityHint={a11yHints.resume}
                        />
                    </View>
                    <View style={styles.giveUpSpacer} />
                    <Pressable
                        onPress={onGiveUp}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={labels.giveUp}
                        accessibilityHint={a11yHints.giveUp}
                    >
                        <Text style={styles.giveUpText}>{labels.giveUp}</Text>
                    </Pressable>
                </View>
            )}

            {/* FAILED: Try again */}
            {sessionState === 'failed' && (
                <PixelButton
                    title={labels.tryAgain}
                    onPress={onReset}
                    variant="secondary"
                    size="large"
                    icon="🔄"
                    accessibilityHint={a11yHints.tryAgain}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
    },
    // Active session: horizontal layout with primary + secondary actions
    activeControls: {
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    secondaryActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.lg,
    },
    // Icon buttons
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.surfaceLight,
    },
    iconButtonDefault: {
        borderColor: theme.colors.surfaceLight,
    },
    iconButtonWarning: {
        borderColor: theme.colors.warning,
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
    },
    iconButtonDanger: {
        borderColor: theme.colors.error,
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
    },
    iconButtonDisabled: {
        opacity: 0.4,
    },
    iconButtonText: {
        fontSize: 20,
    },
    iconButtonTextDisabled: {
        opacity: 0.6,
    },
    // Shield badge
    shieldContainer: {
        position: 'relative',
    },
    shieldBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: theme.colors.epic,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shieldBadgeText: {
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
        color: '#fff',
    },
    // Shield active indicator
    shieldActiveIndicator: {
        backgroundColor: theme.colors.success,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
    },
    shieldActiveText: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: '#fff',
    },
    // Paused state
    pausedContainer: {
        alignItems: 'center',
    },
    pausedText: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.warning,
        marginBottom: theme.spacing.xs,
    },
    pauseCountText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    pausedButtonsRow: {
        marginBottom: theme.spacing.sm,
    },
    giveUpSpacer: {
        height: theme.spacing.sm,
    },
    giveUpText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textDecorationLine: 'underline',
    },
});
