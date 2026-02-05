import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, SafeAreaView } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../styles/theme';
import { PixelButton } from './PixelButton';
import {
    EGG_STYLES,
    EggStyle,
    isEggStyleUnlocked,
    getUnlockProgress,
    getUnlockRequirementKey,
    UnlockCheckParams,
} from '../data/eggStyles';
import { StyledEgg } from './StyledEgg';
import { TranslationKey } from '../i18n/translations';

interface EggStylePickerProps {
    visible: boolean;
    onClose: () => void;
    selectedStyleId: string;
    onSelectStyle: (styleId: string) => void;
    unlockParams: UnlockCheckParams;
    i18n: (key: TranslationKey) => string;
}

// Individual egg style card component
interface EggStyleCardProps {
    style: EggStyle;
    isSelected: boolean;
    isUnlocked: boolean;
    unlockProgress: number;
    onSelect: () => void;
    theme: Theme;
    i18n: (key: TranslationKey) => string;
}

function EggStyleCard({
    style,
    isSelected,
    isUnlocked,
    unlockProgress,
    onSelect,
    theme,
    i18n,
}: EggStyleCardProps) {
    const scale = useSharedValue(1);
    const progressWidth = useSharedValue(unlockProgress * 100);

    // Animate progress bar width changes with spring
    React.useEffect(() => {
        progressWidth.value = withSpring(unlockProgress * 100, { damping: 15, stiffness: 100 });
    }, [unlockProgress, progressWidth]);

    const handlePress = () => {
        if (isUnlocked) {
            scale.value = withSequence(
                withSpring(0.95, { damping: 10 }),
                withSpring(1, { damping: 12 })
            );
            onSelect();
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const progressBarAnimatedStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const styles = useMemo(() => createCardStyles(theme), [theme]);

    // Generate accessibility label for locked eggs
    const getAccessibilityLabel = () => {
        const styleName = i18n(style.name as TranslationKey);
        if (isUnlocked) {
            return isSelected ? `${styleName}, selected` : styleName;
        }
        const requirementText = i18n(getUnlockRequirementKey(style) as TranslationKey);
        const progressText = style.unlockValue
            ? `${Math.round(unlockProgress * style.unlockValue)} of ${style.unlockValue}`
            : '';
        return `${styleName}, locked. ${requirementText}${progressText ? `, ${progressText}` : ''}`;
    };

    const getAccessibilityHint = () => {
        if (isUnlocked) {
            return isSelected ? undefined : 'Double tap to select this egg style';
        }
        return 'Complete the requirement to unlock this egg style';
    };

    return (
        <Pressable
            onPress={handlePress}
            disabled={!isUnlocked}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={getAccessibilityLabel()}
            accessibilityHint={getAccessibilityHint()}
            accessibilityState={{
                selected: isSelected,
                disabled: !isUnlocked,
            }}
        >
            <Animated.View
                style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                    !isUnlocked && styles.cardLocked,
                    animatedStyle,
                ]}
            >
                {/* Egg Preview */}
                <View style={styles.eggPreviewContainer}>
                    <StyledEgg
                        eggStyle={style}
                        size={60}
                        showPattern={true}
                    />
                    {!isUnlocked && (
                        <View style={styles.lockOverlay}>
                            <Text style={styles.lockIcon}>🔒</Text>
                        </View>
                    )}
                </View>

                {/* Style Name */}
                <Text
                    style={[styles.styleName, !isUnlocked && styles.styleNameLocked]}
                    numberOfLines={1}
                >
                    {i18n(style.name as TranslationKey)}
                </Text>

                {/* Selection indicator or unlock progress */}
                {isSelected && isUnlocked && (
                    <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                )}

                {!isUnlocked && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    progressBarAnimatedStyle,
                                ]}
                            />
                        </View>
                        <Text style={styles.unlockText} numberOfLines={2}>
                            {i18n(getUnlockRequirementKey(style) as TranslationKey)}
                            {style.unlockValue ? ` (${Math.round(unlockProgress * style.unlockValue)}/${style.unlockValue})` : ''}
                        </Text>
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
}

export function EggStylePicker({
    visible,
    onClose,
    selectedStyleId,
    onSelectStyle,
    unlockParams,
    i18n,
}: EggStylePickerProps) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Separate unlocked and locked styles
    const { unlockedStyles, lockedStyles } = useMemo(() => {
        const unlocked: EggStyle[] = [];
        const locked: EggStyle[] = [];

        EGG_STYLES.forEach(style => {
            if (isEggStyleUnlocked(style, unlockParams)) {
                unlocked.push(style);
            } else {
                locked.push(style);
            }
        });

        return { unlockedStyles: unlocked, lockedStyles: locked };
    }, [unlockParams]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{i18n('eggCustomization')}</Text>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Unlocked Styles */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {i18n('eggStylesUnlocked')} ({unlockedStyles.length})
                        </Text>
                        <View style={styles.grid}>
                            {unlockedStyles.map(style => (
                                <EggStyleCard
                                    key={style.id}
                                    style={style}
                                    isSelected={selectedStyleId === style.id}
                                    isUnlocked={true}
                                    unlockProgress={1}
                                    onSelect={() => onSelectStyle(style.id)}
                                    theme={theme}
                                    i18n={i18n}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Locked Styles */}
                    {lockedStyles.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {i18n('eggStylesLocked')} ({lockedStyles.length})
                            </Text>
                            <View style={styles.grid}>
                                {lockedStyles.map(style => (
                                    <EggStyleCard
                                        key={style.id}
                                        style={style}
                                        isSelected={false}
                                        isUnlocked={false}
                                        unlockProgress={getUnlockProgress(style, unlockParams)}
                                        onSelect={() => {}}
                                        theme={theme}
                                        i18n={i18n}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Done Button */}
                <View style={styles.footer}>
                    <PixelButton
                        title={i18n('done')}
                        onPress={onClose}
                        variant="primary"
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const createStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.semantic.border,
        },
        title: {
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
        },
        closeButton: {
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.xl,
            backgroundColor: theme.colors.surface,
        },
        closeButtonText: {
            fontSize: 18,
            color: theme.colors.textSecondary,
        },
        scrollView: {
            flex: 1,
        },
        scrollContent: {
            padding: theme.spacing.lg,
        },
        section: {
            marginBottom: theme.spacing.xl,
        },
        sectionTitle: {
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text,
            marginBottom: theme.spacing.md,
        },
        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.md,
        },
        footer: {
            padding: theme.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: theme.colors.semantic.border,
        },
    });

const createCardStyles = (theme: Theme) =>
    StyleSheet.create({
        card: {
            width: 100,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.sm,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: 'transparent',
        },
        cardSelected: {
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.surfaceLight,
        },
        cardLocked: {
            opacity: 0.7,
        },
        eggPreviewContainer: {
            width: 70,
            height: 70,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
        },
        lockOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: theme.borderRadius.sm,
        },
        lockIcon: {
            fontSize: 24,
        },
        styleName: {
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.text,
            textAlign: 'center',
            marginTop: theme.spacing.xs,
        },
        styleNameLocked: {
            color: theme.colors.textSecondary,
        },
        selectedBadge: {
            position: 'absolute',
            top: theme.spacing.xs,
            right: theme.spacing.xs,
            width: 20,
            height: 20,
            borderRadius: theme.borderRadius.sm,
            backgroundColor: theme.colors.success,
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectedBadgeText: {
            fontSize: 12,
            color: theme.colors.text,
            fontWeight: theme.fontWeight.bold,
        },
        progressContainer: {
            width: '100%',
            marginTop: theme.spacing.xs,
        },
        progressBarBg: {
            height: 4,
            backgroundColor: theme.colors.semantic.border,
            borderRadius: theme.borderRadius.xxs,
            overflow: 'hidden',
        },
        progressBarFill: {
            height: '100%',
            backgroundColor: theme.colors.accent,
            borderRadius: theme.borderRadius.xxs,
        },
        unlockText: {
            fontSize: 9,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            marginTop: 2,
        },
    });
