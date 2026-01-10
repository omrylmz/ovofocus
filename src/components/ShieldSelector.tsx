import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { Language, t, getRarityLabelI18n } from '../i18n/translations';
import { ShieldItem } from '../utils/storage';
import { PixelButton } from './PixelButton';

interface ShieldSelectorProps {
    visible: boolean;
    shields: ShieldItem[];
    onSelect: (shield: ShieldItem) => void;
    onClose: () => void;
    language: Language;
}

const rarityColors: Record<string, string> = {
    common: theme.colors.common,
    rare: theme.colors.rare,
    epic: theme.colors.epic,
    legendary: theme.colors.legendary,
};

export function ShieldSelector({ visible, shields, onSelect, onClose, language }: ShieldSelectorProps) {
    const backgroundOpacity = useSharedValue(0);
    const contentScale = useSharedValue(0.8);

    useEffect(() => {
        if (visible) {
            backgroundOpacity.value = withTiming(1, { duration: 200 });
            contentScale.value = withSpring(1, { damping: 12 });
        } else {
            backgroundOpacity.value = 0;
            contentScale.value = 0.8;
        }
    }, [visible]);

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        transform: [{ scale: contentScale.value }],
    }));

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <View style={styles.wrapper}>
                <Animated.View style={[styles.overlay, backgroundStyle]}>
                    <Pressable style={styles.overlayPressable} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[styles.content, contentStyle]}>
                    <Text style={styles.title}>🛡️ {t('selectShield', language)}</Text>

                    {shields.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{t('noShieldsAvailable', language)}</Text>
                            <Text style={styles.emptySubtext}>
                                {language === 'tr'
                                    ? 'Seansları tamamlayarak kalkan kazan!'
                                    : 'Complete sessions to earn shields!'}
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                            {shields.map((shield) => (
                                <Pressable
                                    key={shield.animalId}
                                    style={({ pressed }) => [
                                        styles.shieldItem,
                                        pressed && styles.shieldItemPressed,
                                    ]}
                                    onPress={() => onSelect(shield)}
                                >
                                    <View style={[styles.rarityIndicator, { backgroundColor: rarityColors[shield.rarity] }]} />
                                    <View style={styles.shieldInfo}>
                                        <Text style={styles.shieldName}>{shield.animalName}</Text>
                                        <Text style={[styles.rarityLabel, { color: rarityColors[shield.rarity] }]}>
                                            {getRarityLabelI18n(shield.rarity, language)}
                                        </Text>
                                    </View>
                                    <View style={styles.durationContainer}>
                                        <Text style={styles.durationValue}>+{shield.durationSeconds}s</Text>
                                        <Text style={styles.durationLabel}>{t('shieldDuration', language)}</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    )}

                    <View style={styles.buttonContainer}>
                        <PixelButton
                            title={t('cancel', language)}
                            onPress={onClose}
                            variant="ghost"
                            size="medium"
                        />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
    },
    overlayPressable: {
        flex: 1,
    },
    content: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        width: '85%',
        maxHeight: '70%',
    },
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    scrollView: {
        maxHeight: 300,
    },
    shieldItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    shieldItemPressed: {
        opacity: 0.7,
    },
    rarityIndicator: {
        width: 8,
        height: '100%',
        borderRadius: 4,
        marginRight: theme.spacing.md,
    },
    shieldInfo: {
        flex: 1,
    },
    shieldName: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
    },
    rarityLabel: {
        fontSize: theme.fontSize.sm,
        marginTop: 2,
    },
    durationContainer: {
        alignItems: 'flex-end',
    },
    durationValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.success,
    },
    durationLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    emptyContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: theme.spacing.lg,
        alignItems: 'center',
    },
});
