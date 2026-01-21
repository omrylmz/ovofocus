import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse, Circle, Rect, Defs, LinearGradient, Stop, RadialGradient, G, Path } from 'react-native-svg';
import { EggStyle, EggPattern } from '../data/eggStyles';
import { theme } from '../styles/theme';

interface StyledEggProps {
    eggStyle: EggStyle;
    size?: number;
    showPattern?: boolean;
    glowColor?: string;
    glowIntensity?: number;
}

// Pattern generators for different egg styles
function SolidPattern({ color, width, height }: { color: string; width: number; height: number }) {
    return (
        <Ellipse
            cx={width / 2}
            cy={height / 2}
            rx={width / 2 - 2}
            ry={height / 2 - 2}
            fill={color}
        />
    );
}

function SpottedPattern({
    primaryColor,
    secondaryColor,
    width,
    height,
}: {
    primaryColor: string;
    secondaryColor: string;
    width: number;
    height: number;
}) {
    const spots = [
        { cx: width * 0.3, cy: height * 0.25, r: width * 0.08 },
        { cx: width * 0.65, cy: height * 0.2, r: width * 0.06 },
        { cx: width * 0.25, cy: height * 0.5, r: width * 0.07 },
        { cx: width * 0.7, cy: height * 0.45, r: width * 0.09 },
        { cx: width * 0.45, cy: height * 0.35, r: width * 0.05 },
        { cx: width * 0.35, cy: height * 0.7, r: width * 0.08 },
        { cx: width * 0.6, cy: height * 0.75, r: width * 0.06 },
    ];

    return (
        <G>
            <Ellipse
                cx={width / 2}
                cy={height / 2}
                rx={width / 2 - 2}
                ry={height / 2 - 2}
                fill={primaryColor}
            />
            {spots.map((spot, index) => (
                <Circle
                    key={index}
                    cx={spot.cx}
                    cy={spot.cy}
                    r={spot.r}
                    fill={secondaryColor}
                    opacity={0.8}
                />
            ))}
        </G>
    );
}

function StripedPattern({
    primaryColor,
    secondaryColor,
    width,
    height,
    gradientId,
}: {
    primaryColor: string;
    secondaryColor: string;
    width: number;
    height: number;
    gradientId: string;
}) {
    const stripeWidth = width * 0.12;
    const stripes = [
        height * 0.2,
        height * 0.35,
        height * 0.5,
        height * 0.65,
        height * 0.8,
    ];

    return (
        <G>
            <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={primaryColor} />
                    <Stop offset="1" stopColor={primaryColor} stopOpacity="0.9" />
                </LinearGradient>
            </Defs>
            <Ellipse
                cx={width / 2}
                cy={height / 2}
                rx={width / 2 - 2}
                ry={height / 2 - 2}
                fill={`url(#${gradientId})`}
            />
            {stripes.map((y, index) => {
                // Calculate stripe width at this y position (ellipse shape)
                const normalizedY = (y - height / 2) / (height / 2);
                const stripeHalfWidth = (width / 2 - 4) * Math.sqrt(1 - normalizedY * normalizedY);
                return (
                    <Rect
                        key={index}
                        x={width / 2 - stripeHalfWidth}
                        y={y - stripeWidth / 4}
                        width={stripeHalfWidth * 2}
                        height={stripeWidth / 2}
                        fill={secondaryColor}
                        opacity={0.7}
                        rx={2}
                    />
                );
            })}
        </G>
    );
}

function CrackedPattern({
    primaryColor,
    secondaryColor,
    width,
    height,
}: {
    primaryColor: string;
    secondaryColor: string;
    width: number;
    height: number;
}) {
    return (
        <G>
            <Ellipse
                cx={width / 2}
                cy={height / 2}
                rx={width / 2 - 2}
                ry={height / 2 - 2}
                fill={primaryColor}
            />
            {/* Crack lines */}
            <Path
                d={`M ${width * 0.3} ${height * 0.2} L ${width * 0.4} ${height * 0.35} L ${width * 0.3} ${height * 0.4}`}
                stroke={secondaryColor}
                strokeWidth={2}
                fill="none"
                opacity={0.8}
            />
            <Path
                d={`M ${width * 0.6} ${height * 0.15} L ${width * 0.55} ${height * 0.3} L ${width * 0.65} ${height * 0.35}`}
                stroke={secondaryColor}
                strokeWidth={1.5}
                fill="none"
                opacity={0.7}
            />
            <Path
                d={`M ${width * 0.45} ${height * 0.25} L ${width * 0.5} ${height * 0.4}`}
                stroke={secondaryColor}
                strokeWidth={1}
                fill="none"
                opacity={0.6}
            />
            {/* Sparkle effect */}
            <Circle cx={width * 0.35} cy={height * 0.28} r={2} fill={secondaryColor} opacity={0.9} />
            <Circle cx={width * 0.58} cy={height * 0.22} r={1.5} fill={secondaryColor} opacity={0.8} />
        </G>
    );
}

// Star position multipliers - constant outside component to avoid recreation
const STAR_POSITIONS = [
    { cxMult: 0.2, cyMult: 0.3, r: 1.5 },
    { cxMult: 0.75, cyMult: 0.25, r: 2 },
    { cxMult: 0.35, cyMult: 0.55, r: 1 },
    { cxMult: 0.6, cyMult: 0.65, r: 1.5 },
    { cxMult: 0.45, cyMult: 0.4, r: 2 },
    { cxMult: 0.7, cyMult: 0.5, r: 1 },
    { cxMult: 0.25, cyMult: 0.7, r: 1.5 },
    { cxMult: 0.55, cyMult: 0.2, r: 1 },
    { cxMult: 0.8, cyMult: 0.75, r: 1 },
];

function GalaxyPattern({
    primaryColor,
    secondaryColor,
    width,
    height,
    gradientId,
}: {
    primaryColor: string;
    secondaryColor: string;
    width: number;
    height: number;
    gradientId: string;
}) {
    return (
        <G>
            <Defs>
                <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0" stopColor={secondaryColor} stopOpacity="0.6" />
                    <Stop offset="0.5" stopColor={primaryColor} />
                    <Stop offset="1" stopColor={primaryColor} stopOpacity="0.95" />
                </RadialGradient>
            </Defs>
            <Ellipse
                cx={width / 2}
                cy={height / 2}
                rx={width / 2 - 2}
                ry={height / 2 - 2}
                fill={`url(#${gradientId})`}
            />
            {/* Stars */}
            {STAR_POSITIONS.map((star, index) => (
                <Circle
                    key={index}
                    cx={width * star.cxMult}
                    cy={height * star.cyMult}
                    r={star.r}
                    fill="#FFFFFF"
                    opacity={0.6 + (index % 3) * 0.15}
                />
            ))}
            {/* Nebula swirl */}
            <Path
                d={`M ${width * 0.3} ${height * 0.5} Q ${width * 0.5} ${height * 0.3} ${width * 0.7} ${height * 0.45}`}
                stroke={secondaryColor}
                strokeWidth={3}
                fill="none"
                opacity={0.3}
            />
        </G>
    );
}

function HeartsPattern({
    primaryColor,
    secondaryColor,
    width,
    height,
}: {
    primaryColor: string;
    secondaryColor: string;
    width: number;
    height: number;
}) {
    // Simple heart shape path
    const heartPath = (cx: number, cy: number, size: number) => {
        const s = size;
        return `M ${cx} ${cy + s * 0.3} C ${cx - s * 0.5} ${cy - s * 0.3} ${cx - s} ${cy + s * 0.1} ${cx} ${cy + s} C ${cx + s} ${cy + s * 0.1} ${cx + s * 0.5} ${cy - s * 0.3} ${cx} ${cy + s * 0.3}`;
    };

    const hearts = [
        { cx: width * 0.3, cy: height * 0.25, size: width * 0.08 },
        { cx: width * 0.65, cy: height * 0.3, size: width * 0.06 },
        { cx: width * 0.45, cy: height * 0.5, size: width * 0.1 },
        { cx: width * 0.25, cy: height * 0.65, size: width * 0.07 },
        { cx: width * 0.7, cy: height * 0.6, size: width * 0.06 },
    ];

    return (
        <G>
            <Ellipse
                cx={width / 2}
                cy={height / 2}
                rx={width / 2 - 2}
                ry={height / 2 - 2}
                fill={primaryColor}
            />
            {hearts.map((heart, index) => (
                <Path
                    key={index}
                    d={heartPath(heart.cx, heart.cy, heart.size)}
                    fill={secondaryColor}
                    opacity={0.7 + (index % 2) * 0.15}
                />
            ))}
        </G>
    );
}

export function StyledEgg({
    eggStyle,
    size = 70,
    showPattern = true,
    glowColor,
    glowIntensity = 0,
}: StyledEggProps) {
    // Generate unique gradient ID per component instance to avoid ID collisions in SVG
    const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);

    // Egg proportions (slightly taller than wide)
    const width = size;
    const height = size * 1.2;

    const renderPattern = () => {
        if (!showPattern) {
            return (
                <Ellipse
                    cx={width / 2}
                    cy={height / 2}
                    rx={width / 2 - 2}
                    ry={height / 2 - 2}
                    fill={eggStyle.primaryColor}
                />
            );
        }

        const props = {
            primaryColor: eggStyle.primaryColor,
            secondaryColor: eggStyle.secondaryColor || '#FFFFFF',
            width,
            height,
            gradientId,
        };

        switch (eggStyle.pattern) {
            case 'solid':
                return <SolidPattern color={eggStyle.primaryColor} width={width} height={height} />;
            case 'spotted':
                return <SpottedPattern {...props} />;
            case 'striped':
                return <StripedPattern {...props} />;
            case 'cracked':
                return <CrackedPattern {...props} />;
            case 'galaxy':
                return <GalaxyPattern {...props} />;
            case 'hearts':
                return <HeartsPattern {...props} />;
            default:
                return <SolidPattern color={eggStyle.primaryColor} width={width} height={height} />;
        }
    };

    return (
        <View style={[styles.container, { width, height }]}>
            {/* Glow effect */}
            {glowIntensity > 0 && glowColor && (
                <View
                    style={[
                        styles.glow,
                        {
                            width: width * 1.4,
                            height: height * 1.4,
                            borderRadius: Math.max(width, height),
                            backgroundColor: glowColor,
                            opacity: glowIntensity * 0.5,
                        },
                    ]}
                />
            )}

            {/* SVG Egg */}
            <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                {/* Egg shape with pattern */}
                {renderPattern()}

                {/* Highlight/shine effect */}
                <Ellipse
                    cx={width * 0.35}
                    cy={height * 0.3}
                    rx={width * 0.15}
                    ry={height * 0.1}
                    fill="#FFFFFF"
                    opacity={0.3}
                />
            </Svg>

            {/* Emoji overlay (optional) */}
            {eggStyle.emoji && eggStyle.emoji !== '🥚' && (
                <View style={styles.emojiOverlay}>
                    <Text style={[styles.emoji, { fontSize: size * 0.3 }]}>{eggStyle.emoji}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    glow: {
        position: 'absolute',
    },
    emojiOverlay: {
        position: 'absolute',
        bottom: -5,
        right: -5,
    },
    emoji: {
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});
