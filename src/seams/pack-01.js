/*
 * Lootle safe bank, pack 1.
 *
 * Every seam is a closed set: the bank lists every answer we accept.
 * Tiers run 1 (Quartz, the answer most people reach for first) to
 * 6 (Diamond, the one almost nobody thinks of). Tiers are curated by hand,
 * not measured from player data.
 *
 * Answer format: [canonical name, tier, ...aliases]
 */
export const PACK = [
    {
      id: "germany-borders", cat: "Geography",
      prompt: "Name a country that shares a land border with Germany.",
      answers: [
        ["France", 1], ["Poland", 1], ["Austria", 2], ["Netherlands", 2, "holland"],
        ["Switzerland", 2], ["Belgium", 4], ["Denmark", 4],
        ["Czechia", 5, "czech republic"], ["Luxembourg", 6],
      ],
    },
    {
      id: "one-letter-elements", cat: "Science",
      prompt: "Name a chemical element whose symbol is a single letter.",
      answers: [
        ["Hydrogen", 1], ["Oxygen", 1], ["Carbon", 1], ["Nitrogen", 2],
        ["Sulfur", 3, "sulphur"], ["Potassium", 3], ["Fluorine", 3],
        ["Phosphorus", 4], ["Iodine", 4], ["Uranium", 4], ["Boron", 5],
        ["Tungsten", 5, "wolfram"], ["Vanadium", 6], ["Yttrium", 6],
      ],
    },
    {
      id: "m-states", cat: "Geography",
      prompt: "Name a US state that begins with the letter M.",
      answers: [
        ["Michigan", 1], ["Massachusetts", 2], ["Minnesota", 2], ["Mississippi", 2],
        ["Maine", 3], ["Maryland", 4], ["Montana", 5], ["Missouri", 6],
      ],
    },
    {
      id: "noble-gases", cat: "Science",
      prompt: "Name a noble gas.",
      answers: [
        ["Helium", 1], ["Neon", 1], ["Argon", 2], ["Xenon", 3], ["Krypton", 3],
        ["Radon", 4], ["Oganesson", 6],
      ],
    },
    {
      id: "equator", cat: "Geography",
      prompt: "Name a country the equator passes through (territorial waters count).",
      answers: [
        ["Ecuador", 1], ["Brazil", 1], ["Kenya", 2], ["Indonesia", 2],
        ["Colombia", 3], ["Uganda", 3],
        ["DR Congo", 3, "democratic republic of the congo", "democratic republic of congo", "drc", "congo", "congo kinshasa"],
        ["Somalia", 4], ["Gabon", 4],
        ["Republic of the Congo", 5, "republic of congo", "congo brazzaville"],
        ["Maldives", 5],
        ["São Tomé and Príncipe", 6, "sao tome", "sao tome & principe"],
        ["Kiribati", 6],
      ],
    },
    {
      id: "south-america", cat: "Geography",
      prompt: "Name a sovereign country in South America.",
      answers: [
        ["Brazil", 1], ["Argentina", 1], ["Chile", 2], ["Peru", 2], ["Colombia", 2],
        ["Venezuela", 3], ["Ecuador", 3], ["Bolivia", 3], ["Uruguay", 4],
        ["Paraguay", 4], ["Guyana", 5], ["Suriname", 6, "surinam"],
      ],
    },
    {
      id: "four-letter-countries", cat: "Geography",
      prompt: "Name a UN member country whose common English name has exactly four letters.",
      answers: [
        ["Cuba", 1], ["Peru", 1], ["Iran", 2], ["Iraq", 2], ["Fiji", 3], ["Chad", 3],
        ["Mali", 4], ["Laos", 4], ["Oman", 5], ["Togo", 6],
      ],
    },
    {
      id: "zodiac", cat: "Culture",
      prompt: "Name a sign of the Western zodiac.",
      answers: [
        ["Leo", 1], ["Scorpio", 1], ["Gemini", 2], ["Aries", 2], ["Taurus", 2],
        ["Virgo", 3], ["Pisces", 3], ["Cancer", 3], ["Sagittarius", 4],
        ["Aquarius", 4], ["Libra", 5], ["Capricorn", 6],
      ],
    },
    {
      id: "summer-olympics", cat: "Sport",
      prompt: "Name a city that hosted the Summer Olympics between 1980 and 2024.",
      answers: [
        ["London", 1], ["Paris", 1], ["Tokyo", 1], ["Beijing", 2, "peking"],
        ["Rio de Janeiro", 2, "rio"], ["Los Angeles", 2, "la"], ["Sydney", 3],
        ["Athens", 3], ["Barcelona", 3], ["Atlanta", 4], ["Moscow", 5], ["Seoul", 6],
      ],
    },
    {
      id: "ancient-wonders", cat: "History",
      prompt: "Name one of the Seven Wonders of the Ancient World.",
      answers: [
        ["Great Pyramid of Giza", 1, "great pyramid", "pyramids", "pyramid of giza", "pyramids of giza", "giza", "pyramid of khufu"],
        ["Hanging Gardens of Babylon", 2, "hanging gardens", "gardens of babylon"],
        ["Colossus of Rhodes", 3, "colossus"],
        ["Lighthouse of Alexandria", 3, "pharos", "pharos of alexandria", "lighthouse"],
        ["Statue of Zeus at Olympia", 4, "statue of zeus", "zeus"],
        ["Temple of Artemis at Ephesus", 5, "temple of artemis", "artemis", "temple of diana"],
        ["Mausoleum at Halicarnassus", 6, "mausoleum", "mausoleum of halicarnassus", "halicarnassus", "tomb of mausolus"],
      ],
    },
    {
      id: "greek-letters", cat: "Language",
      prompt: "Name a letter of the Greek alphabet.",
      answers: [
        ["Alpha", 1], ["Beta", 1], ["Omega", 1], ["Gamma", 2], ["Delta", 2], ["Pi", 2],
        ["Sigma", 2], ["Theta", 3], ["Lambda", 3], ["Epsilon", 3], ["Mu", 3], ["Phi", 3],
        ["Zeta", 4], ["Kappa", 4], ["Rho", 4], ["Tau", 4], ["Psi", 4], ["Omicron", 4],
        ["Eta", 5], ["Iota", 5], ["Chi", 5], ["Nu", 6], ["Xi", 6], ["Upsilon", 6],
      ],
    },
    {
      id: "canada-border-states", cat: "Geography",
      prompt: "Name a US state that borders Canada (lake borders count).",
      answers: [
        ["New York", 1], ["Washington", 1], ["Alaska", 2], ["Michigan", 2], ["Maine", 2],
        ["Montana", 3], ["Minnesota", 3], ["Vermont", 3], ["North Dakota", 4],
        ["Idaho", 4], ["New Hampshire", 5], ["Ohio", 6], ["Pennsylvania", 6],
      ],
    },
    {
      id: "china-borders", cat: "Geography",
      prompt: "Name a country that shares a land border with China.",
      answers: [
        ["Russia", 1], ["India", 1], ["Mongolia", 2], ["North Korea", 2, "dprk"],
        ["Vietnam", 2], ["Nepal", 3], ["Pakistan", 3], ["Kazakhstan", 3],
        ["Myanmar", 4, "burma"], ["Afghanistan", 4], ["Laos", 4], ["Bhutan", 5],
        ["Kyrgyzstan", 5], ["Tajikistan", 6],
      ],
    },
    {
      id: "brazil-borders", cat: "Geography",
      prompt: "Name a country that shares a land border with Brazil.",
      answers: [
        ["Argentina", 1], ["Colombia", 2], ["Peru", 2], ["Venezuela", 2], ["Bolivia", 3],
        ["Uruguay", 3], ["Paraguay", 3], ["Guyana", 4], ["Suriname", 5, "surinam"],
        ["France", 6, "french guiana"],
      ],
      note: "France borders Brazil through French Guiana.",
    },
    {
      id: "alkali-metals", cat: "Science",
      prompt: "Name an alkali metal.",
      answers: [
        ["Sodium", 1], ["Lithium", 1], ["Potassium", 2], ["Caesium", 4, "cesium"],
        ["Rubidium", 5], ["Francium", 6],
      ],
    },
    {
      id: "central-america", cat: "Geography",
      prompt: "Name one of the seven countries of Central America.",
      answers: [
        ["Costa Rica", 1], ["Panama", 1], ["Guatemala", 2], ["Honduras", 3],
        ["Nicaragua", 3], ["El Salvador", 4, "salvador"], ["Belize", 6],
      ],
    },
    {
      id: "stans", cat: "Geography",
      prompt: "Name a country whose English name ends in “-stan”.",
      answers: [
        ["Pakistan", 1], ["Afghanistan", 1], ["Kazakhstan", 2], ["Uzbekistan", 3],
        ["Turkmenistan", 4], ["Kyrgyzstan", 5], ["Tajikistan", 6],
      ],
    },
    {
      id: "b-capitals", cat: "Geography",
      prompt: "Name a European capital city that begins with the letter B.",
      answers: [
        ["Berlin", 1], ["Brussels", 2], ["Budapest", 2], ["Bucharest", 3],
        ["Belgrade", 4], ["Bern", 4, "berne"], ["Bratislava", 5], ["Baku", 6],
      ],
      note: "Baku sits on the Europe–Asia boundary, so we count it.",
    },
    {
      id: "mohs", cat: "Earth",
      prompt: "Name one of the ten reference minerals on the Mohs hardness scale.",
      answers: [
        ["Diamond", 1], ["Quartz", 2], ["Talc", 2], ["Topaz", 3], ["Gypsum", 4],
        ["Calcite", 4], ["Corundum", 5], ["Fluorite", 5, "fluorspar"], ["Apatite", 6],
        ["Orthoclase", 6, "feldspar", "orthoclase feldspar"],
      ],
    },
    {
      id: "si-units", cat: "Science",
      prompt: "Name one of the seven SI base units.",
      answers: [
        ["Metre", 1, "meter", "metres", "meters"],
        ["Kilogram", 1, "kilogramme", "kg", "kilograms", "kilo"],
        ["Second", 1, "seconds"], ["Kelvin", 3], ["Ampere", 3, "amp", "amps", "amperes"],
        ["Mole", 4, "mol", "moles"], ["Candela", 6],
      ],
    },
    {
      id: "canada-provinces", cat: "Geography",
      prompt: "Name a Canadian province or territory.",
      answers: [
        ["Ontario", 1], ["Quebec", 1], ["British Columbia", 1, "bc"], ["Alberta", 2],
        ["Nova Scotia", 3], ["Manitoba", 3], ["Saskatchewan", 3],
        ["Newfoundland and Labrador", 4, "newfoundland", "labrador", "newfoundland & labrador"],
        ["Yukon", 4], ["New Brunswick", 5], ["Prince Edward Island", 5, "pei"],
        ["Northwest Territories", 5, "nwt"], ["Nunavut", 6],
      ],
    },
    {
      id: "australian-capitals", cat: "Geography",
      prompt: "Name the capital city of an Australian state or territory.",
      answers: [
        ["Sydney", 1], ["Melbourne", 1], ["Canberra", 2], ["Brisbane", 2], ["Perth", 2],
        ["Adelaide", 3], ["Darwin", 4], ["Hobart", 6],
      ],
    },
    {
      id: "austen", cat: "Literature",
      prompt: "Name one of Jane Austen’s six completed novels.",
      answers: [
        ["Pride and Prejudice", 1, "pride & prejudice"], ["Emma", 2],
        ["Sense and Sensibility", 2, "sense & sensibility"], ["Persuasion", 4],
        ["Mansfield Park", 5], ["Northanger Abbey", 6],
      ],
    },
    {
      id: "caspian", cat: "Geography",
      prompt: "Name a country with a coastline on the Caspian Sea.",
      answers: [
        ["Russia", 1], ["Iran", 2], ["Kazakhstan", 3], ["Azerbaijan", 4],
        ["Turkmenistan", 6],
      ],
    },
    {
      id: "osi", cat: "Computing",
      prompt: "Name a layer of the OSI networking model.",
      answers: [
        ["Application", 1], ["Network", 1], ["Physical", 2], ["Transport", 2],
        ["Data Link", 3, "datalink", "link"], ["Session", 5], ["Presentation", 6],
      ],
    },
    {
      id: "danube", cat: "Geography",
      prompt: "Name a country the River Danube flows through or along.",
      answers: [
        ["Germany", 1], ["Austria", 1], ["Hungary", 1], ["Romania", 2], ["Serbia", 3],
        ["Slovakia", 3], ["Bulgaria", 4], ["Croatia", 4], ["Ukraine", 5], ["Moldova", 6],
      ],
    },
    {
      id: "landlocked-africa", cat: "Geography",
      prompt: "Name a landlocked country in Africa.",
      answers: [
        ["Uganda", 1], ["Zimbabwe", 1], ["Ethiopia", 2], ["Zambia", 2], ["Chad", 2],
        ["Mali", 2], ["Rwanda", 2], ["Botswana", 2], ["Niger", 3], ["Malawi", 3],
        ["South Sudan", 3], ["Burundi", 4], ["Lesotho", 4], ["Burkina Faso", 4],
        ["Central African Republic", 5, "car"], ["Eswatini", 6, "swaziland"],
      ],
    },
    {
      id: "i-countries", cat: "Geography",
      prompt: "Name a country whose English name begins with the letter I.",
      answers: [
        ["India", 1], ["Italy", 1], ["Ireland", 1], ["Iran", 2], ["Iraq", 2],
        ["Israel", 2], ["Iceland", 3], ["Indonesia", 3],
        ["Ivory Coast", 6, "cote d ivoire", "cote divoire"],
      ],
      note: "Officially Côte d’Ivoire, but Ivory Coast is still its common English name.",
    },
    {
      id: "atmosphere", cat: "Earth",
      prompt: "Name one of the five main layers of Earth’s atmosphere.",
      answers: [
        ["Stratosphere", 1], ["Troposphere", 2], ["Mesosphere", 3], ["Thermosphere", 4],
        ["Exosphere", 6],
      ],
    },
    {
      id: "logic-gates", cat: "Computing",
      prompt: "Name a standard logic gate.",
      answers: [
        ["AND", 1], ["OR", 1], ["NOT", 1, "inverter"], ["XOR", 2, "exclusive or"],
        ["NAND", 3], ["NOR", 3], ["XNOR", 5, "exclusive nor"], ["Buffer", 6],
      ],
    },
    {
      id: "nobel", cat: "Culture",
      prompt: "Name a category in which a Nobel Prize is awarded.",
      answers: [
        ["Peace", 1], ["Literature", 1], ["Physics", 2], ["Chemistry", 2],
        ["Medicine", 2, "physiology or medicine", "physiology", "physiology and medicine"],
        ["Economics", 6, "economic sciences", "economy"],
      ],
      note: "Economics is technically a memorial prize added in 1968, which is why it is the deep one.",
    },
    {
      id: "un-languages", cat: "Language",
      prompt: "Name one of the six official languages of the United Nations.",
      answers: [
        ["English", 1], ["French", 1], ["Spanish", 2],
        ["Chinese", 2, "mandarin", "mandarin chinese"], ["Russian", 4], ["Arabic", 6],
      ],
    },
    {
      id: "henry-wives", cat: "History",
      prompt: "Name one of Henry VIII’s six wives (first name and surname or title).",
      answers: [
        ["Anne Boleyn", 1, "ann boleyn", "boleyn"],
        ["Catherine of Aragon", 1, "katherine of aragon", "katharine of aragon", "catherine aragon", "aragon"],
        ["Jane Seymour", 3, "seymour"],
        ["Catherine Howard", 4, "katherine howard", "kathryn howard", "howard"],
        ["Anne of Cleves", 4, "ann of cleves", "anne cleves", "cleves"],
        ["Catherine Parr", 6, "katherine parr", "kateryn parr", "parr"],
      ],
    },
    {
      id: "taxonomy", cat: "Science",
      prompt: "Name one of the eight main ranks used to classify living things.",
      answers: [
        ["Species", 1], ["Kingdom", 1], ["Genus", 2], ["Family", 2], ["Order", 3],
        ["Class", 3], ["Phylum", 4, "division"], ["Domain", 6],
      ],
    },
    {
      id: "great-lakes", cat: "Geography",
      prompt: "Name one of the five Great Lakes of North America.",
      answers: [
        ["Superior", 1, "lake superior"], ["Michigan", 1, "lake michigan"],
        ["Erie", 2, "lake erie"], ["Huron", 4, "lake huron"],
        ["Ontario", 6, "lake ontario"],
      ],
    },
  ];

