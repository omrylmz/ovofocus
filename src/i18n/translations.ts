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
        pause: 'Pause',
        resume: 'Resume',
        paused: 'Paused',
        pausesRemaining: 'pauses left',

        // Give Up Confirmation
        giveUpConfirmTitle: 'Give Up?',
        giveUpConfirmMessage: 'Your egg will break and progress will be lost. Are you sure?',
        keepFocusing: 'Keep Focusing',

        // Gesture Hints
        gestureHintTap: 'Tap the egg for encouragement',
        gestureHintDoubleTap: 'Double-tap to see time remaining',
        gestureHintLongPress: 'Long-press for motivation',
        gotIt: 'Got it!',

        // Stats
        best: 'Best',

        // Streak Celebration
        newBestStreak: 'New Best Streak!',
        sessions: 'sessions',
        keepItUp: 'Keep up the amazing work!',

        // Onboarding
        skip: 'Skip',
        next: 'Next',
        letsStart: "Let's Start!",
        onboardingWelcomeTitle: 'Welcome to Ovo Focus!',
        onboardingWelcomeDesc: 'Transform your focus time into fun! Complete focus sessions to hatch mysterious eggs and collect adorable animals.',
        onboardingFocusTitle: 'How It Works',
        onboardingFocusDesc: 'Start a 25-minute focus session. Stay on the app and avoid distractions. If you leave too long, your egg breaks!',
        onboardingCollectionTitle: 'Collect Animals',
        onboardingCollectionDesc: 'Complete sessions to hatch eggs! Each animal has a rarity level: Common, Rare, Epic, or Legendary. Build your collection!',
        onboardingStreakTitle: 'Build Streaks',
        onboardingStreakDesc: 'Complete sessions in a row to build your streak! Longer streaks unlock better rewards and bragging rights.',
        onboardingGesturesTitle: 'Egg Interactions',
        onboardingGesturesDesc: 'Tap the egg for encouragement, double-tap to see time remaining, and long-press for motivation messages!',

        // Daily Goals
        dailyGoal: 'Daily Goal',
        dailyGoalProgress: 'Today',
        dailyGoalAchieved: 'Goal Achieved!',
        dailyGoalSetting: 'Daily Goal (sessions)',

        // Collection Filters
        filterAll: 'All',
        filterCollected: 'Collected',
        filterUncollected: 'Missing',
        filterFavorites: 'Favorites',
        sortByRarity: 'By Rarity',
        sortByRecent: 'Recent',
        sortByName: 'A-Z',
        searchPlaceholder: 'Search animals...',
        keepFocusingToDiscover: 'Keep focusing to discover this animal!',
        noResults: 'No animals found',

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
        turtle: 'Turtle',
        duck: 'Duck',
        cow: 'Cow',
        sheep: 'Sheep',
        rooster: 'Rooster',
        snail: 'Snail',
        fox: 'Fox',
        koala: 'Koala',
        panda: 'Panda',
        penguin: 'Penguin',
        owl: 'Owl',
        hedgehog: 'Hedgehog',
        lion: 'Lion',
        elephant: 'Elephant',
        dolphin: 'Dolphin',
        tiger: 'Tiger',
        unicorn: 'Unicorn',
        dragon: 'Dragon',
        phoenix: 'Phoenix',
        wolf: 'Wolf',
        gryphon: 'Gryphon',
        kraken: 'Kraken',
        pegasus: 'Pegasus',
        golden_dragon: 'Golden Dragon',
        rainbow_unicorn: 'Rainbow Unicorn',
        cosmic_owl: 'Cosmic Owl',
        celestial_lion: 'Celestial Lion',
        void_serpent: 'Void Serpent',

        // Animal descriptions
        chick_desc: 'A cute yellow chick!',
        bunny_desc: 'A soft-eared bunny.',
        hamster_desc: 'A chubby-cheeked hamster.',
        cat_desc: 'A lazy house cat.',
        dog_desc: 'Your loyal friend.',
        mouse_desc: 'A quick little mouse.',
        pig_desc: 'Pink and adorable.',
        frog_desc: 'A green frog.',
        turtle_desc: 'Calm and patient.',
        duck_desc: 'A cheerful duck.',
        cow_desc: 'A productive farm cow.',
        sheep_desc: 'A fluffy sheep.',
        rooster_desc: 'An early bird.',
        snail_desc: 'Slow but determined.',
        fox_desc: 'A cunning forest fox.',
        koala_desc: 'A sleepy koala.',
        panda_desc: 'A bamboo-loving panda.',
        penguin_desc: 'A cold-loving penguin.',
        owl_desc: 'A wise night bird.',
        hedgehog_desc: 'A hedgehog with soft spines.',
        lion_desc: 'King of the jungle.',
        elephant_desc: 'Wise and powerful.',
        dolphin_desc: 'A smart sea friend.',
        tiger_desc: 'A brave hunter.',
        unicorn_desc: 'A magical unicorn!',
        dragon_desc: 'A fire-breathing dragon!',
        phoenix_desc: 'A phoenix born from ashes!',
        wolf_desc: 'A lone and powerful wolf.',
        gryphon_desc: 'An eagle-headed lion.',
        kraken_desc: 'Terror of the deep seas.',
        pegasus_desc: 'A magical winged horse.',
        golden_dragon_desc: 'The legendary golden dragon!',
        rainbow_unicorn_desc: 'A very rare rainbow unicorn!',
        cosmic_owl_desc: 'An owl from the stars.',
        celestial_lion_desc: 'A lion from the stars.',
        void_serpent_desc: 'Lord of darkness.',
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
        pause: 'Duraklat',
        resume: 'Devam Et',
        paused: 'Duraklatıldı',
        pausesRemaining: 'duraklatma kaldı',

        // Give Up Confirmation
        giveUpConfirmTitle: 'Vazgeç?',
        giveUpConfirmMessage: 'Yumurtan kırılacak ve ilerleme kaybolacak. Emin misin?',
        keepFocusing: 'Odaklanmaya Devam Et',

        // Gesture Hints
        gestureHintTap: 'Cesaretlendirme için yumurtaya dokun',
        gestureHintDoubleTap: 'Kalan süreyi görmek için çift dokun',
        gestureHintLongPress: 'Motivasyon için uzun bas',
        gotIt: 'Anladım!',

        // Stats
        best: 'En İyi',

        // Streak Celebration
        newBestStreak: 'Yeni En İyi Seri!',
        sessions: 'seans',
        keepItUp: 'Harika gidiyorsun, devam et!',

        // Onboarding
        skip: 'Atla',
        next: 'İleri',
        letsStart: 'Başlayalım!',
        onboardingWelcomeTitle: "Ovo Focus'a Hoşgeldin!",
        onboardingWelcomeDesc: 'Odaklanma sürenizi eğlenceye dönüştürün! Odaklanma seanslarını tamamlayarak gizemli yumurtaları kuluçkaya yatırın ve sevimli hayvanlar toplayın.',
        onboardingFocusTitle: 'Nasıl Çalışır',
        onboardingFocusDesc: '25 dakikalık bir odaklanma seansı başlatın. Uygulamada kalın ve dikkatinizi dağıtmayın. Çok uzun süre ayrılırsanız yumurtanız kırılır!',
        onboardingCollectionTitle: 'Hayvan Topla',
        onboardingCollectionDesc: 'Seansları tamamlayarak yumurta kuluçkalayın! Her hayvanın bir nadirlik seviyesi var: Yaygın, Nadir, Epik veya Efsanevi.',
        onboardingStreakTitle: 'Seri Oluştur',
        onboardingStreakDesc: 'Serileri oluşturmak için seansları arka arkaya tamamlayın! Daha uzun seriler daha iyi ödüller açar.',
        onboardingGesturesTitle: 'Yumurta Etkileşimleri',
        onboardingGesturesDesc: 'Cesaretlendirme için yumurtaya dokunun, kalan süreyi görmek için çift dokunun, motivasyon mesajları için uzun basın!',

        // Daily Goals
        dailyGoal: 'Günlük Hedef',
        dailyGoalProgress: 'Bugün',
        dailyGoalAchieved: 'Hedef Tamamlandı!',
        dailyGoalSetting: 'Günlük Hedef (seans)',

        // Collection Filters
        filterAll: 'Tümü',
        filterCollected: 'Toplanan',
        filterUncollected: 'Eksik',
        filterFavorites: 'Favoriler',
        sortByRarity: 'Nadirliğe Göre',
        sortByRecent: 'En Yeni',
        sortByName: 'A-Z',
        searchPlaceholder: 'Hayvan ara...',
        keepFocusingToDiscover: 'Bu hayvanı keşfetmek için odaklanmaya devam et!',
        noResults: 'Hayvan bulunamadı',

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
        turtle: 'Kaplumbağa',
        duck: 'Ördek',
        cow: 'İnek',
        sheep: 'Koyun',
        rooster: 'Horoz',
        snail: 'Salyangoz',
        fox: 'Tilki',
        koala: 'Koala',
        panda: 'Panda',
        penguin: 'Penguen',
        owl: 'Baykuş',
        hedgehog: 'Kirpi',
        lion: 'Aslan',
        elephant: 'Fil',
        dolphin: 'Yunus',
        tiger: 'Kaplan',
        unicorn: 'Unicorn',
        dragon: 'Ejderha',
        phoenix: 'Anka Kuşu',
        wolf: 'Kurt',
        gryphon: 'Grifon',
        kraken: 'Kraken',
        pegasus: 'Pegasus',
        golden_dragon: 'Altın Ejderha',
        rainbow_unicorn: 'Gökkuşağı Unicorn',
        cosmic_owl: 'Kozmik Baykuş',
        celestial_lion: 'Göksel Aslan',
        void_serpent: 'Boşluk Yılanı',

        // Animal descriptions
        chick_desc: 'Tatlı bir sarı civciv!',
        bunny_desc: 'Yumuşak kulaklı bir tavşan.',
        hamster_desc: 'Şişkin yanaklı bir hamster.',
        cat_desc: 'Tembel bir ev kedisi.',
        dog_desc: 'Sadık bir dostum senin.',
        mouse_desc: 'Küçük ve hızlı bir fare.',
        pig_desc: 'Pembe ve sevimli.',
        frog_desc: 'Yeşil bir kurbağa.',
        turtle_desc: 'Sakin ve sabırlı.',
        duck_desc: 'Neşeli bir ördek.',
        cow_desc: 'Verimli bir çiftlik ineği.',
        sheep_desc: 'Yumuşak tüylü koyun.',
        rooster_desc: 'Sabahçı horoz.',
        snail_desc: 'Yavaş ama kararlı.',
        fox_desc: 'Kurnaz bir orman tilkisi.',
        koala_desc: 'Uykucu bir koala.',
        panda_desc: 'Bambu seven bir panda.',
        penguin_desc: 'Soğuk seven bir penguen.',
        owl_desc: 'Bilge bir gece kuşu.',
        hedgehog_desc: 'Dikenleri yumuşak bir kirpi.',
        lion_desc: 'Ormanların kralı.',
        elephant_desc: 'Bilge ve güçlü.',
        dolphin_desc: 'Akıllı deniz dostum.',
        tiger_desc: 'Cesur bir avcı.',
        unicorn_desc: 'Sihirli bir tek boynuzlu at!',
        dragon_desc: 'Ateş püskürten ejderha!',
        phoenix_desc: 'Küllerinden doğan anka!',
        wolf_desc: 'Yalnız ve güçlü bir kurt.',
        gryphon_desc: 'Kartal başlı aslan.',
        kraken_desc: 'Derin denizlerin korkulan yaratığı.',
        pegasus_desc: 'Kanatlı sihirli at.',
        golden_dragon_desc: 'Efsanevi altın ejderha!',
        rainbow_unicorn_desc: 'Çok nadir gökkuşağı unicorn!',
        cosmic_owl_desc: 'Yıldızlardan gelen baykuş.',
        celestial_lion_desc: 'Yıldızlardan gelen aslan.',
        void_serpent_desc: 'Karanlıkların efendisi.',
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
