// i18n - Internationalization for Ovo Focus
import * as Localization from 'expo-localization';

export type Language = 'en' | 'tr';

// Get device language, default to English
export function getDeviceLanguage(): Language {
    const locale = Localization.getLocales()[0]?.languageCode;
    if (locale === 'tr') return 'tr';
    return 'en';
}

// Translation keys
export const translations = {
    en: {
        // App
        appName: 'Ovo Focus',
        tagline: 'Focus, Hatch Eggs, Collect Animals!',

        // Home Screen
        collection: 'Collection',
        session: 'Sessions',
        animals: 'Animals',
        streak: 'Streak',
        startFocus: 'Start Focus',
        giveUp: 'Give Up',
        tryAgain: 'Try Again',

        // Egg States
        focus: 'Focus...',
        keepGoing: 'Keep going!',
        doingGreat: 'Doing great! 🌟',
        almostThere: 'Almost there! ✨',
        eggBroken: 'The egg broke! 😢',

        // Hatch Modal
        congratulations: 'Congratulations! 🎊',
        addToCollection: 'Add to Collection',

        // Collection Screen
        collectionProgress: 'Collection Progress',
        animalsCollected: 'animals collected',
        minutes: 'Minutes',
        completed: 'Completed',
        bestStreak: 'Best Streak',
        noAnimalsYet: "You don't have any animals yet!",
        completeSessionsToHatch: 'Complete focus sessions to hatch animals from eggs.',

        // Settings Screen
        focusDuration: 'Focus Duration',
        notifications: 'Notifications',
        soundEffects: 'Sound Effects',
        vibration: 'Vibration',
        developer: 'Developer',
        debugMode: 'Debug Mode',
        debugModeDesc: 'Timer is 10 seconds instead of 25 min',
        statistics: 'Statistics',
        totalSessions: 'Total Sessions',
        failed: 'Failed',
        totalFocus: 'Total Focus',
        dangerZone: 'Danger Zone',
        deleteAllData: 'Delete All Data',
        deleteConfirmTitle: 'Delete Data',
        deleteConfirmMessage: 'All your collection and statistics will be deleted. Are you sure?',
        cancel: 'Cancel',
        delete: 'Delete',
        done: 'Done',
        restartApp: 'All data deleted. Restart the app.',
        language: 'Language',
        tolerance: 'Background Tolerance',
        toleranceDesc: 'Time to return before egg breaks',
        seconds: 'sec',

        // Rarity
        common: 'Common',
        rare: 'Rare',
        epic: 'Epic',
        legendary: 'Legendary',

        // Notifications
        sessionCompleteTitle: 'Session Complete! 🎉',
        sessionCompleteBody: 'You hatched a new animal! Open the app to see it.',
        newAnimalTitle: 'New Animal! 🥚✨',

        // Animals (names)
        chick: 'Chick',
        bunny: 'Bunny',
        hamster: 'Hamster',
        cat: 'Cat',
        dog: 'Dog',
        mouse: 'Mouse',
        pig: 'Pig',
        frog: 'Frog',
        fox: 'Fox',
        koala: 'Koala',
        panda: 'Panda',
        penguin: 'Penguin',
        owl: 'Owl',
        hedgehog: 'Hedgehog',
        unicorn: 'Unicorn',
        dragon: 'Dragon',
        phoenix: 'Phoenix',
        wolf: 'Wolf',
        golden_dragon: 'Golden Dragon',
        rainbow_unicorn: 'Rainbow Unicorn',
        cosmic_owl: 'Cosmic Owl',

        // Animal descriptions
        chick_desc: 'A cute yellow chick!',
        bunny_desc: 'A soft-eared bunny.',
        hamster_desc: 'A chubby-cheeked hamster.',
        cat_desc: 'A lazy house cat.',
        dog_desc: 'Your loyal friend.',
        mouse_desc: 'A quick little mouse.',
        pig_desc: 'Pink and adorable.',
        frog_desc: 'A green frog.',
        fox_desc: 'A cunning forest fox.',
        koala_desc: 'A sleepy koala.',
        panda_desc: 'A bamboo-loving panda.',
        penguin_desc: 'A cold-loving penguin.',
        owl_desc: 'A wise night bird.',
        hedgehog_desc: 'A hedgehog with soft spines.',
        unicorn_desc: 'A magical unicorn!',
        dragon_desc: 'A fire-breathing dragon!',
        phoenix_desc: 'A phoenix born from ashes!',
        wolf_desc: 'A lone and powerful wolf.',
        golden_dragon_desc: 'The legendary golden dragon!',
        rainbow_unicorn_desc: 'A very rare rainbow unicorn!',
        cosmic_owl_desc: 'An owl from the stars.',
    },

    tr: {
        // App
        appName: 'Ovo Focus',
        tagline: 'Odaklan, Yumurta Çatlat, Hayvan Topla!',

        // Home Screen
        collection: 'Koleksiyon',
        session: 'Seans',
        animals: 'Hayvan',
        streak: 'Seri',
        startFocus: 'Odaklanmaya Başla',
        giveUp: 'Vazgeç',
        tryAgain: 'Tekrar Dene',

        // Egg States
        focus: 'Odaklan...',
        keepGoing: 'Devam et!',
        doingGreat: 'Harika gidiyorsun! 🌟',
        almostThere: 'Neredeyse tamam! ✨',
        eggBroken: 'Yumurta kırıldı! 😢',

        // Hatch Modal
        congratulations: 'Tebrikler! 🎊',
        addToCollection: 'Koleksiyonuma Ekle',

        // Collection Screen
        collectionProgress: 'Koleksiyon İlerlemesi',
        animalsCollected: 'hayvan toplandı',
        minutes: 'Dakika',
        completed: 'Tamamlanan',
        bestStreak: 'En İyi Seri',
        noAnimalsYet: 'Henüz hayvanın yok!',
        completeSessionsToHatch: 'Odaklanma seanslarını tamamlayarak yumurtadan hayvanlar çıkar.',

        // Settings Screen
        focusDuration: 'Odaklanma Süresi',
        notifications: 'Bildirimler',
        soundEffects: 'Ses Efektleri',
        vibration: 'Titreşim',
        developer: 'Geliştirici',
        debugMode: 'Debug Modu',
        debugModeDesc: 'Sayaç 25 dk yerine 10 saniye',
        statistics: 'İstatistikler',
        totalSessions: 'Toplam Seanslar',
        failed: 'Başarısız',
        totalFocus: 'Toplam Odaklanma',
        dangerZone: 'Tehlikeli Bölge',
        deleteAllData: 'Tüm Verileri Sil',
        deleteConfirmTitle: 'Verileri Sil',
        deleteConfirmMessage: 'Tüm koleksiyonun ve istatistiklerin silinecek. Emin misin?',
        cancel: 'İptal',
        delete: 'Sil',
        done: 'Tamamlandı',
        restartApp: 'Tüm veriler silindi. Uygulamayı yeniden başlat.',
        language: 'Dil',
        tolerance: 'Arka Plan Toleransı',
        toleranceDesc: 'Yumurta kırılmadan geri dönme süresi',
        seconds: 'sn',

        // Rarity
        common: 'Yaygın',
        rare: 'Nadir',
        epic: 'Epik',
        legendary: 'Efsanevi',

        // Notifications
        sessionCompleteTitle: 'Seans Tamamlandı! 🎉',
        sessionCompleteBody: 'Yeni bir hayvan çıkardın! Görmek için uygulamayı aç.',
        newAnimalTitle: 'Yeni Hayvan! 🥚✨',

        // Animals (names)
        chick: 'Civciv',
        bunny: 'Tavşan',
        hamster: 'Hamster',
        cat: 'Kedi',
        dog: 'Köpek',
        mouse: 'Fare',
        pig: 'Domuz',
        frog: 'Kurbağa',
        fox: 'Tilki',
        koala: 'Koala',
        panda: 'Panda',
        penguin: 'Penguen',
        owl: 'Baykuş',
        hedgehog: 'Kirpi',
        unicorn: 'Unicorn',
        dragon: 'Ejderha',
        phoenix: 'Anka Kuşu',
        wolf: 'Kurt',
        golden_dragon: 'Altın Ejderha',
        rainbow_unicorn: 'Gökkuşağı Unicorn',
        cosmic_owl: 'Kozmik Baykuş',

        // Animal descriptions
        chick_desc: 'Tatlı bir sarı civciv!',
        bunny_desc: 'Yumuşak kulaklı bir tavşan.',
        hamster_desc: 'Şişkin yanaklı bir hamster.',
        cat_desc: 'Tembel bir ev kedisi.',
        dog_desc: 'Sadık bir dostum senin.',
        mouse_desc: 'Küçük ve hızlı bir fare.',
        pig_desc: 'Pembe ve sevimli.',
        frog_desc: 'Yeşil bir kurbağa.',
        fox_desc: 'Kurnaz bir orman tilkisi.',
        koala_desc: 'Uykucu bir koala.',
        panda_desc: 'Bambu seven bir panda.',
        penguin_desc: 'Soğuk seven bir penguen.',
        owl_desc: 'Bilge bir gece kuşu.',
        hedgehog_desc: 'Dikenleri yumuşak bir kirpi.',
        unicorn_desc: 'Sihirli bir tek boynuzlu at!',
        dragon_desc: 'Ateş püskürten ejderha!',
        phoenix_desc: 'Küllerinden doğan anka!',
        wolf_desc: 'Yalnız ve güçlü bir kurt.',
        golden_dragon_desc: 'Efsanevi altın ejderha!',
        rainbow_unicorn_desc: 'Çok nadir gökkuşağı unicorn!',
        cosmic_owl_desc: 'Yıldızlardan gelen baykuş.',
    },
} as const;

export type TranslationKey = keyof typeof translations.en;

// Get translation function
export function t(key: TranslationKey, language: Language): string {
    return translations[language][key] || translations.en[key] || key;
}

// Get animal name
export function getAnimalName(animalId: string, language: Language): string {
    const key = animalId as TranslationKey;
    return translations[language][key] || animalId;
}

// Get animal description
export function getAnimalDescription(animalId: string, language: Language): string {
    const key = `${animalId}_desc` as TranslationKey;
    return translations[language][key] || '';
}

// Get rarity label
export function getRarityLabelI18n(rarity: string, language: Language): string {
    const key = rarity as TranslationKey;
    return translations[language][key] || rarity;
}
