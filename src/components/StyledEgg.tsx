import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
    Ellipse,
    Circle,
    Rect,
    Defs,
    LinearGradient,
    RadialGradient,
    Stop,
    G,
    Path,
    ClipPath,
} from 'react-native-svg';
import { EggStyle } from '../data/eggStyles';

interface StyledEggProps {
    eggStyle: EggStyle;
    size?: number;
    showPattern?: boolean;
    glowColor?: string;
    glowIntensity?: number;
    /** Session progress 0-1, used for progressive crack overlay */
    crackProgress?: number;
}

// ==========================================================================
// EGG SHAPE GEOMETRY
// ==========================================================================
// A proper egg shape: wider at bottom, narrower at top, with organic curves.
// Uses cubic bezier curves to create an asymmetric ovoid.
// Control points tuned to match the natural proportions of a chicken egg.
// ==========================================================================

function eggPath(w: number, h: number): string {
    // The egg is drawn starting from the top center, going clockwise.
    // Key points: top (narrow), right middle, bottom (wide), left middle.
    const cx = w / 2;
    const topY = h * 0.03;        // Very top of egg
    const bottomY = h * 0.97;     // Very bottom of egg
    const midY = h * 0.48;        // Widest point is slightly above center
    const maxRx = w * 0.48;       // Maximum horizontal radius

    // Top curve is tighter (narrower top)
    const topRx = w * 0.26;
    // Control point offsets for organic shape
    const topCpY = h * 0.15;
    const bottomCpY = h * 0.82;

    return [
        `M ${cx} ${topY}`,
        // Top-right curve (narrow, tight)
        `C ${cx + topRx} ${topCpY}, ${cx + maxRx} ${midY * 0.65}, ${cx + maxRx} ${midY}`,
        // Bottom-right curve (wider, rounder)
        `C ${cx + maxRx} ${bottomCpY}, ${cx + w * 0.32} ${bottomY}, ${cx} ${bottomY}`,
        // Bottom-left curve (mirror of bottom-right)
        `C ${cx - w * 0.32} ${bottomY}, ${cx - maxRx} ${bottomCpY}, ${cx - maxRx} ${midY}`,
        // Top-left curve (mirror of top-right)
        `C ${cx - maxRx} ${midY * 0.65}, ${cx - topRx} ${topCpY}, ${cx} ${topY}`,
        'Z',
    ].join(' ');
}

// Calculate if a point is approximately inside the egg shape
// Used for placing pattern elements within the egg boundary
function isInsideEgg(px: number, py: number, w: number, h: number, margin: number = 0.08): boolean {
    const cx = w / 2;
    const cy = h * 0.48; // Widest point
    const nx = (px - cx) / (w * (0.48 - margin));
    // Egg is narrower at top, wider at bottom
    const topFactor = py < cy ? 0.7 : 1.0; // tighter at top
    const ny = (py - cy) / (h * (0.47 - margin));
    return (nx * nx) / (topFactor * topFactor) + ny * ny <= 1;
}

// ==========================================================================
// GRADIENT & LIGHTING HELPERS
// ==========================================================================
// Color manipulation utilities for creating depth and lighting effects.
// These produce lighter/darker variants of the egg's primary color.
// ==========================================================================

function lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// Add warm tint to a color (simulates subsurface scattering in organic materials)
function warmColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(60 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(20 * amount));
    const b = Math.max(0, (num & 0xff) - Math.round(15 * amount));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// Mix two colors together by a ratio (0 = colorA, 1 = colorB)
function mixColors(hexA: string, hexB: string, ratio: number): string {
    const a = parseInt(hexA.replace('#', ''), 16);
    const b = parseInt(hexB.replace('#', ''), 16);
    const r = Math.round(((a >> 16) & 0xff) * (1 - ratio) + ((b >> 16) & 0xff) * ratio);
    const g = Math.round(((a >> 8) & 0xff) * (1 - ratio) + ((b >> 8) & 0xff) * ratio);
    const bl = Math.round((a & 0xff) * (1 - ratio) + (b & 0xff) * ratio);
    return `#${(r << 16 | g << 8 | bl).toString(16).padStart(6, '0')}`;
}

// ==========================================================================
// PATTERN RENDERERS
// ==========================================================================
// Each pattern renders decorative elements clipped to the egg shape.
// Patterns are layered ABOVE the base gradient fill but BELOW the
// specular highlight and rim lighting.
// ==========================================================================

// Pre-computed dappled light positions — simulate caustic-like light filtering
// through foliage onto the egg. Larger, softer, more organic than texture dots.
const DAPPLED_LIGHT = [
    { cxM: 0.32, cyM: 0.25, rxM: 0.08, ryM: 0.06, opacity: 0.07 },
    { cxM: 0.58, cyM: 0.20, rxM: 0.06, ryM: 0.08, opacity: 0.05 },
    { cxM: 0.44, cyM: 0.38, rxM: 0.09, ryM: 0.05, opacity: 0.06 },
    { cxM: 0.68, cyM: 0.44, rxM: 0.05, ryM: 0.07, opacity: 0.04 },
    { cxM: 0.26, cyM: 0.55, rxM: 0.07, ryM: 0.06, opacity: 0.05 },
    { cxM: 0.52, cyM: 0.62, rxM: 0.08, ryM: 0.04, opacity: 0.06 },
    { cxM: 0.40, cyM: 0.75, rxM: 0.06, ryM: 0.05, opacity: 0.04 },
];

// Pre-computed eggshell texture positions (seeded random scatter)
const EGGSHELL_TEXTURE = [
    { cxM: 0.22, cyM: 0.18, r: 1.2 }, { cxM: 0.41, cyM: 0.14, r: 0.9 },
    { cxM: 0.63, cyM: 0.20, r: 1.0 }, { cxM: 0.30, cyM: 0.32, r: 1.4 },
    { cxM: 0.55, cyM: 0.28, r: 0.8 }, { cxM: 0.72, cyM: 0.35, r: 1.1 },
    { cxM: 0.18, cyM: 0.45, r: 0.7 }, { cxM: 0.48, cyM: 0.42, r: 1.3 },
    { cxM: 0.68, cyM: 0.52, r: 0.9 }, { cxM: 0.25, cyM: 0.58, r: 1.0 },
    { cxM: 0.52, cyM: 0.55, r: 1.1 }, { cxM: 0.38, cyM: 0.68, r: 0.8 },
    { cxM: 0.62, cyM: 0.65, r: 1.2 }, { cxM: 0.45, cyM: 0.78, r: 0.9 },
    { cxM: 0.32, cyM: 0.82, r: 1.0 }, { cxM: 0.58, cyM: 0.85, r: 0.7 },
    { cxM: 0.75, cyM: 0.42, r: 0.6 }, { cxM: 0.20, cyM: 0.72, r: 0.8 },
];

function SolidPatternOverlay({ width, height }: { width: number; height: number }) {
    // Subtle eggshell porosity — tiny semi-transparent speckles give natural texture
    return (
        <G>
            {EGGSHELL_TEXTURE.map((dot, i) => {
                const sx = width * dot.cxM;
                const sy = height * dot.cyM;
                if (!isInsideEgg(sx, sy, width, height, 0.1)) return null;
                return (
                    <Circle
                        key={i}
                        cx={sx}
                        cy={sy}
                        r={dot.r}
                        fill="#FFFFFF"
                        opacity={0.04 + (i % 3) * 0.02}
                    />
                );
            })}
        </G>
    );
}

function DappledLightOverlay({ width, height }: { width: number; height: number }) {
    // Soft overlapping ellipses that simulate caustic light patterns on curved surface
    return (
        <G>
            {DAPPLED_LIGHT.map((spot, i) => {
                const cx = width * spot.cxM;
                const cy = height * spot.cyM;
                if (!isInsideEgg(cx, cy, width, height, 0.12)) return null;
                return (
                    <Ellipse
                        key={i}
                        cx={cx}
                        cy={cy}
                        rx={width * spot.rxM}
                        ry={height * spot.ryM}
                        fill="#FFFFFF"
                        opacity={spot.opacity}
                    />
                );
            })}
        </G>
    );
}

function SpottedPatternOverlay({
    secondaryColor,
    width,
    height,
}: {
    secondaryColor: string;
    width: number;
    height: number;
}) {
    // Organic, varied spots with soft edges via radial gradients
    const spots = useMemo(() => [
        { cx: width * 0.30, cy: height * 0.22, r: width * 0.075, opacity: 0.6 },
        { cx: width * 0.67, cy: height * 0.18, r: width * 0.055, opacity: 0.5 },
        { cx: width * 0.22, cy: height * 0.46, r: width * 0.065, opacity: 0.55 },
        { cx: width * 0.72, cy: height * 0.42, r: width * 0.085, opacity: 0.65 },
        { cx: width * 0.47, cy: height * 0.32, r: width * 0.045, opacity: 0.45 },
        { cx: width * 0.33, cy: height * 0.66, r: width * 0.07, opacity: 0.55 },
        { cx: width * 0.62, cy: height * 0.72, r: width * 0.06, opacity: 0.5 },
        { cx: width * 0.50, cy: height * 0.55, r: width * 0.05, opacity: 0.4 },
        { cx: width * 0.38, cy: height * 0.82, r: width * 0.04, opacity: 0.35 },
    ].filter(s => isInsideEgg(s.cx, s.cy, width, height)), [width, height]);

    const lightSpot = lightenColor(secondaryColor, 0.15);

    return (
        <G>
            {spots.map((spot, i) => (
                <G key={i}>
                    {/* Soft outer halo */}
                    <Circle
                        cx={spot.cx}
                        cy={spot.cy}
                        r={spot.r * 1.3}
                        fill={secondaryColor}
                        opacity={spot.opacity * 0.3}
                    />
                    {/* Main spot body */}
                    <Circle
                        cx={spot.cx}
                        cy={spot.cy}
                        r={spot.r}
                        fill={secondaryColor}
                        opacity={spot.opacity}
                    />
                    {/* Inner bright center */}
                    <Circle
                        cx={spot.cx - spot.r * 0.15}
                        cy={spot.cy - spot.r * 0.2}
                        r={spot.r * 0.4}
                        fill={lightSpot}
                        opacity={spot.opacity * 0.6}
                    />
                </G>
            ))}
        </G>
    );
}

function StripedPatternOverlay({
    secondaryColor,
    width,
    height,
    gradientId,
}: {
    secondaryColor: string;
    width: number;
    height: number;
    gradientId: string;
}) {
    const stripeId = `${gradientId}-stripe`;
    const stripePositions = [0.18, 0.32, 0.46, 0.60, 0.76];
    const lightStripe = lightenColor(secondaryColor, 0.1);

    return (
        <G>
            <Defs>
                <LinearGradient id={stripeId} x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={secondaryColor} stopOpacity="0" />
                    <Stop offset="0.15" stopColor={secondaryColor} stopOpacity="0.6" />
                    <Stop offset="0.5" stopColor={lightStripe} stopOpacity="0.7" />
                    <Stop offset="0.85" stopColor={secondaryColor} stopOpacity="0.6" />
                    <Stop offset="1" stopColor={secondaryColor} stopOpacity="0" />
                </LinearGradient>
            </Defs>
            {stripePositions.map((yRatio, i) => {
                const y = height * yRatio;
                // Calculate stripe width at this y position using egg geometry
                const cy = height * 0.48;
                const ry = height * 0.47;
                const rx = width * 0.48;
                const normalizedY = (y - cy) / ry;
                if (Math.abs(normalizedY) >= 1) return null;
                // Adjust for egg asymmetry (narrower at top)
                const topFactor = y < cy ? 0.78 : 1.0;
                const halfWidth = rx * Math.sqrt(1 - normalizedY * normalizedY) * topFactor;
                const stripeH = width * 0.045 * (0.8 + i * 0.05);

                return (
                    <Rect
                        key={i}
                        x={width / 2 - halfWidth}
                        y={y - stripeH / 2}
                        width={halfWidth * 2}
                        height={stripeH}
                        fill={`url(#${stripeId})`}
                        rx={stripeH / 2}
                    />
                );
            })}
        </G>
    );
}

function CrackedPatternOverlay({
    secondaryColor,
    width,
    height,
}: {
    secondaryColor: string;
    width: number;
    height: number;
}) {
    const crackColor = lightenColor(secondaryColor, 0.2);
    const glintColor = lightenColor(secondaryColor, 0.5);

    return (
        <G>
            {/* Main crack network — jagged, branching paths */}
            <Path
                d={`M ${width * 0.42} ${height * 0.12}
                    L ${width * 0.38} ${height * 0.18}
                    L ${width * 0.44} ${height * 0.24}
                    L ${width * 0.36} ${height * 0.30}
                    L ${width * 0.42} ${height * 0.36}
                    L ${width * 0.38} ${height * 0.42}`}
                stroke={crackColor}
                strokeWidth={1.8}
                fill="none"
                opacity={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Branch crack 1 */}
            <Path
                d={`M ${width * 0.44} ${height * 0.24}
                    L ${width * 0.52} ${height * 0.28}
                    L ${width * 0.56} ${height * 0.34}`}
                stroke={crackColor}
                strokeWidth={1.2}
                fill="none"
                opacity={0.65}
                strokeLinecap="round"
            />
            {/* Branch crack 2 */}
            <Path
                d={`M ${width * 0.36} ${height * 0.30}
                    L ${width * 0.28} ${height * 0.34}
                    L ${width * 0.26} ${height * 0.40}`}
                stroke={crackColor}
                strokeWidth={1}
                fill="none"
                opacity={0.5}
                strokeLinecap="round"
            />
            {/* Secondary crack cluster */}
            <Path
                d={`M ${width * 0.62} ${height * 0.15}
                    L ${width * 0.58} ${height * 0.22}
                    L ${width * 0.64} ${height * 0.27}`}
                stroke={crackColor}
                strokeWidth={1.4}
                fill="none"
                opacity={0.7}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Light glints along cracks — suggests light shining through */}
            <Circle cx={width * 0.38} cy={height * 0.18} r={2.5} fill={glintColor} opacity={0.8} />
            <Circle cx={width * 0.44} cy={height * 0.24} r={2} fill={glintColor} opacity={0.7} />
            <Circle cx={width * 0.58} cy={height * 0.22} r={1.8} fill={glintColor} opacity={0.6} />
            <Circle cx={width * 0.52} cy={height * 0.28} r={1.5} fill={glintColor} opacity={0.5} />
        </G>
    );
}

// Pre-computed star positions for galaxy pattern
const STAR_POSITIONS = [
    { cxMult: 0.22, cyMult: 0.28, r: 1.4, brightness: 0.9 },
    { cxMult: 0.73, cyMult: 0.23, r: 1.8, brightness: 1.0 },
    { cxMult: 0.35, cyMult: 0.52, r: 1.0, brightness: 0.7 },
    { cxMult: 0.62, cyMult: 0.62, r: 1.3, brightness: 0.8 },
    { cxMult: 0.45, cyMult: 0.38, r: 1.6, brightness: 0.95 },
    { cxMult: 0.68, cyMult: 0.48, r: 0.9, brightness: 0.6 },
    { cxMult: 0.28, cyMult: 0.68, r: 1.2, brightness: 0.75 },
    { cxMult: 0.55, cyMult: 0.18, r: 0.8, brightness: 0.65 },
    { cxMult: 0.78, cyMult: 0.72, r: 1.0, brightness: 0.55 },
    { cxMult: 0.40, cyMult: 0.78, r: 0.7, brightness: 0.5 },
    { cxMult: 0.58, cyMult: 0.45, r: 0.6, brightness: 0.45 },
];

function GalaxyPatternOverlay({
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
    const nebulaId = `${gradientId}-nebula`;
    const cosmicId = `${gradientId}-cosmic`;
    const tertiaryId = `${gradientId}-tertiary`;
    const deepColor = darkenColor(primaryColor, 0.15);
    const brightNebula = lightenColor(secondaryColor, 0.2);
    const warmAccent = warmColor(secondaryColor, 0.3);

    return (
        <G>
            <Defs>
                {/* Nebula cloud gradient */}
                <RadialGradient id={nebulaId} cx="35%" cy="45%" rx="40%" ry="35%">
                    <Stop offset="0" stopColor={secondaryColor} stopOpacity="0.35" />
                    <Stop offset="0.6" stopColor={mixColors(secondaryColor, primaryColor, 0.5)} stopOpacity="0.15" />
                    <Stop offset="1" stopColor={primaryColor} stopOpacity="0" />
                </RadialGradient>
                {/* Secondary cosmic dust */}
                <RadialGradient id={cosmicId} cx="65%" cy="60%" rx="30%" ry="25%">
                    <Stop offset="0" stopColor={brightNebula} stopOpacity="0.25" />
                    <Stop offset="0.7" stopColor={secondaryColor} stopOpacity="0.08" />
                    <Stop offset="1" stopColor={primaryColor} stopOpacity="0" />
                </RadialGradient>
                {/* Tertiary warm nebula — adds color depth */}
                <RadialGradient id={tertiaryId} cx="45%" cy="70%" rx="25%" ry="20%">
                    <Stop offset="0" stopColor={warmAccent} stopOpacity="0.2" />
                    <Stop offset="0.6" stopColor={mixColors(warmAccent, primaryColor, 0.6)} stopOpacity="0.08" />
                    <Stop offset="1" stopColor={primaryColor} stopOpacity="0" />
                </RadialGradient>
            </Defs>

            {/* Deep space base overlay */}
            <Ellipse
                cx={width / 2}
                cy={height * 0.48}
                rx={width * 0.46}
                ry={height * 0.45}
                fill={deepColor}
                opacity={0.3}
            />

            {/* Primary nebula cloud */}
            <Ellipse
                cx={width * 0.38}
                cy={height * 0.42}
                rx={width * 0.35}
                ry={height * 0.28}
                fill={`url(#${nebulaId})`}
            />

            {/* Secondary cosmic dust */}
            <Ellipse
                cx={width * 0.62}
                cy={height * 0.58}
                rx={width * 0.25}
                ry={height * 0.2}
                fill={`url(#${cosmicId})`}
            />

            {/* Tertiary warm nebula — depth layer */}
            <Ellipse
                cx={width * 0.45}
                cy={height * 0.68}
                rx={width * 0.22}
                ry={height * 0.16}
                fill={`url(#${tertiaryId})`}
            />

            {/* Spiral arm — curved trail of star dust creating galactic structure */}
            <Path
                d={`M ${width * 0.30} ${height * 0.65}
                    Q ${width * 0.35} ${height * 0.50}, ${width * 0.45} ${height * 0.42}
                    Q ${width * 0.55} ${height * 0.34}, ${width * 0.65} ${height * 0.30}
                    Q ${width * 0.72} ${height * 0.28}, ${width * 0.74} ${height * 0.32}`}
                stroke={brightNebula}
                strokeWidth={3.5}
                fill="none"
                opacity={0.12}
                strokeLinecap="round"
            />
            {/* Inner bright core of the spiral arm */}
            <Path
                d={`M ${width * 0.32} ${height * 0.63}
                    Q ${width * 0.37} ${height * 0.50}, ${width * 0.46} ${height * 0.43}
                    Q ${width * 0.55} ${height * 0.36}, ${width * 0.64} ${height * 0.32}`}
                stroke="#FFFFFF"
                strokeWidth={1}
                fill="none"
                opacity={0.08}
                strokeLinecap="round"
            />

            {/* Nebula swirl — ethereal curved path */}
            <Path
                d={`M ${width * 0.25} ${height * 0.55}
                    Q ${width * 0.40} ${height * 0.35}, ${width * 0.55} ${height * 0.40}
                    Q ${width * 0.70} ${height * 0.45}, ${width * 0.72} ${height * 0.55}`}
                stroke={secondaryColor}
                strokeWidth={2.5}
                fill="none"
                opacity={0.2}
                strokeLinecap="round"
            />

            {/* Stars with 4-pointed cross flares, glow halos, and color tint */}
            {STAR_POSITIONS.map((star, i) => {
                const sx = width * star.cxMult;
                const sy = height * star.cyMult;
                if (!isInsideEgg(sx, sy, width, height, 0.12)) return null;
                const arm = star.r * 3.5; // Cross-flare arm length
                // Alternate between white and tinted stars
                const starColor = i % 3 === 0 ? lightenColor(secondaryColor, 0.4) : '#FFFFFF';
                return (
                    <G key={i}>
                        {/* Soft glow halo */}
                        <Circle
                            cx={sx}
                            cy={sy}
                            r={star.r * 3}
                            fill={starColor}
                            opacity={star.brightness * 0.12}
                        />
                        {/* 4-pointed cross flare (horizontal + vertical lines) */}
                        {star.brightness > 0.7 && (
                            <>
                                <Rect
                                    x={sx - arm / 2}
                                    y={sy - 0.3}
                                    width={arm}
                                    height={0.6}
                                    fill={starColor}
                                    opacity={star.brightness * 0.5}
                                    rx={0.3}
                                />
                                <Rect
                                    x={sx - 0.3}
                                    y={sy - arm / 2}
                                    width={0.6}
                                    height={arm}
                                    fill={starColor}
                                    opacity={star.brightness * 0.5}
                                    rx={0.3}
                                />
                            </>
                        )}
                        {/* Star core — bright center */}
                        <Circle
                            cx={sx}
                            cy={sy}
                            r={star.r}
                            fill="#FFFFFF"
                            opacity={star.brightness}
                        />
                    </G>
                );
            })}
        </G>
    );
}

function HeartsPatternOverlay({
    secondaryColor,
    width,
    height,
}: {
    secondaryColor: string;
    width: number;
    height: number;
}) {
    // Heart path with nicer proportions
    const heartPath = (cx: number, cy: number, size: number) => {
        const s = size;
        return `M ${cx} ${cy + s * 0.25}
                C ${cx - s * 0.55} ${cy - s * 0.35}, ${cx - s * 0.95} ${cy + s * 0.15}, ${cx} ${cy + s * 0.95}
                C ${cx + s * 0.95} ${cy + s * 0.15}, ${cx + s * 0.55} ${cy - s * 0.35}, ${cx} ${cy + s * 0.25} Z`;
    };

    const lightHeart = lightenColor(secondaryColor, 0.2);

    const hearts = useMemo(() => [
        { cx: width * 0.30, cy: height * 0.22, size: width * 0.07, opacity: 0.55, rotation: -10 },
        { cx: width * 0.66, cy: height * 0.28, size: width * 0.055, opacity: 0.5, rotation: 12 },
        { cx: width * 0.46, cy: height * 0.48, size: width * 0.09, opacity: 0.6, rotation: -5 },
        { cx: width * 0.26, cy: height * 0.62, size: width * 0.06, opacity: 0.45, rotation: 8 },
        { cx: width * 0.68, cy: height * 0.58, size: width * 0.055, opacity: 0.5, rotation: -15 },
        { cx: width * 0.42, cy: height * 0.74, size: width * 0.045, opacity: 0.35, rotation: 5 },
    ].filter(h => isInsideEgg(h.cx, h.cy, width, height)), [width, height]);

    return (
        <G>
            {hearts.map((h, i) => (
                <G key={i} rotation={h.rotation} origin={`${h.cx}, ${h.cy}`}>
                    {/* Soft heart shadow */}
                    <Path
                        d={heartPath(h.cx, h.cy + h.size * 0.1, h.size * 1.15)}
                        fill={darkenColor(secondaryColor, 0.15)}
                        opacity={h.opacity * 0.3}
                    />
                    {/* Main heart */}
                    <Path
                        d={heartPath(h.cx, h.cy, h.size)}
                        fill={secondaryColor}
                        opacity={h.opacity}
                    />
                    {/* Heart highlight */}
                    <Path
                        d={heartPath(h.cx - h.size * 0.1, h.cy - h.size * 0.05, h.size * 0.45)}
                        fill={lightHeart}
                        opacity={h.opacity * 0.5}
                    />
                </G>
            ))}
        </G>
    );
}

// ==========================================================================
// PROGRESSIVE CRACK OVERLAY
// ==========================================================================
// Shows cracks that deepen as the session progresses toward completion.
// Stage 1 (50%): Hairline cracks appear at the top
// Stage 2 (75%): Deeper cracks spread with faint glow
// Stage 3 (90%+): Wide cracks with bright light leaking through
// ==========================================================================

function CrackProgressOverlay({
    width,
    height,
    progress,
    eggColor,
}: {
    width: number;
    height: number;
    progress: number;
    eggColor: string;
}) {
    if (progress < 0.5) return null;

    const warmGlow = warmColor(eggColor, 0.6);
    const brightGlow = lightenColor(eggColor, 0.5);

    // Stage 1: 50-74% — hairline cracks at top
    const stage1Opacity = Math.min(1, (progress - 0.5) * 4); // 0→1 over 50-75%
    // Stage 2: 75-89% — deeper, wider cracks
    const stage2Opacity = progress >= 0.75 ? Math.min(1, (progress - 0.75) * 6.67) : 0;
    // Stage 3: 90%+ — glowing light leaks
    const stage3Opacity = progress >= 0.9 ? Math.min(1, (progress - 0.9) * 10) : 0;

    const sw1 = Math.max(0.8, width * 0.008); // Hairline
    const sw2 = Math.max(1.2, width * 0.014); // Medium
    const sw3 = Math.max(1.8, width * 0.02);  // Wide + glow

    return (
        <G>
            {/* Stage 1: Hairline cracks at the crown */}
            <G opacity={stage1Opacity * 0.7}>
                <Path
                    d={`M ${width * 0.48} ${height * 0.08}
                        L ${width * 0.44} ${height * 0.14}
                        L ${width * 0.50} ${height * 0.20}
                        L ${width * 0.45} ${height * 0.26}`}
                    stroke="#FFFFFF"
                    strokeWidth={sw1}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.5}
                />
                <Path
                    d={`M ${width * 0.50} ${height * 0.20}
                        L ${width * 0.57} ${height * 0.24}`}
                    stroke="#FFFFFF"
                    strokeWidth={sw1 * 0.7}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.35}
                />
            </G>

            {/* Stage 2: Deeper cracks spreading downward */}
            {stage2Opacity > 0 && (
                <G opacity={stage2Opacity}>
                    {/* Main fracture continues down */}
                    <Path
                        d={`M ${width * 0.45} ${height * 0.26}
                            L ${width * 0.40} ${height * 0.33}
                            L ${width * 0.47} ${height * 0.40}
                            L ${width * 0.42} ${height * 0.46}`}
                        stroke={warmGlow}
                        strokeWidth={sw2}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.6}
                    />
                    {/* Right-side branch */}
                    <Path
                        d={`M ${width * 0.57} ${height * 0.24}
                            L ${width * 0.63} ${height * 0.30}
                            L ${width * 0.59} ${height * 0.37}`}
                        stroke={warmGlow}
                        strokeWidth={sw2 * 0.8}
                        fill="none"
                        strokeLinecap="round"
                        opacity={0.5}
                    />
                    {/* Faint glow along crack lines */}
                    <Path
                        d={`M ${width * 0.45} ${height * 0.26}
                            L ${width * 0.40} ${height * 0.33}
                            L ${width * 0.47} ${height * 0.40}`}
                        stroke={brightGlow}
                        strokeWidth={sw2 * 3}
                        fill="none"
                        strokeLinecap="round"
                        opacity={0.12}
                    />
                </G>
            )}

            {/* Stage 3: Wide cracks with bright light leaking through */}
            {stage3Opacity > 0 && (
                <G opacity={stage3Opacity}>
                    {/* Wide bright glow behind cracks */}
                    <Path
                        d={`M ${width * 0.48} ${height * 0.08}
                            L ${width * 0.44} ${height * 0.14}
                            L ${width * 0.50} ${height * 0.20}
                            L ${width * 0.45} ${height * 0.26}
                            L ${width * 0.40} ${height * 0.33}
                            L ${width * 0.47} ${height * 0.40}
                            L ${width * 0.42} ${height * 0.46}`}
                        stroke="#FFFFFF"
                        strokeWidth={sw3 * 4}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.15}
                    />
                    {/* Bright core crack line */}
                    <Path
                        d={`M ${width * 0.48} ${height * 0.08}
                            L ${width * 0.44} ${height * 0.14}
                            L ${width * 0.50} ${height * 0.20}
                            L ${width * 0.45} ${height * 0.26}
                            L ${width * 0.40} ${height * 0.33}
                            L ${width * 0.47} ${height * 0.40}
                            L ${width * 0.42} ${height * 0.46}`}
                        stroke="#FFFFFF"
                        strokeWidth={sw3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.8}
                    />
                    {/* Light leak spots at junctions */}
                    <Circle cx={width * 0.50} cy={height * 0.20} r={width * 0.025} fill="#FFFFFF" opacity={0.7} />
                    <Circle cx={width * 0.45} cy={height * 0.26} r={width * 0.02} fill="#FFFFFF" opacity={0.6} />
                    <Circle cx={width * 0.40} cy={height * 0.33} r={width * 0.022} fill={brightGlow} opacity={0.65} />
                    <Circle cx={width * 0.47} cy={height * 0.40} r={width * 0.018} fill="#FFFFFF" opacity={0.55} />
                </G>
            )}
        </G>
    );
}

// ==========================================================================
// MAIN STYLED EGG COMPONENT
// ==========================================================================
// Renders a rich, multi-layered egg with:
//   1. Outer glow (optional, for active sessions)
//   2. Drop shadow ellipse (grounding)
//   3. Base egg shape with multi-stop gradient
//   4. Pattern overlay (clipped to egg shape)
//   5. Subsurface scattering (warm translucent glow)
//   6. Depth overlay (dark edges for volume)
//   7. Specular highlight (upper-left, bright)
//   8. Fresnel rim edge highlight (silhouette glow)
//   9. Progressive crack overlay (session progress)
//  10. Sharp glints + emoji badge
// ==========================================================================

export function StyledEgg({
    eggStyle,
    size = 70,
    showPattern = true,
    glowColor,
    glowIntensity = 0,
    crackProgress = 0,
}: StyledEggProps) {
    // Unique IDs for SVG gradients/clips to prevent collisions
    const uid = useMemo(() => Math.random().toString(36).substr(2, 9), []);
    const clipId = `egg-clip-${uid}`;
    const baseGradId = `egg-base-${uid}`;
    const depthGradId = `egg-depth-${uid}`;
    const specularGradId = `egg-spec-${uid}`;
    const rimGradId = `egg-rim-${uid}`;
    const sssGradId = `egg-sss-${uid}`;        // Subsurface scatter
    const fresnelGradId = `egg-fresnel-${uid}`; // Fresnel rim
    const galaxyGradId = `egg-galaxy-${uid}`;
    const patternGradId = `egg-pat-${uid}`;

    // Egg proportions
    const width = size;
    const height = size * 1.2;

    // Derive colors from the egg style
    const primary = eggStyle.primaryColor;
    const secondary = eggStyle.secondaryColor || '#FFFFFF';
    const isGalaxy = eggStyle.pattern === 'galaxy';

    const lightPrimary = lightenColor(primary, 0.25);
    const lighterPrimary = lightenColor(primary, 0.45);
    const darkPrimary = darkenColor(primary, 0.2);
    const darkerPrimary = darkenColor(primary, 0.35);
    const warmPrimary = warmColor(primary, 0.4); // For subsurface scatter

    // The egg path string
    const pathD = useMemo(() => eggPath(width, height), [width, height]);

    // Render the pattern overlay based on egg style
    const renderPatternOverlay = () => {
        if (!showPattern) return null;

        const props = {
            primaryColor: primary,
            secondaryColor: secondary,
            width,
            height,
            gradientId: patternGradId,
        };

        switch (eggStyle.pattern) {
            case 'solid':
                return <SolidPatternOverlay width={width} height={height} />;
            case 'spotted':
                return <SpottedPatternOverlay {...props} />;
            case 'striped':
                return <StripedPatternOverlay {...props} />;
            case 'cracked':
                return <CrackedPatternOverlay {...props} />;
            case 'galaxy':
                return (
                    <GalaxyPatternOverlay
                        {...props}
                        gradientId={galaxyGradId}
                    />
                );
            case 'hearts':
                return <HeartsPatternOverlay {...props} />;
            default:
                return null;
        }
    };

    // Reflection gradient — flipped, squeezed, faded version of the egg
    const reflectionGradId = `egg-reflect-${uid}`;
    const reflectionHeight = height * 0.25;

    return (
        <View style={[styles.container, { width, height: height + size * 0.08 + reflectionHeight * 0.5 }]}>
            {/* Outer glow effect (for active sessions) */}
            {glowIntensity > 0 && glowColor && (
                <View
                    style={[
                        styles.glow,
                        {
                            width: width * 1.5,
                            height: height * 1.4,
                            borderRadius: Math.max(width, height),
                            backgroundColor: glowColor,
                            opacity: glowIntensity * 0.4,
                        },
                    ]}
                />
            )}

            {/* Ground reflection — flipped, faded mirror image */}
            <View
                style={[
                    styles.reflection,
                    {
                        width: width * 0.7,
                        height: reflectionHeight,
                        bottom: 0,
                    },
                ]}
            >
                <Svg
                    width={width * 0.7}
                    height={reflectionHeight}
                    viewBox={`0 0 ${width} ${height * 0.4}`}
                    style={{ transform: [{ scaleY: -1 }] }}
                >
                    <Defs>
                        <LinearGradient id={reflectionGradId} x1="0.5" y1="0" x2="0.5" y2="1">
                            <Stop offset="0" stopColor={primary} stopOpacity="0.12" />
                            <Stop offset="0.5" stopColor={primary} stopOpacity="0.05" />
                            <Stop offset="1" stopColor={primary} stopOpacity="0" />
                        </LinearGradient>
                    </Defs>
                    <Ellipse
                        cx={width / 2}
                        cy={height * 0.15}
                        rx={width * 0.35}
                        ry={height * 0.18}
                        fill={`url(#${reflectionGradId})`}
                    />
                </Svg>
            </View>

            {/* Drop shadow — grounds the egg in space */}
            <View
                style={[
                    styles.shadow,
                    {
                        width: width * 0.6,
                        height: size * 0.06,
                        bottom: reflectionHeight * 0.5,
                        borderRadius: width,
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    },
                ]}
            />

            <Svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={styles.svg}
            >
                <Defs>
                    {/* Egg shape clip path */}
                    <ClipPath id={clipId}>
                        <Path d={pathD} />
                    </ClipPath>

                    {/* Base body gradient — top-left light to bottom-right dark */}
                    <LinearGradient id={baseGradId} x1="0.2" y1="0" x2="0.8" y2="1">
                        <Stop offset="0" stopColor={isGalaxy ? mixColors(primary, secondary, 0.15) : lightPrimary} />
                        <Stop offset="0.4" stopColor={primary} />
                        <Stop offset="0.75" stopColor={isGalaxy ? primary : darkPrimary} />
                        <Stop offset="1" stopColor={isGalaxy ? darkenColor(primary, 0.25) : darkerPrimary} />
                    </LinearGradient>

                    {/* Depth/ambient occlusion — darker at edges */}
                    <RadialGradient id={depthGradId} cx="45%" cy="42%" rx="50%" ry="50%">
                        <Stop offset="0" stopColor={primary} stopOpacity="0" />
                        <Stop offset="0.65" stopColor={primary} stopOpacity="0" />
                        <Stop offset="0.9" stopColor={darkerPrimary} stopOpacity="0.25" />
                        <Stop offset="1" stopColor={darkerPrimary} stopOpacity="0.45" />
                    </RadialGradient>

                    {/* Primary specular highlight — upper-left */}
                    <RadialGradient id={specularGradId} cx="35%" cy="25%" rx="30%" ry="28%">
                        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={isGalaxy ? '0.25' : '0.55'} />
                        <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={isGalaxy ? '0.08' : '0.18'} />
                        <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                    </RadialGradient>

                    {/* Rim/backlight — subtle light at bottom edge */}
                    <RadialGradient id={rimGradId} cx="55%" cy="85%" rx="35%" ry="20%">
                        <Stop offset="0" stopColor={lighterPrimary} stopOpacity="0.3" />
                        <Stop offset="0.6" stopColor={lightPrimary} stopOpacity="0.1" />
                        <Stop offset="1" stopColor={primary} stopOpacity="0" />
                    </RadialGradient>

                    {/* Subsurface scattering — warm glow bleeding through from behind */}
                    {/* Simulates light passing through translucent shell material */}
                    <RadialGradient id={sssGradId} cx="50%" cy="55%" rx="42%" ry="40%">
                        <Stop offset="0" stopColor={warmPrimary} stopOpacity={isGalaxy ? '0' : '0.18'} />
                        <Stop offset="0.5" stopColor={warmPrimary} stopOpacity={isGalaxy ? '0' : '0.08'} />
                        <Stop offset="1" stopColor={primary} stopOpacity="0" />
                    </RadialGradient>

                    {/* Fresnel rim — bright edge highlight at silhouette boundary */}
                    {/* Simulates the way light wraps around smooth curved surfaces */}
                    <RadialGradient id={fresnelGradId} cx="50%" cy="48%" rx="48%" ry="48%">
                        <Stop offset="0" stopColor={primary} stopOpacity="0" />
                        <Stop offset="0.78" stopColor={primary} stopOpacity="0" />
                        <Stop offset="0.88" stopColor={lightPrimary} stopOpacity={isGalaxy ? '0.08' : '0.15'} />
                        <Stop offset="0.96" stopColor={lighterPrimary} stopOpacity={isGalaxy ? '0.12' : '0.25'} />
                        <Stop offset="1" stopColor="#FFFFFF" stopOpacity={isGalaxy ? '0.05' : '0.12'} />
                    </RadialGradient>
                </Defs>

                {/* === LAYER 1: Base gradient fill === */}
                <Path d={pathD} fill={`url(#${baseGradId})`} />

                {/* === LAYER 2: Pattern overlay (clipped to egg) === */}
                <G clipPath={`url(#${clipId})`}>
                    {renderPatternOverlay()}
                </G>

                {/* === LAYER 3: Subsurface scattering === */}
                <Path d={pathD} fill={`url(#${sssGradId})`} />

                {/* === LAYER 4: Depth/edge darkening === */}
                <Path d={pathD} fill={`url(#${depthGradId})`} />

                {/* === LAYER 5: Primary specular highlight === */}
                <Path d={pathD} fill={`url(#${specularGradId})`} />

                {/* === LAYER 5b: Dappled light caustics (non-galaxy eggs) === */}
                {!isGalaxy && (
                    <G clipPath={`url(#${clipId})`}>
                        <DappledLightOverlay width={width} height={height} />
                    </G>
                )}

                {/* === LAYER 6: Fresnel rim edge highlight === */}
                <Path d={pathD} fill={`url(#${fresnelGradId})`} />

                {/* === LAYER 7: Rim/backlight === */}
                <Path d={pathD} fill={`url(#${rimGradId})`} />

                {/* === LAYER 8: Progressive crack overlay === */}
                {crackProgress > 0 && (
                    <G clipPath={`url(#${clipId})`}>
                        <CrackProgressOverlay
                            width={width}
                            height={height}
                            progress={crackProgress}
                            eggColor={primary}
                        />
                    </G>
                )}

                {/* === LAYER 9: Sharp specular glint — small bright spot === */}
                <Ellipse
                    cx={width * 0.34}
                    cy={height * 0.22}
                    rx={width * 0.09}
                    ry={height * 0.055}
                    fill="#FFFFFF"
                    opacity={isGalaxy ? 0.2 : 0.45}
                />
                {/* Pinpoint catchlight — ultra-bright, tiny, center of primary specular */}
                <Ellipse
                    cx={width * 0.33}
                    cy={height * 0.21}
                    rx={width * 0.02}
                    ry={height * 0.012}
                    fill="#FFFFFF"
                    opacity={isGalaxy ? 0.45 : 0.85}
                />
                {/* Secondary micro-glint */}
                <Ellipse
                    cx={width * 0.30}
                    cy={height * 0.19}
                    rx={width * 0.035}
                    ry={height * 0.02}
                    fill="#FFFFFF"
                    opacity={isGalaxy ? 0.3 : 0.65}
                />
                {/* === LAYER 10: Secondary specular — bounced ambient light === */}
                {/* Faint reflection on the lower-right from environmental bounce */}
                {!isGalaxy && (
                    <Ellipse
                        cx={width * 0.62}
                        cy={height * 0.68}
                        rx={width * 0.06}
                        ry={height * 0.035}
                        fill="#FFFFFF"
                        opacity={0.12}
                    />
                )}
            </Svg>

            {/* Emoji overlay (optional) */}
            {eggStyle.emoji && eggStyle.emoji !== '🥚' && (
                <View style={styles.emojiOverlay}>
                    <Text style={[styles.emoji, { fontSize: size * 0.25 }]}>{eggStyle.emoji}</Text>
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
    reflection: {
        position: 'absolute',
        alignSelf: 'center',
        opacity: 0.6,
    },
    shadow: {
        position: 'absolute',
        alignSelf: 'center',
    },
    svg: {
        // Ensure SVG renders crisply
    },
    emojiOverlay: {
        position: 'absolute',
        bottom: 2,
        right: -2,
    },
    emoji: {
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
});
