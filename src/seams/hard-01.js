/*
 * Lootle hard safes, pack 1.
 *
 * Specialist lists that most people cannot answer cold. One closes each job,
 * so this is where shop items earn their keep.
 * Format: [canonical name, tier 1 to 6, ...other accepted spellings].
 */
export const PACK = [
  {
    id: "uranus-moons", cat: "Space",
    prompt: "Name one of the 27 named moons of Uranus.",
    answers: [
      ["Titania", 1], ["Oberon", 1], ["Miranda", 1], ["Ariel", 2], ["Umbriel", 2], ["Puck", 2],
      ["Juliet", 3], ["Ophelia", 3], ["Desdemona", 3], ["Cordelia", 3], ["Portia", 3],
      ["Prospero", 4], ["Caliban", 4], ["Cressida", 4], ["Rosalind", 4], ["Bianca", 4],
      ["Belinda", 5], ["Cupid", 5], ["Perdita", 5], ["Mab", 5], ["Sycorax", 5], ["Ferdinand", 5],
      ["Francisco", 6], ["Stephano", 6], ["Trinculo", 6], ["Margaret", 6], ["Setebos", 6],
    ],
  },
  {
    id: "early-emperors", cat: "History",
    prompt: "Name a Roman emperor from Augustus to Commodus.",
    answers: [
      ["Augustus", 1, "octavian"], ["Nero", 1], ["Caligula", 1], ["Hadrian", 2],
      ["Marcus Aurelius", 2], ["Claudius", 2], ["Tiberius", 2], ["Trajan", 3], ["Vespasian", 3],
      ["Commodus", 3], ["Titus", 3], ["Domitian", 4], ["Nerva", 4],
      ["Antoninus Pius", 5, "antoninus"], ["Galba", 5], ["Otho", 6], ["Vitellius", 6],
      ["Lucius Verus", 6, "verus"],
    ],
  },
  {
    id: "lanthanides", cat: "Science",
    prompt: "Name one of the 15 lanthanide elements.",
    answers: [
      ["Lanthanum", 1], ["Neodymium", 1], ["Cerium", 2], ["Europium", 2], ["Gadolinium", 3],
      ["Ytterbium", 3], ["Samarium", 3], ["Erbium", 4], ["Terbium", 4], ["Promethium", 4],
      ["Dysprosium", 5], ["Holmium", 5], ["Lutetium", 5], ["Praseodymium", 6], ["Thulium", 6],
    ],
  },
  {
    id: "amino-acids", cat: "Science",
    prompt: "Name one of the 20 standard amino acids found in proteins.",
    answers: [
      ["Glycine", 1], ["Lysine", 1], ["Tryptophan", 1], ["Leucine", 2], ["Glutamine", 2],
      ["Tyrosine", 2], ["Alanine", 2], ["Arginine", 3], ["Cysteine", 3], ["Valine", 3],
      ["Proline", 3], ["Serine", 3], ["Histidine", 4], ["Methionine", 4], ["Phenylalanine", 4],
      ["Glutamic Acid", 4, "glutamate"], ["Isoleucine", 5], ["Threonine", 5],
      ["Aspartic Acid", 5, "aspartate"], ["Asparagine", 6],
    ],
  },
  {
    id: "cranial-nerves", cat: "Body",
    prompt: "Name one of the 12 cranial nerves.",
    answers: [
      ["Optic", 1], ["Olfactory", 1], ["Vagus", 2], ["Facial", 2], ["Trigeminal", 3],
      ["Oculomotor", 3], ["Vestibulocochlear", 4, "auditory", "acoustic"], ["Hypoglossal", 4],
      ["Accessory", 5, "spinal accessory"], ["Glossopharyngeal", 5], ["Trochlear", 5],
      ["Abducens", 6, "abducent"],
    ],
  },
  {
    id: "carpal-bones", cat: "Body",
    prompt: "Name one of the eight carpal bones of the wrist.",
    answers: [
      ["Scaphoid", 1], ["Lunate", 2], ["Hamate", 3], ["Pisiform", 3], ["Capitate", 4],
      ["Trapezium", 4], ["Trapezoid", 5], ["Triquetrum", 6, "triquetral"],
    ],
  },
  {
    id: "swiss-cantons", cat: "Geography",
    prompt: "Name a canton of Switzerland.",
    answers: [
      ["Zurich", 1], ["Geneva", 1], ["Bern", 1, "berne"], ["Lucerne", 2, "luzern"],
      ["Basel-Stadt", 2, "basel", "basel city"], ["Ticino", 2], ["Valais", 2, "wallis"],
      ["Vaud", 3], ["Fribourg", 3, "freiburg"], ["St. Gallen", 3, "saint gallen", "st gall"],
      ["Graubunden", 3, "grisons"], ["Neuchatel", 3], ["Zug", 4], ["Schwyz", 4], ["Uri", 4],
      ["Jura", 4], ["Aargau", 4], ["Thurgau", 4], ["Solothurn", 5], ["Schaffhausen", 5],
      ["Glarus", 5], ["Basel-Landschaft", 5, "basel country", "baselland"], ["Obwalden", 6],
      ["Nidwalden", 6], ["Appenzell Ausserrhoden", 6, "appenzell", "appenzell outer rhodes"],
      ["Appenzell Innerrhoden", 6, "appenzell inner rhodes"],
    ],
  },
  {
    id: "mexico-states", cat: "Geography",
    prompt: "Name one of the 31 states of Mexico.",
    answers: [
      ["Chihuahua", 1], ["Yucatan", 1], ["Oaxaca", 1], ["Baja California", 1], ["Sonora", 2],
      ["Jalisco", 2], ["Sinaloa", 2], ["Veracruz", 2], ["Chiapas", 2], ["Quintana Roo", 3],
      ["Puebla", 3], ["Guanajuato", 3], ["Durango", 3], ["Tabasco", 3],
      ["Mexico", 3, "state of mexico", "estado de mexico"], ["Nuevo Leon", 4], ["Coahuila", 4],
      ["Michoacan", 4], ["Guerrero", 4], ["Baja California Sur", 4], ["Zacatecas", 4],
      ["Tamaulipas", 4], ["Campeche", 5], ["San Luis Potosi", 5], ["Queretaro", 5], ["Hidalgo", 5],
      ["Morelos", 5], ["Aguascalientes", 6], ["Colima", 6], ["Nayarit", 6], ["Tlaxcala", 6],
    ],
  },
  {
    id: "japan-prefectures", cat: "Geography",
    prompt: "Name a prefecture of Japan.",
    answers: [
      ["Tokyo", 1], ["Osaka", 1], ["Kyoto", 1], ["Hokkaido", 1], ["Okinawa", 1], ["Hiroshima", 2],
      ["Nagasaki", 2], ["Fukushima", 2], ["Nagano", 2], ["Fukuoka", 2], ["Nara", 2],
      ["Kanagawa", 3], ["Chiba", 3], ["Saitama", 3], ["Aichi", 3], ["Hyogo", 3], ["Niigata", 3],
      ["Shizuoka", 3], ["Kagoshima", 3], ["Kumamoto", 3], ["Aomori", 4], ["Miyagi", 4],
      ["Akita", 4], ["Ishikawa", 4], ["Gifu", 4], ["Okayama", 4], ["Yamaguchi", 4], ["Kochi", 4],
      ["Ehime", 4], ["Miyazaki", 4], ["Ibaraki", 4], ["Iwate", 5], ["Yamagata", 5], ["Tochigi", 5],
      ["Gunma", 5], ["Toyama", 5], ["Fukui", 5], ["Yamanashi", 5], ["Mie", 5], ["Shiga", 5],
      ["Wakayama", 5], ["Oita", 5], ["Saga", 5], ["Tottori", 6], ["Shimane", 6], ["Tokushima", 6],
      ["Kagawa", 6],
    ],
  },
  {
    id: "india-states", cat: "Geography",
    prompt: "Name one of the 28 states of India.",
    answers: [
      ["Goa", 1], ["Punjab", 1], ["Kerala", 1], ["Gujarat", 2], ["Rajasthan", 2], ["Tamil Nadu", 2],
      ["Maharashtra", 2], ["West Bengal", 2], ["Uttar Pradesh", 3], ["Bihar", 3], ["Assam", 3],
      ["Karnataka", 3], ["Andhra Pradesh", 3], ["Madhya Pradesh", 4], ["Haryana", 4],
      ["Himachal Pradesh", 4], ["Odisha", 4, "orissa"], ["Sikkim", 4], ["Telangana", 4],
      ["Jharkhand", 5], ["Uttarakhand", 5], ["Chhattisgarh", 5], ["Nagaland", 5], ["Manipur", 5],
      ["Arunachal Pradesh", 6], ["Meghalaya", 6], ["Mizoram", 6], ["Tripura", 6],
    ],
  },
  {
    id: "brazil-states", cat: "Geography",
    prompt: "Name a state of Brazil, counting the Federal District.",
    answers: [
      ["Rio de Janeiro", 1, "rio"], ["Sao Paulo", 1], ["Amazonas", 1], ["Bahia", 2],
      ["Minas Gerais", 2], ["Para", 2], ["Parana", 2], ["Mato Grosso", 3], ["Rio Grande do Sul", 3],
      ["Santa Catarina", 3], ["Pernambuco", 3], ["Ceara", 3], ["Goias", 4],
      ["Federal District", 4, "distrito federal", "brasilia"], ["Espirito Santo", 4],
      ["Mato Grosso do Sul", 4], ["Maranhao", 4], ["Rio Grande do Norte", 5], ["Acre", 5],
      ["Amapa", 5], ["Roraima", 5], ["Rondonia", 5], ["Paraiba", 5], ["Alagoas", 6], ["Piaui", 6],
      ["Sergipe", 6], ["Tocantins", 6],
    ],
  },
  {
    id: "dickens-novels", cat: "Literature",
    prompt: "Name a novel by Charles Dickens, counting A Christmas Carol.",
    answers: [
      ["Oliver Twist", 1], ["A Christmas Carol", 1], ["Great Expectations", 1],
      ["David Copperfield", 2], ["A Tale of Two Cities", 2], ["Bleak House", 3], ["Hard Times", 3],
      ["The Pickwick Papers", 3, "pickwick papers", "pickwick"], ["Nicholas Nickleby", 4],
      ["Little Dorrit", 4], ["The Old Curiosity Shop", 4], ["Our Mutual Friend", 5],
      ["Dombey and Son", 5], ["Martin Chuzzlewit", 5], ["Barnaby Rudge", 6],
      ["The Mystery of Edwin Drood", 6, "edwin drood"],
    ],
  },
  {
    id: "puccini-operas", cat: "Music",
    prompt: "Name an opera by Puccini.",
    answers: [
      ["Madama Butterfly", 1, "madame butterfly", "butterfly"], ["La Boheme", 1, "boheme"],
      ["Tosca", 2], ["Turandot", 2], ["Gianni Schicchi", 3], ["Manon Lescaut", 3],
      ["La Fanciulla del West", 4, "fanciulla del west", "girl of the golden west"],
      ["Il Trittico", 4, "trittico"], ["La Rondine", 5, "rondine"], ["Il Tabarro", 5, "tabarro"],
      ["Suor Angelica", 5], ["Edgar", 6], ["Le Villi", 6, "villi"],
    ],
  },
  {
    id: "nine-muses", cat: "Myth",
    prompt: "Name one of the nine Muses of Greek myth.",
    answers: [
      ["Calliope", 1], ["Clio", 2], ["Urania", 2], ["Thalia", 3], ["Erato", 3], ["Terpsichore", 4],
      ["Euterpe", 5], ["Melpomene", 5], ["Polyhymnia", 6, "polymnia"],
    ],
  },
  {
    id: "si-prefixes", cat: "Science",
    prompt: "Name an SI prefix, such as kilo.",
    answers: [
      ["Kilo", 1], ["Mega", 1], ["Giga", 1], ["Milli", 1], ["Centi", 1], ["Micro", 2], ["Nano", 2],
      ["Tera", 2], ["Deci", 3], ["Pico", 3], ["Peta", 3], ["Hecto", 3], ["Deca", 4, "deka"],
      ["Femto", 4], ["Exa", 4], ["Zetta", 4], ["Yotta", 4], ["Atto", 5], ["Zepto", 5], ["Yocto", 5],
      ["Ronna", 6], ["Quetta", 6], ["Ronto", 6], ["Quecto", 6],
    ],
  },
  {
    id: "winter-olympics", cat: "Sport",
    prompt: "Name a city that has hosted the Winter Olympics, up to 2026.",
    answers: [
      ["Vancouver", 1], ["Salt Lake City", 1], ["Beijing", 1, "peking"], ["Sochi", 2],
      ["Calgary", 2], ["Turin", 2, "torino"], ["Pyeongchang", 2, "pyeong chang"],
      ["Lake Placid", 2], ["Nagano", 3], ["Lillehammer", 3], ["Innsbruck", 3], ["Oslo", 3],
      ["Sarajevo", 3], ["Milan", 3, "milano", "milan cortina"], ["Chamonix", 4],
      ["St. Moritz", 4, "saint moritz", "st moritz"], ["Albertville", 4], ["Sapporo", 4],
      ["Cortina d'Ampezzo", 5, "cortina"], ["Grenoble", 5],
      ["Garmisch-Partenkirchen", 5, "garmisch"], ["Squaw Valley", 6, "palisades tahoe"],
    ],
  },
  {
    id: "chief-justices", cat: "History",
    prompt: "Name a Chief Justice of the United States.",
    answers: [
      ["John Roberts", 1, "roberts"], ["John Marshall", 2, "marshall"],
      ["Earl Warren", 2, "warren"], ["William Howard Taft", 2, "taft"],
      ["William Rehnquist", 3, "rehnquist"], ["Warren Burger", 3, "burger"], ["John Jay", 3, "jay"],
      ["Roger Taney", 4, "taney"], ["Charles Evans Hughes", 4, "hughes"],
      ["Salmon P. Chase", 5, "chase", "salmon chase"],
      ["Harlan F. Stone", 5, "stone", "harlan stone"], ["Fred Vinson", 5, "vinson"],
      ["Oliver Ellsworth", 5, "ellsworth"], ["John Rutledge", 6, "rutledge"],
      ["Morrison Waite", 6, "waite"], ["Melville Fuller", 6, "fuller"],
      ["Edward Douglass White", 6, "white", "edward white"],
    ],
  },
  {
    id: "eight-thousanders", cat: "Geography",
    prompt: "Name one of the 14 mountains higher than 8,000 metres.",
    answers: [
      ["Everest", 1, "mount everest", "mt everest"], ["K2", 1], ["Annapurna", 2],
      ["Kangchenjunga", 2, "kanchenjunga"], ["Lhotse", 3], ["Nanga Parbat", 3], ["Makalu", 4],
      ["Cho Oyu", 4], ["Manaslu", 4], ["Dhaulagiri", 5], ["Broad Peak", 5],
      ["Gasherbrum I", 6, "hidden peak", "gasherbrum 1", "gasherbrum"],
      ["Gasherbrum II", 6, "gasherbrum 2"], ["Shishapangma", 6, "shisha pangma"],
    ],
  },
  {
    id: "design-patterns", cat: "Computing",
    prompt: "Name one of the 23 Gang of Four design patterns.",
    answers: [
      ["Singleton", 1], ["Observer", 1], ["Factory Method", 1, "factory"], ["Decorator", 2],
      ["Strategy", 2], ["Adapter", 2], ["Builder", 3], ["Iterator", 3], ["Proxy", 3], ["Facade", 3],
      ["Command", 3], ["Abstract Factory", 3], ["State", 4], ["Composite", 4],
      ["Template Method", 4, "template"], ["Visitor", 4], ["Prototype", 4], ["Bridge", 5],
      ["Mediator", 5], ["Chain of Responsibility", 5], ["Flyweight", 6], ["Memento", 6],
      ["Interpreter", 6],
    ],
  },
  {
    id: "bronte-novels", cat: "Literature",
    prompt: "Name a novel by one of the Brontë sisters.",
    answers: [
      ["Jane Eyre", 1], ["Wuthering Heights", 1],
      ["The Tenant of Wildfell Hall", 2, "tenant of wildfell hall", "wildfell hall"],
      ["Agnes Grey", 3], ["Villette", 4], ["Shirley", 5], ["The Professor", 6],
    ],
  },
  {
    id: "heracles-labours", cat: "Myth",
    prompt: "Name what Heracles had to defeat, capture, clean or fetch in one of his twelve labours.",
    answers: [
      ["Nemean Lion", 1, "lion"], ["Lernaean Hydra", 1, "hydra"], ["Cerberus", 1],
      ["Augean Stables", 2, "stables"], ["Cretan Bull", 3, "bull"], ["Erymanthian Boar", 3, "boar"],
      ["Apples of the Hesperides", 4, "golden apples", "apples"], ["Stymphalian Birds", 4, "birds"],
      ["Belt of Hippolyta", 5, "girdle of hippolyta", "belt", "girdle", "hippolyta's belt"],
      ["Mares of Diomedes", 5, "mares", "horses of diomedes"],
      ["Ceryneian Hind", 6, "hind", "golden hind", "cerynitian hind"],
      ["Cattle of Geryon", 6, "cattle", "geryon's cattle"],
    ],
  },
];
