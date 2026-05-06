/* ================================================================
   SKRIBBL.IO 28 — WORD BANK
   500+ words across 15 categories, organized by difficulty.
   ================================================================ */

// ----------------------------------------------------------------
// RAW WORD LIST — grouped by category (all lowercase)
// ----------------------------------------------------------------

const WORD_CATEGORIES = {

    animals: [
        'cat', 'dog', 'elephant', 'giraffe', 'lion', 'tiger', 'bear', 'wolf',
        'fox', 'rabbit', 'mouse', 'rat', 'hamster', 'squirrel', 'deer', 'moose',
        'zebra', 'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken', 'duck',
        'goose', 'turkey', 'penguin', 'seal', 'walrus', 'dolphin', 'whale',
        'shark', 'octopus', 'squid', 'jellyfish', 'starfish', 'crab', 'lobster',
        'shrimp', 'snail', 'butterfly', 'bee', 'wasp', 'ant', 'spider',
        'scorpion', 'snake', 'lizard', 'crocodile', 'alligator', 'frog', 'toad',
        'turtle', 'tortoise', 'chameleon', 'iguana', 'koala', 'kangaroo',
        'panda', 'polar bear', 'chimpanzee', 'gorilla', 'orangutan', 'monkey',
        'parrot', 'eagle', 'owl', 'flamingo', 'peacock', 'pelican', 'toucan',
        'bat', 'hedgehog', 'mole', 'otter', 'beaver', 'porcupine', 'skunk',
        'raccoon', 'bison', 'buffalo', 'camel', 'llama', 'alpaca', 'donkey',
        'mule', 'rhinoceros', 'hippopotamus', 'warthog', 'baboon', 'cheetah',
        'leopard', 'jaguar', 'lynx', 'hyena', 'meerkat', 'mongoose', 'armadillo',
        'platypus', 'echidna', 'wombat', 'wallaby', 'manatee', 'narwhal',
        'orca', 'seahorse', 'clownfish', 'pufferfish', 'manta ray',
    ],

    food: [
        'apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry',
        'raspberry', 'watermelon', 'melon', 'pineapple', 'mango', 'peach',
        'pear', 'plum', 'cherry', 'lemon', 'lime', 'coconut', 'kiwi',
        'pomegranate', 'avocado', 'papaya', 'guava', 'lychee', 'fig',
        'carrot', 'potato', 'tomato', 'cucumber', 'lettuce', 'cabbage',
        'broccoli', 'cauliflower', 'spinach', 'onion', 'garlic', 'pepper',
        'corn', 'peas', 'beans', 'mushroom', 'eggplant', 'zucchini',
        'asparagus', 'celery', 'radish', 'turnip', 'parsnip', 'artichoke',
        'rice', 'bread', 'pizza', 'burger', 'sandwich', 'hot dog', 'taco',
        'burrito', 'sushi', 'pasta', 'noodles', 'spaghetti', 'steak',
        'chicken', 'fish', 'egg', 'cheese', 'butter', 'milk', 'yogurt',
        'ice cream', 'cake', 'cookie', 'donut', 'chocolate', 'candy',
        'popcorn', 'pretzel', 'waffle', 'pancake', 'croissant', 'bagel',
        'muffin', 'cupcake', 'brownie', 'pie', 'tart', 'pudding', 'mousse',
        'soup', 'salad', 'stew', 'curry', 'dumpling', 'spring roll',
        'fried rice', 'ramen', 'udon', 'sashimi', 'tempura', 'gyoza',
        'kebab', 'falafel', 'hummus', 'pita', 'quesadilla', 'nachos',
        'guacamole', 'salsa', 'chili', 'bacon', 'sausage', 'ham', 'pepperoni',
        'tofu', 'soy sauce', 'ketchup', 'mustard', 'mayonnaise', 'honey',
        'jam', 'peanut butter', 'nutella', 'syrup', 'vinegar',
    ],

    objects: [
        'book', 'phone', 'computer', 'laptop', 'tablet', 'keyboard', 'monitor',
        'television', 'remote', 'camera', 'watch', 'clock', 'alarm', 'lamp',
        'fan', 'heater', 'refrigerator', 'oven', 'microwave', 'toaster',
        'blender', 'kettle', 'pot', 'pan', 'plate', 'bowl', 'cup', 'glass',
        'bottle', 'fork', 'knife', 'spoon', 'chopsticks', 'napkin', 'chair',
        'table', 'desk', 'bed', 'couch', 'sofa', 'pillow', 'blanket',
        'towel', 'curtain', 'carpet', 'rug', 'mirror', 'picture', 'painting',
        'vase', 'candle', 'umbrella', 'backpack', 'suitcase', 'wallet',
        'key', 'lock', 'scissors', 'stapler', 'tape', 'glue', 'pencil',
        'pen', 'eraser', 'ruler', 'notebook', 'envelope', 'stamp', 'calculator',
        'printer', 'speaker', 'headphones', 'microphone', 'battery', 'cable',
        'charger', 'plug', 'socket', 'switch', 'ladder', 'hammer', 'nail',
        'screw', 'screwdriver', 'wrench', 'drill', 'saw', 'paintbrush',
        'bucket', 'mop', 'broom', 'dustpan', 'trash can', 'recycle bin',
        'shelf', 'drawer', 'cabinet', 'wardrobe', 'hanger', 'iron', 'washing machine',
        'vacuum', 'toilet', 'sink', 'faucet', 'shower', 'bathtub', 'soap',
        'shampoo', 'toothbrush', 'comb', 'razor', 'thermometer', 'stethoscope',
    ],

    places: [
        'house', 'apartment', 'building', 'skyscraper', 'castle', 'palace',
        'temple', 'church', 'mosque', 'synagogue', 'school', 'university',
        'hospital', 'library', 'museum', 'theater', 'cinema', 'restaurant',
        'cafe', 'bar', 'hotel', 'store', 'shop', 'mall', 'supermarket',
        'market', 'park', 'garden', 'forest', 'jungle', 'beach', 'desert',
        'mountain', 'hill', 'valley', 'river', 'lake', 'ocean', 'sea',
        'island', 'bridge', 'tunnel', 'road', 'street', 'highway', 'airport',
        'train station', 'bus stop', 'harbor', 'lighthouse', 'tower',
        'pyramid', 'colosseum', 'stadium', 'arena', 'gym', 'swimming pool',
        'playground', 'zoo', 'aquarium', 'farm', 'barn', 'windmill',
        'factory', 'warehouse', 'office', 'bank', 'police station',
        'fire station', 'prison', 'courthouse', 'cemetery', 'greenhouse',
        'garage', 'parking lot', 'gas station', 'car wash', 'mine',
        'oil rig', 'dam', 'power plant', 'space station', 'observatory',
    ],

    nature: [
        'sun', 'moon', 'star', 'planet', 'earth', 'mars', 'saturn', 'comet',
        'asteroid', 'meteor', 'galaxy', 'black hole', 'cloud', 'rain', 'snow',
        'wind', 'storm', 'thunder', 'lightning', 'tornado', 'hurricane',
        'flood', 'fire', 'flame', 'smoke', 'fog', 'mist', 'rainbow',
        'sunrise', 'sunset', 'eclipse', 'tide', 'wave', 'volcano', 'earthquake',
        'avalanche', 'glacier', 'iceberg', 'waterfall', 'canyon', 'cave',
        'cliff', 'dune', 'swamp', 'marsh', 'meadow', 'field', 'plain',
        'tundra', 'savanna', 'reef', 'coral', 'seaweed', 'moss', 'fern',
        'mushroom', 'cactus', 'bamboo', 'palm tree', 'oak tree', 'pine tree',
        'maple tree', 'cherry blossom', 'sunflower', 'rose', 'tulip',
        'daisy', 'lavender', 'orchid', 'lily', 'seed', 'leaf', 'branch',
        'root', 'bark', 'soil', 'rock', 'crystal', 'diamond', 'gold',
        'silver', 'coal', 'oil', 'magma', 'fossil',
    ],

    activities: [
        'reading', 'writing', 'drawing', 'painting', 'singing', 'dancing',
        'swimming', 'running', 'walking', 'jumping', 'flying', 'driving',
        'riding', 'cooking', 'baking', 'eating', 'drinking', 'sleeping',
        'dreaming', 'thinking', 'talking', 'listening', 'watching', 'looking',
        'hearing', 'smelling', 'tasting', 'touching', 'playing', 'working',
        'studying', 'learning', 'teaching', 'helping', 'giving', 'taking',
        'buying', 'selling', 'building', 'making', 'creating', 'destroying',
        'fixing', 'breaking', 'cleaning', 'washing', 'brushing', 'combing',
        'laughing', 'crying', 'smiling', 'frowning', 'shouting', 'whispering',
        'hugging', 'kissing', 'waving', 'pointing', 'clapping', 'snapping',
        'whistling', 'snoring', 'yawning', 'stretching', 'exercising',
        'meditating', 'praying', 'voting', 'marching', 'protesting',
        'celebrating', 'partying', 'camping', 'hiking', 'fishing', 'hunting',
        'gardening', 'farming', 'knitting', 'sewing', 'weaving', 'sculpting',
        'photographing', 'filming', 'editing', 'coding', 'hacking', 'typing',
        'printing', 'scanning', 'searching', 'googling', 'texting', 'calling',
        'emailing', 'posting', 'streaming', 'downloading', 'uploading',
    ],

    sports: [
        'soccer', 'basketball', 'tennis', 'baseball', 'football', 'golf',
        'hockey', 'volleyball', 'badminton', 'cricket', 'rugby', 'boxing',
        'wrestling', 'swimming', 'diving', 'surfing', 'skating', 'skiing',
        'snowboarding', 'cycling', 'running', 'jogging', 'marathon',
        'triathlon', 'gymnastics', 'cheerleading', 'fencing', 'archery',
        'bowling', 'billiards', 'darts', 'chess', 'poker', 'table tennis',
        'squash', 'lacrosse', 'water polo', 'polo', 'rowing', 'sailing',
        'kayaking', 'rock climbing', 'skydiving', 'bungee jumping',
        'parkour', 'breakdancing', 'karate', 'judo', 'taekwondo', 'sumo',
        'curling', 'bobsled', 'biathlon', 'pentathlon', 'decathlon',
        'pole vault', 'high jump', 'long jump', 'discus', 'javelin',
        'shot put', 'hammer throw', 'hurdles', 'relay race', 'sprint',
    ],

    professions: [
        'doctor', 'nurse', 'teacher', 'student', 'engineer', 'scientist',
        'artist', 'musician', 'actor', 'actress', 'chef', 'waiter', 'driver',
        'pilot', 'captain', 'police', 'firefighter', 'soldier', 'lawyer',
        'judge', 'farmer', 'fisherman', 'hunter', 'builder', 'carpenter',
        'plumber', 'electrician', 'mechanic', 'barber', 'tailor', 'sculptor',
        'writer', 'poet', 'journalist', 'photographer', 'designer', 'programmer',
        'manager', 'accountant', 'banker', 'economist', 'politician', 'president',
        'astronaut', 'archaeologist', 'biologist', 'chemist', 'physicist',
        'geologist', 'psychologist', 'therapist', 'dentist', 'veterinarian',
        'pharmacist', 'paramedic', 'surgeon', 'radiologist', 'optometrist',
        'librarian', 'curator', 'guide', 'interpreter', 'translator',
        'security guard', 'detective', 'spy', 'magician', 'comedian',
        'clown', 'acrobat', 'stuntman', 'referee', 'coach', 'trainer',
        'nutritionist', 'florist', 'jeweler', 'watchmaker', 'locksmith',
        'butcher', 'baker', 'brewer', 'sommelier',
    ],

    transport: [
        'car', 'truck', 'bus', 'van', 'motorcycle', 'bicycle', 'scooter',
        'skateboard', 'train', 'subway', 'tram', 'trolley', 'taxi',
        'ambulance', 'fire truck', 'police car', 'tractor', 'bulldozer',
        'crane', 'forklift', 'excavator', 'dump truck', 'cement mixer',
        'boat', 'ship', 'yacht', 'submarine', 'canoe', 'kayak', 'raft',
        'hovercraft', 'ferry', 'cruise ship', 'aircraft carrier',
        'helicopter', 'airplane', 'jet', 'rocket', 'spaceship', 'satellite',
        'hot air balloon', 'blimp', 'hang glider', 'parachute', 'drone',
        'rickshaw', 'chariot', 'sled', 'snowmobile', 'tank', 'jeep',
        'limousine', 'camper van', 'food truck', 'ice cream truck',
        'garbage truck', 'tow truck', 'race car', 'go kart',
    ],

    clothing: [
        'shirt', 'pants', 'jeans', 'shorts', 'skirt', 'dress', 'suit',
        'jacket', 'coat', 'sweater', 'hoodie', 't-shirt', 'blouse',
        'leggings', 'tights', 'socks', 'stockings', 'shoe', 'boot',
        'sandal', 'slipper', 'sneaker', 'heel', 'loafer', 'moccasin',
        'hat', 'cap', 'beanie', 'beret', 'turban', 'crown', 'helmet',
        'scarf', 'glove', 'mitten', 'tie', 'bow tie', 'belt', 'suspenders',
        'button', 'zipper', 'pocket', 'collar', 'sleeve', 'hood',
        'swimsuit', 'bikini', 'wetsuit', 'uniform', 'toga', 'kimono',
        'sari', 'poncho', 'raincoat', 'trench coat', 'overalls',
        'jumpsuit', 'apron', 'robe', 'pajamas', 'nightgown', 'underwear',
        'bra', 'boxers', 'vest', 'waistcoat', 'tank top', 'cardigan',
        'tuxedo', 'gown', 'cape', 'cloak', 'mask', 'goggles', 'sunglasses',
        'monocle', 'earring', 'necklace', 'bracelet', 'ring', 'brooch',
        'watch', 'handbag', 'purse', 'backpack', 'fanny pack',
    ],

    body: [
        'head', 'face', 'eye', 'nose', 'mouth', 'ear', 'hair', 'eyebrow',
        'eyelash', 'cheek', 'chin', 'jaw', 'forehead', 'temple', 'neck',
        'throat', 'shoulder', 'arm', 'elbow', 'wrist', 'hand', 'finger',
        'thumb', 'fingernail', 'knuckle', 'palm', 'chest', 'back',
        'spine', 'rib', 'stomach', 'belly button', 'waist', 'hip',
        'leg', 'thigh', 'knee', 'shin', 'calf', 'ankle', 'foot', 'toe',
        'toenail', 'heel', 'brain', 'heart', 'lung', 'liver', 'kidney',
        'muscle', 'bone', 'vein', 'artery', 'blood', 'skin', 'tongue',
        'tooth', 'lip',
    ],

    emotions: [
        'happy', 'sad', 'angry', 'afraid', 'surprised', 'confused',
        'bored', 'excited', 'tired', 'sleepy', 'hungry', 'thirsty',
        'sick', 'healthy', 'love', 'hate', 'jealous', 'proud', 'guilty',
        'ashamed', 'embarrassed', 'nervous', 'anxious', 'calm', 'relaxed',
        'bored', 'lonely', 'homesick', 'nostalgic', 'hopeful', 'hopeless',
        'brave', 'cowardly', 'generous', 'greedy', 'kind', 'mean',
        'honest', 'lying', 'trust', 'betrayal', 'grief', 'joy', 'disgust',
    ],

    fantasy: [
        'dragon', 'unicorn', 'phoenix', 'griffin', 'mermaid', 'fairy',
        'elf', 'dwarf', 'goblin', 'orc', 'vampire', 'werewolf', 'zombie',
        'ghost', 'skeleton', 'witch', 'wizard', 'magician', 'knight',
        'princess', 'prince', 'king', 'queen', 'giant', 'troll', 'gnome',
        'leprechaun', 'angel', 'demon', 'devil', 'genie', 'mummy',
        'frankenstein', 'cyclops', 'medusa', 'minotaur', 'sphinx',
        'centaur', 'pegasus', 'hydra', 'chimera', 'kraken', 'yeti',
        'bigfoot', 'loch ness monster', 'werewolf', 'banshee', 'poltergeist',
        'potion', 'spell', 'curse', 'enchantment', 'amulet', 'crystal ball',
        'magic wand', 'broomstick', 'cauldron', 'dungeon', 'treasure',
        'sword', 'shield', 'armor', 'bow', 'arrow', 'axe', 'spear',
        'scepter', 'scroll', 'map', 'compass', 'lantern',
    ],

    technology: [
        'robot', 'android', 'cyborg', 'alien', 'laser', 'hologram',
        'virtual reality', 'augmented reality', 'artificial intelligence',
        'internet', 'website', 'app', 'game', 'console', 'controller',
        'drone', 'satellite', 'gps', 'wifi', 'bluetooth', 'password',
        'email', 'virus', 'hacker', 'database', 'cloud', 'server',
        'algorithm', 'pixel', 'byte', 'chip', 'circuit', 'antenna',
        'radar', 'sonar', 'x-ray', 'mri', 'ultrasound', 'microscope',
        'telescope', 'calculator', 'smartwatch', 'earbuds', 'projector',
        'scanner', 'printer', '3d printer', 'smart home', 'self-driving car',
        'electric car', 'solar panel', 'wind turbine', 'nuclear reactor',
        'particle accelerator', 'quantum computer',
    ],

    household: [
        'window', 'door', 'wall', 'floor', 'ceiling', 'roof', 'chimney',
        'fireplace', 'stairs', 'elevator', 'hallway', 'corridor', 'attic',
        'basement', 'garage', 'porch', 'balcony', 'terrace', 'fence',
        'gate', 'mailbox', 'doorbell', 'welcome mat', 'welcome sign',
        'picture frame', 'photo album', 'bookshelf', 'trophy', 'clock',
        'calendar', 'whiteboard', 'chalkboard', 'piano', 'guitar', 'violin',
        'drums', 'trumpet', 'flute', 'harp', 'accordion', 'saxophone',
        'chandelier', 'ceiling fan', 'air conditioner', 'humidifier',
        'dehumidifier', 'air purifier', 'security camera', 'smoke detector',
        'fire extinguisher', 'first aid kit', 'medicine cabinet',
        'aquarium', 'birdcage', 'cat tree', 'dog bed', 'litter box',
    ],
};

// ----------------------------------------------------------------
// FLAT WORD LIST (all words combined)
// ----------------------------------------------------------------
const wordBank = Object.values(WORD_CATEGORIES).flat();

// ----------------------------------------------------------------
// DIFFICULTY CLASSIFICATION
// Easy   = 1 word, ≤ 5 chars
// Medium = 1 word, 6–9 chars  OR  2-word phrase ≤ 10 chars
// Hard   = 1 word, ≥ 10 chars OR  2-word phrase > 10 chars
// ----------------------------------------------------------------
function classifyDifficulty(word) {
    const isMultiWord = word.includes(' ');
    const len         = word.length;
    if (!isMultiWord && len <= 5)                    return 'easy';
    if (!isMultiWord && len >= 10)                   return 'hard';
    if (isMultiWord  && len > 12)                    return 'hard';
    return 'medium';
}

function pointsForDifficulty(diff) {
    return { easy: 1, medium: 2, hard: 3 }[diff] || 2;
}

// ----------------------------------------------------------------
// WordBank PUBLIC API
// ----------------------------------------------------------------
const WordBank = {

    /** Total number of words */
    getWordCount() {
        return wordBank.length;
    },

    /** True if word exists in bank */
    hasWord(word) {
        return wordBank.includes((word || '').toLowerCase().trim());
    },

    /** Get N random words */
    getRandomWords(count) {
        count = count || 3;
        return [...wordBank].sort(() => Math.random() - 0.5).slice(0, count);
    },

    /** Get a single random word */
    getRandomWord() {
        return wordBank[Math.floor(Math.random() * wordBank.length)];
    },

    /** Get easy words (short, single word) */
    getEasyWords() {
        return wordBank.filter(w => classifyDifficulty(w) === 'easy');
    },

    /** Get medium words */
    getMediumWords() {
        return wordBank.filter(w => classifyDifficulty(w) === 'medium');
    },

    /** Get hard words (long or multi-word) */
    getHardWords() {
        return wordBank.filter(w => classifyDifficulty(w) === 'hard');
    },

    /** Get random word from specific difficulty pool */
    getRandomByDifficulty(difficulty) {
        let pool;
        switch (difficulty) {
            case 'easy':   pool = this.getEasyWords();   break;
            case 'hard':   pool = this.getHardWords();   break;
            default:       pool = this.getMediumWords(); break;
        }
        if (pool.length === 0) pool = wordBank; // fallback
        return pool[Math.floor(Math.random() * pool.length)];
    },

    /**
     * getWordOptions — returns 3 choices for the word selection modal:
     *   [0] easy   word
     *   [1] medium word
     *   [2] hard   word
     * Each has: { word, difficulty, points }
     */
    getWordOptions() {
        return ['easy', 'medium', 'hard'].map(diff => {
            const word = this.getRandomByDifficulty(diff);
            return {
                word:       word,
                difficulty: diff.charAt(0).toUpperCase() + diff.slice(1),
                points:     pointsForDifficulty(diff),
            };
        });
    },

    /**
     * Get words from a specific category
     * @param {string} category — key from WORD_CATEGORIES
     */
    getCategory(category) {
        return WORD_CATEGORIES[category] || [];
    },

    /** List all category names */
    getCategories() {
        return Object.keys(WORD_CATEGORIES);
    },

    /**
     * Get a random word from a random category
     */
    getRandomFromRandomCategory() {
        const cats  = Object.keys(WORD_CATEGORIES);
        const cat   = cats[Math.floor(Math.random() * cats.length)];
        const words = WORD_CATEGORIES[cat];
        return words[Math.floor(Math.random() * words.length)];
    },

    /**
     * Validate a guess against the answer.
     * Returns: 'correct' | 'close' | 'wrong'
     * 'close' = Levenshtein distance of 1 on words ≥ 5 chars
     */
    checkGuess(guess, answer) {
        if (!guess || !answer) return 'wrong';
        const g = guess.toLowerCase().trim();
        const a = answer.toLowerCase().trim();
        if (g === a) return 'correct';
        if (a.length >= 5 && levenshteinDistance(g, a) === 1) return 'close';
        return 'wrong';
    },

    /**
     * Format word as blanks for display (guessers see _ _ _)
     * Preserves spaces in multi-word answers.
     */
    formatBlanks(word) {
        if (!word) return '';
        return word.split('').map(ch => ch === ' ' ? '  ' : '_').join(' ');
    },

    /**
     * Format word revealed (D O G)
     */
    formatRevealed(word) {
        if (!word) return '';
        return word.toUpperCase().split('').join(' ');
    },
};

// ----------------------------------------------------------------
// LEVENSHTEIN DISTANCE (used for "close guess" detection)
// ----------------------------------------------------------------
function levenshteinDistance(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => {
        const row = new Array(n + 1).fill(0);
        row[0] = i;
        return row;
    });
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
    }
    return dp[m][n];
}

// ----------------------------------------------------------------
// BACKWARDS COMPATIBILITY (old code used these globals)
// ----------------------------------------------------------------
function getRandomWords(count) { return WordBank.getRandomWords(count || 3); }
function getRandomWord()       { return WordBank.getRandomWord(); }

// ----------------------------------------------------------------
// STARTUP LOG
// ----------------------------------------------------------------
console.log(`📚 WordBank loaded: ${WordBank.getWordCount()} words | ${WordBank.getCategories().length} categories`);
console.log(`   Easy: ${WordBank.getEasyWords().length} | Medium: ${WordBank.getMediumWords().length} | Hard: ${WordBank.getHardWords().length}`);
