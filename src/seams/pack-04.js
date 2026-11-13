/*
 * Lootle safe bank, pack 4.
 *
 * Short general knowledge lists.
 * Format: [canonical name, tier 1 to 6, ...other accepted spellings].
 */
export const PACK = [
  {
    id: "oceania-countries", cat: "Geography",
    prompt: "Name a country in Oceania.",
    answers: [
      ["Australia", 1], ["New Zealand", 2], ["Fiji", 3], ["Papua New Guinea", 3], ["Samoa", 4],
      ["Tonga", 4], ["Vanuatu", 5], ["Solomon Islands", 5], ["Kiribati", 6], ["Tuvalu", 6],
      ["Nauru", 6], ["Palau", 6], ["Micronesia", 6, "federated states of micronesia"],
      ["Marshall Islands", 6],
    ],
  },
  {
    id: "london-tube-lines", cat: "Geography",
    prompt: "Name a London Underground line.",
    answers: [
      ["Central", 1], ["Northern", 1], ["Piccadilly", 2], ["Victoria", 2], ["Circle", 2],
      ["District", 3], ["Jubilee", 3], ["Bakerloo", 4], ["Metropolitan", 4],
      ["Hammersmith and City", 5, "hammersmith & city", "hammersmith"],
      ["Waterloo and City", 6, "waterloo & city", "waterloo"],
    ],
  },
  {
    id: "french-regions", cat: "Geography",
    prompt: "Name one of the 13 regions of mainland France, counting Corsica.",
    answers: [
      ["Normandy", 1, "normandie"], ["Brittany", 1, "bretagne"], ["Corsica", 2, "corse"],
      ["Ile-de-France", 2, "paris region"], ["Provence-Alpes-Cote d'Azur", 3, "provence", "paca"],
      ["Occitanie", 3, "occitania"], ["Nouvelle-Aquitaine", 4, "new aquitaine", "aquitaine"],
      ["Grand Est", 4], ["Auvergne-Rhone-Alpes", 4, "auvergne rhone alpes"], ["Hauts-de-France", 5],
      ["Pays de la Loire", 5], ["Centre-Val de Loire", 5, "centre val de loire"],
      ["Bourgogne-Franche-Comte", 6, "burgundy franche comte", "bourgogne franche comte"],
    ],
  },
];
