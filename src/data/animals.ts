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

    // Rare animals (25% chance)
    { id: 'fox', name: 'Tilki', emoji: '🦊', rarity: 'rare', description: 'Kurnaz bir orman tilkisi.' },
    { id: 'koala', name: 'Koala', emoji: '🐨', rarity: 'rare', description: 'Uykucu bir koala.' },
    { id: 'panda', name: 'Panda', emoji: '🐼', rarity: 'rare', description: 'Bambu seven bir panda.' },
    { id: 'penguin', name: 'Penguen', emoji: '🐧', rarity: 'rare', description: 'Soğuk seven bir penguen.' },
    { id: 'owl', name: 'Baykuş', emoji: '🦉', rarity: 'rare', description: 'Bilge bir gece kuşu.' },
    { id: 'hedgehog', name: 'Kirpi', emoji: '🦔', rarity: 'rare', description: 'Dikenleri yumuşak bir kirpi.' },

    // Epic animals (12% chance)
    { id: 'unicorn', name: 'Unicorn', emoji: '🦄', rarity: 'epic', description: 'Sihirli bir tek boynuzlu at!' },
    { id: 'dragon', name: 'Ejderha', emoji: '🐉', rarity: 'epic', description: 'Ateş püskürten ejderha!' },
    { id: 'phoenix', name: 'Anka Kuşu', emoji: '🔥', rarity: 'epic', description: 'Küllerinden doğan anka!' },
    { id: 'wolf', name: 'Kurt', emoji: '🐺', rarity: 'epic', description: 'Yalnız ve güçlü bir kurt.' },

    // Legendary animals (3% chance)
    { id: 'golden_dragon', name: 'Altın Ejderha', emoji: '✨', rarity: 'legendary', description: 'Efsanevi altın ejderha!' },
    { id: 'rainbow_unicorn', name: 'Gökkuşağı Unicorn', emoji: '🌈', rarity: 'legendary', description: 'Çok nadir gökkuşağı unicorn!' },
    { id: 'cosmic_owl', name: 'Kozmik Baykuş', emoji: '🌌', rarity: 'legendary', description: 'Yıldızlardan gelen baykuş.' },
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
    return animalsOfRarity[Math.floor(Math.random() * animalsOfRarity.length)];
}

// Get rarity color
export function getRarityColor(rarity: Rarity): string {
    const colors: Record<Rarity, string> = {
        common: '#A8A8A8',
        rare: '#4FC3F7',
        epic: '#BA68C8',
        legendary: '#FFD700',
    };
    return colors[rarity];
}

// Get rarity label in Turkish
export function getRarityLabel(rarity: Rarity): string {
    const labels: Record<Rarity, string> = {
        common: 'Yaygın',
        rare: 'Nadir',
        epic: 'Epik',
        legendary: 'Efsanevi',
    };
    return labels[rarity];
}
