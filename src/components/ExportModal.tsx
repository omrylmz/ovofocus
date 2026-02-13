/**
 * ExportModal - Modal for data export/import options
 * Provides UI for exporting data in JSON/CSV formats and importing backups
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { PixelButton } from './PixelButton';
import { exportAndShare, isExportAvailable, gatherExportData } from '../utils/dataExport';
import {
    selectAndValidateBackup,
    restoreFromBackup,
    getImportSummary,
    ValidationResult,
} from '../utils/dataImport';
import { Language, t, TranslationKey } from '../i18n/translations';

interface ExportModalProps {
    visible: boolean;
    onClose: () => void;
    language?: Language;
    onDataRestored?: () => void;
}

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';
type ImportStatus = 'idle' | 'selecting' | 'validating' | 'confirming' | 'importing' | 'success' | 'error';

export function ExportModal({ visible, onClose, language = 'en', onDataRestored }: ExportModalProps) {
    const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
    const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
    const [canShare, setCanShare] = useState(true);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Animation values
    const backgroundOpacity = useSharedValue(0);
    const modalScale = useSharedValue(0.9);
    const modalOpacity = useSharedValue(0);

    // Helper to get translations
    const i18n = (key: TranslationKey): string => t(key, language);

    // Check if sharing is available on mount
    useEffect(() => {
        isExportAvailable().then(setCanShare);
    }, []);

    // Animate modal on visibility change
    useEffect(() => {
        if (visible) {
            backgroundOpacity.value = withTiming(1, { duration: 200 });
            modalScale.value = withSpring(1, { damping: 15 });
            modalOpacity.value = withTiming(1, { duration: 200 });
        } else {
            backgroundOpacity.value = withTiming(0, { duration: 150 });
            modalScale.value = withTiming(0.9, { duration: 150 });
            modalOpacity.value = withTiming(0, { duration: 150 });
            // Reset state when closing
            setExportStatus('idle');
            setImportStatus('idle');
            setValidationResult(null);
            setErrorMessage('');
        }
    }, [visible]);

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
        transform: [{ scale: modalScale.value }],
        opacity: modalOpacity.value,
    }));

    // Export handlers
    const handleExportJSON = async () => {
        setExportStatus('exporting');
        setErrorMessage('');
        try {
            await exportAndShare('json');
            setExportStatus('success');
            setTimeout(() => setExportStatus('idle'), 2000);
        } catch (error) {
            console.error('[ExportModal] Export JSON failed:', error);
            setErrorMessage(i18n('exportError'));
            setExportStatus('error');
        }
    };

    const handleExportCSV = async () => {
        setExportStatus('exporting');
        setErrorMessage('');
        try {
            await exportAndShare('csv');
            setExportStatus('success');
            setTimeout(() => setExportStatus('idle'), 2000);
        } catch (error) {
            console.error('[ExportModal] Export CSV failed:', error);
            setErrorMessage(i18n('exportError'));
            setExportStatus('error');
        }
    };

    // Import handlers
    const handleImportBackup = async () => {
        setImportStatus('selecting');
        setErrorMessage('');
        setValidationResult(null);

        try {
            setImportStatus('validating');
            const result = await selectAndValidateBackup();

            if (!result) {
                // User cancelled
                setImportStatus('idle');
                return;
            }

            setValidationResult(result);

            if (!result.valid) {
                setImportStatus('error');
                setErrorMessage(result.errors.join('\n'));
                return;
            }

            // Show confirmation
            setImportStatus('confirming');
        } catch (error) {
            console.error('[ExportModal] Import validation failed:', error);
            setErrorMessage(i18n('importError'));
            setImportStatus('error');
        }
    };

    const handleConfirmImport = async () => {
        if (!validationResult?.data) return;

        setImportStatus('importing');

        try {
            const importResult = await restoreFromBackup(validationResult.data);

            if (importResult.success) {
                setImportStatus('success');
                // Notify parent to reload data
                if (onDataRestored) {
                    onDataRestored();
                }
                // Show success alert and close
                Alert.alert(
                    i18n('done'),
                    i18n('importSuccess'),
                    [{ text: 'OK', onPress: onClose }]
                );
            } else {
                setErrorMessage(importResult.message);
                setImportStatus('error');
            }
        } catch (error) {
            console.error('[ExportModal] Import failed:', error);
            setErrorMessage(i18n('importError'));
            setImportStatus('error');
        }
    };

    const handleCancelImport = () => {
        setImportStatus('idle');
        setValidationResult(null);
        setErrorMessage('');
    };

    // Render import summary for confirmation
    const renderImportSummary = () => {
        if (!validationResult?.data) return null;

        const summary = getImportSummary(validationResult.data);
        const exportDate = new Date(summary.exportDate).toLocaleDateString(
            language === 'tr' ? 'tr-TR' : 'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        return (
            <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>{i18n('importConfirmTitle')}</Text>
                <Text style={styles.summaryWarning}>{i18n('importConfirmWarning')}</Text>

                <View style={styles.summaryDetails}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{i18n('backupDate')}:</Text>
                        <Text style={styles.summaryValue}>{exportDate}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{i18n('animals')}:</Text>
                        <Text style={styles.summaryValue}>{summary.animalsCount}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{i18n('totalSessions')}:</Text>
                        <Text style={styles.summaryValue}>{summary.totalSessions}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{i18n('completed')}:</Text>
                        <Text style={styles.summaryValue}>{summary.completedSessions}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{i18n('totalFocus')}:</Text>
                        <Text style={styles.summaryValue}>{summary.totalMinutes} {i18n('minutes')}</Text>
                    </View>
                </View>

                {validationResult.warnings.length > 0 && (
                    <View style={styles.warningsContainer}>
                        <Text style={styles.warningsTitle}>{i18n('warnings')}:</Text>
                        {validationResult.warnings.map((warning, index) => (
                            <Text key={index} style={styles.warningText}>- {warning}</Text>
                        ))}
                    </View>
                )}

                <View style={styles.confirmButtons}>
                    <View style={styles.confirmButtonWrapper}>
                        <PixelButton
                            title={i18n('cancel')}
                            onPress={handleCancelImport}
                            variant="ghost"
                            size="medium"
                            accessibilityLabel={i18n('cancel')}
                            accessibilityHint={language === 'tr' ? 'İçeri aktarmayı iptal eder' : 'Cancels the import operation'}
                        />
                    </View>
                    <View style={styles.confirmButtonWrapper}>
                        <PixelButton
                            title={i18n('confirmImport')}
                            onPress={handleConfirmImport}
                            variant="primary"
                            size="medium"
                            icon="*"
                            accessibilityLabel={i18n('confirmImport')}
                            accessibilityHint={language === 'tr' ? 'Yedekleme verilerini geri yükler' : 'Restores the backup data'}
                        />
                    </View>
                </View>
            </View>
        );
    };

    // Render main export/import options
    const renderMainContent = () => {
        const isExporting = exportStatus === 'exporting';
        const isImporting = importStatus === 'selecting' || importStatus === 'validating' || importStatus === 'importing';

        return (
            <View style={styles.content}>
                {/* Export Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('exportData')}</Text>
                    <Text style={styles.sectionDescription}>{i18n('exportDescription')}</Text>

                    <View style={styles.optionCard}>
                        <View style={styles.optionInfo}>
                            <Text style={styles.optionIcon}>*</Text>
                            <View style={styles.optionText}>
                                <Text style={styles.optionTitle}>JSON</Text>
                                <Text style={styles.optionDesc}>{i18n('jsonExportDesc')}</Text>
                            </View>
                        </View>
                        <PixelButton
                            title={i18n('export')}
                            onPress={handleExportJSON}
                            variant="secondary"
                            size="small"
                            disabled={isExporting || !canShare}
                            accessibilityLabel={language === 'tr' ? 'JSON olarak aktar' : 'Export as JSON'}
                            accessibilityHint={language === 'tr' ? 'Tüm verileri JSON formatında dışa aktarır' : 'Exports all data in JSON format for full backup'}
                        />
                    </View>

                    <View style={styles.optionCard}>
                        <View style={styles.optionInfo}>
                            <Text style={styles.optionIcon}>*</Text>
                            <View style={styles.optionText}>
                                <Text style={styles.optionTitle}>CSV</Text>
                                <Text style={styles.optionDesc}>{i18n('csvExportDesc')}</Text>
                            </View>
                        </View>
                        <PixelButton
                            title={i18n('export')}
                            onPress={handleExportCSV}
                            variant="secondary"
                            size="small"
                            disabled={isExporting || !canShare}
                            accessibilityLabel={language === 'tr' ? 'CSV olarak aktar' : 'Export as CSV'}
                            accessibilityHint={language === 'tr' ? 'İstatistikleri CSV formatında dışa aktarır' : 'Exports statistics in CSV format for spreadsheets'}
                        />
                    </View>
                </View>

                {/* Import Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n('restoreBackup')}</Text>
                    <Text style={styles.sectionDescription}>{i18n('restoreDescription')}</Text>

                    <PixelButton
                        title={i18n('selectBackupFile')}
                        onPress={handleImportBackup}
                        variant="ghost"
                        size="medium"
                        icon="*"
                        disabled={isImporting}
                        accessibilityLabel={i18n('selectBackupFile')}
                        accessibilityHint={language === 'tr' ? 'Geri yüklemek için bir yedek dosyası seçer' : 'Opens file picker to select a backup file for restoration'}
                    />
                </View>

                {/* Status indicators */}
                {(isExporting || isImporting) && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>
                            {isExporting ? i18n('exporting') : i18n('processing')}
                        </Text>
                    </View>
                )}

                {exportStatus === 'success' && (
                    <View style={styles.successContainer}>
                        <Text style={styles.successText}>{i18n('exportSuccess')}</Text>
                    </View>
                )}

                {errorMessage && (importStatus === 'error' || exportStatus === 'error') && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                        <Pressable onPress={() => { setErrorMessage(''); setExportStatus('idle'); setImportStatus('idle'); }}>
                            <Text style={styles.dismissText}>{i18n('dismiss')}</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.overlay, backgroundStyle]}>
                <Pressable style={styles.backdropPressable} onPress={onClose} accessibilityLabel="Close export modal" />
                <Animated.View style={[styles.modalContainer, modalStyle]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{i18n('dataBackup')}</Text>
                        <Pressable
                            onPress={onClose}
                            style={styles.closeButton}
                            accessibilityLabel={language === 'tr' ? 'Kapat' : 'Close'}
                            accessibilityHint={language === 'tr' ? 'Yedekleme modalını kapatır' : 'Closes the backup modal'}
                            accessibilityRole="button"
                        >
                            <Text style={styles.closeButtonText}>X</Text>
                        </Pressable>
                    </View>

                    <ScrollView style={{ flex: 1 }} bounces={false}>
                        {importStatus === 'confirming' ? renderImportSummary() : renderMainContent()}
                    </ScrollView>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: theme.colors.semantic.overlayHeavy,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdropPressable: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
        maxHeight: '70%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.large,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceLight,
    },
    headerTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textSecondary,
    },
    content: {
        padding: theme.spacing.md,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    sectionDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    optionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceLight,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    optionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionIcon: {
        fontSize: 24,
        marginRight: theme.spacing.md,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
    },
    optionDesc: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xxs,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    loadingText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    successContainer: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)', // Base color matches theme.colors.success (#4CAF50)
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    successText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.success,
        fontWeight: theme.fontWeight.medium,
    },
    errorContainer: {
        backgroundColor: 'rgba(255, 82, 82, 0.2)', // Base color matches theme.colors.error (#FF5252)
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    errorText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.error,
        textAlign: 'center',
    },
    dismissText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
        textDecorationLine: 'underline',
    },
    // Import summary styles
    summaryContainer: {
        padding: theme.spacing.md,
    },
    summaryTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    summaryWarning: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.warning,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    summaryDetails: {
        backgroundColor: theme.colors.surfaceLight,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
    },
    summaryLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    summaryValue: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    warningsContainer: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)', // Base color matches theme.colors.warning (#FFC107)
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    warningsTitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.warning,
        fontWeight: theme.fontWeight.medium,
        marginBottom: theme.spacing.xs,
    },
    warningText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.warning,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    confirmButtonWrapper: {
        flex: 1,
    },
});
