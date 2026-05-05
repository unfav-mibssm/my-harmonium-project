// ==========================================
// WORD BANK FOR SKRIBBL.IO — 500+ words
// ==========================================

const wordBank = [
    // ANIMALS
    'cat','dog','elephant','giraffe','lion','tiger','bear','wolf','fox','rabbit',
    'mouse','rat','hamster','squirrel','deer','moose','zebra','horse','cow','pig',
    'sheep','goat','chicken','duck','goose','turkey','penguin','seal','walrus','dolphin',
    'whale','shark','octopus','squid','jellyfish','starfish','crab','lobster','shrimp','snail',
    'butterfly','bee','wasp','ant','spider','scorpion','snake','lizard','crocodile','alligator',
    'frog','toad','turtle','tortoise','chameleon','iguana','koala','kangaroo','panda','polar bear',

    // FOOD & DRINKS
    'apple','banana','orange','grape','strawberry','blueberry','raspberry','watermelon','melon','pineapple',
    'mango','peach','pear','plum','cherry','lemon','lime','coconut','kiwi','pomegranate',
    'carrot','potato','tomato','cucumber','lettuce','cabbage','broccoli','cauliflower','spinach','onion',
    'garlic','pepper','corn','peas','beans','rice','bread','pizza','burger','sandwich',
    'hot dog','taco','burrito','sushi','pasta','noodles','spaghetti','steak','chicken','fish',
    'egg','cheese','butter','milk','yogurt','ice cream','cake','cookie','donut','chocolate',

    // OBJECTS
    'book','phone','computer','laptop','tablet','keyboard','mouse','monitor','television','remote',
    'camera','watch','clock','alarm','lamp','light','fan','air conditioner','heater','refrigerator',
    'oven','microwave','toaster','blender','mixer','kettle','pot','pan','plate','bowl',
    'cup','glass','bottle','fork','knife','spoon','chopsticks','napkin','tablecloth','chair',
    'table','desk','bed','couch','sofa','pillow','blanket','sheet','towel','curtain',
    'carpet','rug','mirror','picture','painting','vase','flower','plant','tree','bush',

    // PLACES
    'house','apartment','building','skyscraper','castle','palace','temple','church','mosque','synagogue',
    'school','university','hospital','library','museum','theater','cinema','restaurant','cafe','bar',
    'hotel','motel','store','shop','mall','supermarket','market','park','garden','forest',
    'beach','desert','mountain','hill','valley','river','lake','ocean','sea','island',
    'bridge','tunnel','road','street','highway','path','sidewalk','driveway','parking lot','garage',
    'yard','porch','balcony','terrace','roof','attic','basement','kitchen','bedroom','bathroom',

    // NATURE & WEATHER
    'sun','moon','star','planet','earth','mars','jupiter','saturn','comet','asteroid',
    'cloud','rain','snow','wind','storm','thunder','lightning','tornado','hurricane','flood',
    'fire','flame','smoke','fog','mist','rainbow','sunrise','sunset','eclipse','tide',
    'wave','volcano','earthquake','avalanche','landslide','tsunami','drought','blizzard','hail','frost',

    // ACTIVITIES
    'reading','writing','drawing','painting','singing','dancing','swimming','running','walking','jumping',
    'flying','driving','riding','cooking','baking','eating','drinking','sleeping','dreaming','thinking',
    'talking','listening','watching','looking','seeing','hearing','smelling','tasting','touching','feeling',
    'playing','working','studying','learning','teaching','helping','giving','taking','buying','selling',
    'building','making','creating','destroying','fixing','breaking','cleaning','washing','brushing','combing',
    'laughing','crying','smiling','frowning','shouting','whispering','calling','texting','emailing','posting',

    // SPORTS
    'soccer','basketball','tennis','baseball','football','golf','hockey','volleyball','badminton','cricket',
    'rugby','boxing','wrestling','swimming','diving','surfing','skating','skiing','snowboarding','cycling',
    'running','jogging','hiking','climbing','yoga','gymnastics','cheerleading','dancing','fencing','archery',
    'bowling','billiards','darts','chess','checkers','poker','marathon','sprint','relay','tournament',

    // PROFESSIONS
    'doctor','nurse','teacher','student','engineer','scientist','artist','musician','actor','actress',
    'chef','waiter','driver','pilot','captain','police','firefighter','soldier','lawyer','judge',
    'farmer','fisherman','hunter','builder','carpenter','plumber','electrician','mechanic','barber','tailor',
    'painter','sculptor','writer','poet','journalist','photographer','designer','programmer','manager','boss',

    // TRANSPORT
    'car','truck','bus','van','motorcycle','bicycle','scooter','skateboard','train','subway',
    'tram','trolley','taxi','ambulance','fire truck','police car','tractor','bulldozer','crane','forklift',
    'boat','ship','yacht','submarine','helicopter','airplane','jet','rocket','spaceship','ufo',

    // CLOTHING
    'shirt','pants','jeans','shorts','skirt','dress','suit','jacket','coat','sweater',
    'hoodie','t-shirt','blouse','sock','shoe','boot','sandal','slipper','hat','cap',
    'helmet','scarf','glove','mitten','tie','belt','button','zipper','pocket','collar',

    // BODY PARTS
    'head','face','eye','nose','mouth','ear','hair','neck','shoulder','arm',
    'elbow','wrist','hand','finger','thumb','chest','back','stomach','waist','hip',
    'leg','knee','ankle','foot','toe',

    // EMOTIONS
    'happy','sad','angry','afraid','surprised','confused','bored','excited','tired','sleepy',
    'hungry','thirsty','hot','cold','sick','healthy','love','hate','jealous','proud',

    // FANTASY
    'dragon','unicorn','phoenix','griffin','mermaid','fairy','elf','dwarf','goblin','orc',
    'vampire','werewolf','zombie','ghost','skeleton','witch','wizard','magician','knight','princess',
    'castle','tower','dungeon','treasure','cursed',

    // TECH
    'robot','android','cyborg','alien','spaceship','laser','hologram','virtual reality','artificial intelligence','internet',
    'website','app','game','console','controller','drone','satellite','gps','wifi','bluetooth',
    'password','email','virus','hacker','database',
];

// ==========================================
// WORD BANK UTILITIES
// ==========================================

const WordBank = {
    getRandomWords(count = 3) {
        return [...wordBank].sort(() => Math.random() - .5).slice(0, count);
    },

    getRandomWord() {
        return wordBank[Math.floor(Math.random() * wordBank.length)];
    },

    getWordCount() { return wordBank.length; },

    hasWord(word) { return wordBank.includes(word.toLowerCase().trim()); },

    getEasyWords()   { return wordBank.filter(w => w.length <= 4 && !w.includes(' ')); },
    getMediumWords() { return wordBank.filter(w => w.length > 4 && w.length <= 8 && !w.includes(' ')); },
    getHardWords()   { return wordBank.filter(w => w.length > 8 || w.includes(' ')); },

    getRandomByDifficulty(difficulty) {
        const pools = { easy: this.getEasyWords(), medium: this.getMediumWords(), hard: this.getHardWords() };
        const pool  = pools[difficulty] || wordBank;
        return pool[Math.floor(Math.random() * pool.length)];
    },

    getWordOptions() {
        return [
            { word: this.getRandomByDifficulty('easy'),   difficulty:'Easy',   points:1 },
            { word: this.getRandomByDifficulty('medium'), difficulty:'Medium', points:2 },
            { word: this.getRandomByDifficulty('hard'),   difficulty:'Hard',   points:3 },
        ];
    },
};

// Backwards compat
function getRandomWords(count = 3) { return WordBank.getRandomWords(count); }
function getRandomWord()            { return WordBank.getRandomWord(); }

console.log(`📚 WordBank: ${WordBank.getWordCount()} words`);
