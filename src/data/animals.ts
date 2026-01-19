// Animal definitions for Ovo Focus
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Animal {
    id: string;
    name: string;
    emoji: string;
    rarity: Rarity;
    description: string;
}

// Probability weights for each rarity
export const rarityWeights: Record<Rarity, number> = {
    common: 60,
    rare: 25,
    epic: 12,
    legendary: 3,
};

export const animals: Animal[] = [
    // Common animals (60% chance)
    { id: 'chick', name: 'Civciv', emoji: '🐤', rarity: 'common', description: 'Tatlı bir sarı civciv!' },
    { id: 'bunny', name: 'Tavşan', emoji: '🐰', rarity: 'common', description: 'Yumuşak kulaklı bir tavşan.' },
    { id: 'hamster', name: 'Hamster', emoji: '🐹', rarity: 'common', description: 'Şişkin yanaklı bir hamster.' },
    { id: 'cat', name: 'Kedi', emoji: '🐱', rarity: 'common', description: 'Tembel bir ev kedisi.' },
    { id: 'dog', name: 'Köpek', emoji: '🐶', rarity: 'common', description: 'Sadık bir dostum senin.' },
    { id: 'mouse', name: 'Fare', emoji: '🐭', rarity: 'common', description: 'Küçük ve hızlı bir fare.' },
    { id: 'pig', name: 'Domuz', emoji: '🐷', rarity: 'common', description: 'Pembe ve sevimli.' },
    { id: 'frog', name: 'Kurbağa', emoji: '🐸', rarity: 'common', description: 'Yeşil bir kurbağa.' },
    { id: 'turtle', name: 'Kaplumbağa', emoji: '🐢', rarity: 'common', description: 'Sakin ve sabırlı.' },
    { id: 'duck', name: 'Ördek', emoji: '🦆', rarity: 'common', description: 'Neşeli bir ördek.' },
    { id: 'cow', name: 'İnek', emoji: '🐮', rarity: 'common', description: 'Verimli bir çiftlik ineği.' },
    { id: 'sheep', name: 'Koyun', emoji: '🐑', rarity: 'common', description: 'Yumuşak tüylü koyun.' },
    { id: 'rooster', name: 'Horoz', emoji: '🐓', rarity: 'common', description: 'Sabahçı horoz.' },
    { id: 'snail', name: 'Salyangoz', emoji: '🐌', rarity: 'common', description: 'Yavaş ama kararlı.' },

    // Rare animals (25% chance)
    { id: 'fox', name: 'Tilki', emoji: '🦊', rarity: 'rare', description: 'Kurnaz bir orman tilkisi.' },
    { id: 'koala', name: 'Koala', emoji: '🐨', rarity: 'rare', description: 'Uykucu bir koala.' },
    { id: 'panda', name: 'Panda', emoji: '🐼', rarity: 'rare', description: 'Bambu seven bir panda.' },
    { id: 'penguin', name: 'Penguen', emoji: '🐧', rarity: 'rare', description: 'Soğuk seven bir penguen.' },
    { id: 'owl', name: 'Baykuş', emoji: '🦉', rarity: 'rare', description: 'Bilge bir gece kuşu.' },
    { id: 'hedgehog', name: 'Kirpi', emoji: '🦔', rarity: 'rare', description: 'Dikenleri yumuşak bir kirpi.' },
    { id: 'lion', name: 'Aslan', emoji: '🦁', rarity: 'rare', description: 'Ormanların kralı.' },
    { id: 'elephant', name: 'Fil', emoji: '🐘', rarity: 'rare', description: 'Bilge ve güçlü.' },
    { id: 'dolphin', name: 'Yunus', emoji: '🐬', rarity: 'rare', description: 'Akıllı deniz dostum.' },
    { id: 'tiger', name: 'Kaplan', emoji: '🐯', rarity: 'rare', description: 'Cesur bir avcı.' },

    // Epic animals (12% chance)
    { id: 'unicorn', name: 'Unicorn', emoji: '🦄', rarity: 'epic', description: 'Sihirli bir tek boynuzlu at!' },
    { id: 'dragon', name: 'Ejderha', emoji: '🐉', rarity: 'epic', description: 'Ateş püskürten ejderha!' },
    { id: 'phoenix', name: 'Anka Kuşu', emoji: '🔥', rarity: 'epic', description: 'Küllerinden doğan anka!' },
    { id: 'wolf', name: 'Kurt', emoji: '🐺', rarity: 'epic', description: 'Yalnız ve güçlü bir kurt.' },
    { id: 'gryphon', name: 'Grifon', emoji: '🦅', rarity: 'epic', description: 'Kartal başlı aslan.' },
    { id: 'kraken', name: 'Kraken', emoji: '🦑', rarity: 'epic', description: 'Derin denizlerin korkulan yaratığı.' },
    { id: 'pegasus', name: 'Pegasus', emoji: '🐴', rarity: 'epic', description: 'Kanatlı sihirli at.' },

    // Legendary animals (3% chance)
    { id: 'golden_dragon', name: 'Altın Ejderha', emoji: '✨', rarity: 'legendary', description: 'Efsanevi altın ejderha!' },
    { id: 'rainbow_unicorn', name: 'Gökkuşağı Unicorn', emoji: '🌈', rarity: 'legendary', description: 'Çok nadir gökkuşağı unicorn!' },
    { id: 'cosmic_owl', name: 'Kozmik Baykuş', emoji: '🌌', rarity: 'legendary', description: 'Yıldızlardan gelen baykuş.' },
    { id: 'celestial_lion', name: 'Göksel Aslan', emoji: '🌟', rarity: 'legendary', description: 'Yıldızlardan gelen aslan.' },
    { id: 'void_serpent', name: 'Boşluk Yılanı', emoji: '🌀', rarity: 'legendary', description: 'Karanlıkların efendisi.' },
];

// Get random animal based on rarity weights
export function getRandomAnimal(): Animal {
    const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    let selectedRarity: Rarity = 'common';
    for (const [rarity, weight] of Object.entries(rarityWeights) as [Rarity, number][]) {
        random -= weight;
        if (random <= 0) {
            selectedRarity = rarity;
            break;
        }
    }

    const animalsOfRarity = animals.filter(a => a.rarity === selectedRarity);
    if (animalsOfRarity.length === 0) {
        // Fallback to first animal if rarity not found
        return animals[0];
    }
    return animalsOfRarity[Math.floor(Math.random() * animalsOfRarity.length)];
}

// Get rarity color - WCAG AA compliant colors
// These colors have been audited for 4.5:1+ contrast ratio against background (#1A1A2E)
export function getRarityColor(rarity: Rarity): string {
    const colors: Record<Rarity, string> = {
        common: '#A8A8A8',    // 7.17:1 contrast
        rare: '#4FC3F7',      // 8.51:1 contrast
        epic: '#C77DDB',      // 6.00:1 contrast (adjusted from #BA68C8 for WCAG AA)
        legendary: '#FFD700', // 12.16:1 contrast
    };
    return colors[rarity];
}

// Rarity indicator icons - Alternative visual cues for accessibility (non-color-dependent)
export const rarityIndicators: Record<Rarity, { icon: string; stars: number; label: string }> = {
    common: { icon: '●', stars: 1, label: 'Common' },
    rare: { icon: '◆', stars: 2, label: 'Rare' },
    epic: { icon: '★', stars: 3, label: 'Epic' },
    legendary: { icon: '✦', stars: 4, label: 'Legendary' },
};

// Get rarity indicator for accessibility
export function getRarityIndicator(rarity: Rarity): { icon: string; stars: number; label: string } {
    return rarityIndicators[rarity];
}

// Generate star rating string for rarity (e.g., "★★★" for epic)
export function getRarityStars(rarity: Rarity): string {
    const { stars } = rarityIndicators[rarity];
    return '★'.repeat(stars);
}
