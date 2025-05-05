// Enhanced character substitution map with comprehensive coverage
function buildBannedWordRegex(word) {
  const substitutions = {
    a: "[aA@4áàâ*]",
    b: "[bB8ßḃ*]",
    c: "[cC(çḉ*]",
    d: "[dD*]",
    e: "[eE3éèêë*]",
    f: "[fF*]",
    g: "[gG9ġ*]",
    h: "[hH*]",
    i: "[iI1!|íìîï*]",
    j: "[jJ*]",
    k: "[kK*]",
    l: "[lL1|*]",
    m: "[mM*]",
    n: "[nN*]",
    o: "[oO0óòôö*]",
    p: "[pP*]",
    q: "[qQ*]",
    r: "[rR*]",
    s: "[sS$5*]",
    t: "[tT7*]",
    u: "[uUüûù*]",
    v: "[vV*]",
    w: "[wW*]",
    x: "[xX*]",
    y: "[yY*]",
    z: "[zZ2*]",
  };

  // Special handling for specific problematic words
  const specialCases = {
    porn: "p[o0*][r*][n*]",
    negr: "n[e3*][g9*][r*]",
    dick: "d[i1!|*][c(*][k*]",
    boobs: "b[o0*][o0*]b[s5*]",
    fuck: "f[uüûU*][c(*][k*]",
    cum: "c[uüûU*][m*]",
    sex: "s[e3*][x*]",
    nigger: "n[i1!|*][g9*][g9*][e3*][r*]",
    nigga: "n[i1!|*][g9*][g9*][a*]",
    ass: "[a@4*][s$5*][s$5*]",
    shit: "[s$5*][h*][i1!|*][t7*]",
  };

  // Use special case pattern if available
  if (specialCases[word.toLowerCase()]) {
    return new RegExp(
      `\\b(${specialCases[word.toLowerCase()]})[\\s._\\-*]*\\b`,
      "gi"
    );
  }

  // Build pattern with substitutions and allow for deliberate spacing/obfuscation
  let pattern = "";
  for (const char of word) {
    const sub =
      substitutions[char.toLowerCase()] || `[${char}${char.toUpperCase()}*]`;
    pattern += `${sub}[\\s._\\-*]*`;
  }

  // Match with word boundaries
  return new RegExp(`\\b(${pattern})[\\s._\\-*]*\\b`, "gi");
}

// Improved list of banned words (plain, not regex)
const bannedWordList = [
  "sex",
  "fuck",
  "nigger",
  "nigga",
  "ass",
  "shit",
  "cum",
  "lox",
  "loximtir",
  "o'le",
  "yiban",
  "blat",
  "bla",
  "dalbayob",
  "dalban",
  "po'q",
  "bo'q",
  "puq",
  "buq",
  "skay",
  "seks",
  "seksual",
  "seksualniy",
  "negir",
  "negirsan",
  "negirsila",
  "qo'toq",
  "qotoq",
  "qotoqbosh",
  "qo'toqbosh",
  "qo'tobosh",
  "qotobosh",
  "bich",
  "bichsan",
  "cho'choq",
  "cho'choqbosh",
  "cho'choqcha",
  "yobnuti",
  "sassiq",
  "qasd",
  "qast",
  "o'ldir",
  "o'ldirish",
  "porn",
  "dick",
  "pussy",
  "cock",
  "slut",
  "whore",
  "fag",
  "retard",
  "cunt",
  "penis",
  "vagina",
  "tits",
  "boobs",
  "anal",
  "rape",
  "incest",
  "molest",
  "kill",
  "murder",
  "suicide",
  "terrorist",
  "isis",
  "jihad",
  "blowjob",
  "handjob",
  "orgy",
  "gangbang",
  "paedophile",
  "pedophile",
  "childabuse",
  "zoophilia",
  "beastiality",
  "necrophilia",
  "bestiality",
  "queer",
  "slur",
  "lynch",
  "genocide",
  "holocaust",
  "shoot",
  "stab",
  "gun",
  "weapon",
  "explosive",
  "bomb",
  "execute",
  "hang",
  "poison",
  "selfharm",
  "cutting",
  "selfmutilation",
  "addict",
  "drug",
  "heroin",
  "cocaine",
  "crack",
  "meth",
  "weed",
  "marijuana",
  "opium",
  "hash",
  "thc",
  "mdma",
  "ecstasy",
  "shrooms",
  "psychedelic",
  "trippy",
  "ped0",
  "pedo",
  "paedo",
  "paed0",
  "molester",
  "childporn",
  "cp",
  "zoophile",
  "beastial",
  "necrophile",
  "inc3st",
  "terror",
  "extremist",
  "whitepower",
  "kkk",
  "klan",
  "whitepride",
  "whitesupremacy",
  "blacksupremacy",
  "antisemitic",
  "zionist",
  "zionism",
  "nazi",
  "hitler",
  "semen",
  "sp3rm",
  "sperm",
  "testicle",
  "scrotum",
  "foreskin",
  "anus",
  "rectum",
  "prostitute",
  "escort",
  "stripper",
  "stripclub",
  "wh0re",
  "wh0r3",
  "biatch",
  "bitch",
  "hoe",
  "ho",
  "tranny",
  "transsexual",
  "transgender",
  "dyke",
  "spic",
  "kike",
  "chink",
  "gook",
  "jap",
  "wetback",
  "beaner",
  "coon",
  "spook",
  "porchmonkey",
  "towelhead",
  "sandnigger",
  "raghead",
  "cameljockey",
  "gypsy",
  "retarded",
  "cripple",
  "spaz",
  "spastic",
  "autist",
  "autistic",
  "midget",
  "dwarf",
  "hermaphrodite",
  "intersex",
  "downsyndrome",
  "spina",
  "bastard",
  "slant",
  "crip",
  "crips",
  "bloods",
  "gang",
  "mafia",
  "cartel",
  "syndicate",
  "extort",
  "blackmail",
  "bribe",
  "corrupt",
  "scam",
  "fraud",
  "cheat",
  "embezzle",
  "forgery",
  "plagiarize",
  "plagiarism",
  "negr",
  "nig",
];
// Build regexes for all banned words
const bannedWordRegexes = bannedWordList.map((word) => ({
  word,
  regex: buildBannedWordRegex(word),
}));

// Default allowlist patterns for common legitimate words and greetings
const defaultAllowlistPatterns = [
  // English patterns for words containing banned substrings
  {
    pattern:
      /\b\w*ass(?:ess|ign|ume|ociat|embl|ist|umpt|et|ur|imil|on|ag|iv|ion|ay|av|pass|bass|class|glass|grass)\w*\b/i,
    context: "english",
  },
  { pattern: /\b\w*cum(?:ber|ulat|stan|docu|in)\w*\b/i, context: "english" },
  { pattern: /\bbase(?:ment|line)\b/i, context: "english" },
  {
    pattern: /\b\w*cock(?:pit|tail|atoo|peac|shuttl|hay|wood|game)\w*\b/i,
    context: "english",
  },
  { pattern: /\b\w*anal(?:ysi|ytic|og)\w*\b/i, context: "english" },
  { pattern: /\b\w*rape(?:fruit|utic|s)\w*\b/i, context: "english" },
  {
    pattern: /\b\w*nig(?:ht|eria|erian|htmare|hty|gard|gardly)\w*\b/i,
    context: "english",
  },
  // Multilingual greetings (stricter to avoid false positives)
  {
    pattern: /\b(?:assalomu\s+aleykum|salam\s+alaikum|salaam|shalom)\b/i,
    context: "multilingual",
  },
  // Medical or technical terms
  {
    pattern:
      /\b(?:penis|vagina|anus|rectum|semen|sperm|testicle|scrotum|foreskin)\b/i,
    context: "medical",
  },
];

// Improved text cleaning function
function cleanText(text) {
  return (text || "")
    .replace(/<[^>]+>/g, " ") // Remove HTML tags
    .replace(/[\r\n\t]+/g, " ") // Replace newlines/tabs with space
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

// More aggressive text preprocessing to handle obfuscation
function preprocessText(text) {
  let processed = cleanText(text);
  processed = processed
    .replace(/\b([a-zA-Z])(?:\s+([a-zA-Z])){1,5}\b/g, (...args) =>
      args.slice(1, -2).join("")
    ) // Remove spaces between letters
    .replace(/[\s._\-*]+/g, "") // Remove all separators
    .replace(/([a-zA-Z])\1+/g, "$1") // Collapse repeated letters
    .replace(/\*/g, "");
  return processed;
}

// Simplified function to create text variations
function createTextVariations(text) {
  const variations = [
    text,
    cleanText(text),
    text.replace(/[^a-zA-Z0-9\s]/g, ""), // Keep spaces, remove other non-alphanumeric
    text.replace(/\*/g, ""),
    text.replace(/[\s._\-*]+/g, ""), // Remove all separators
    text
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/\$/g, "s")
      .replace(/@/g, "a")
      .replace(/\(/g, "c")
      .replace(/\)/g, "o"),
  ];
  return variations;
}

// Function to check if a word or text matches an allowlist pattern
function isAllowedWord(
  word,
  context,
  text,
  customAllowlist = [],
  customPatterns = []
) {
  word = word.toLowerCase().trim();
  text = (text || "").toLowerCase().trim();
  const allPatterns = [...defaultAllowlistPatterns, ...customPatterns];

  // Check custom allowlist (exact matches)
  if (customAllowlist.includes(word)) {
    return true;
  }

  // Check patterns based on context (exact word or full phrase match)
  for (const { pattern, context: patternContext } of allPatterns) {
    if (
      !context ||
      context === patternContext ||
      patternContext === "multilingual"
    ) {
      // Exact word match
      if (pattern.test(word) && word.match(pattern)[0].toLowerCase() === word) {
        return true;
      }
      // Full text match for phrases (e.g., "assalomu aleykum")
      const textMatches = text.match(pattern);
      if (
        textMatches &&
        textMatches.some((match) => match.toLowerCase() === word)
      ) {
        return true;
      }
    }
  }

  return false;
}

// Improved function to detect banned words
function detectBannedWords(text, options = {}) {
  if (!text || typeof text !== "string") {
    console.warn("Invalid input: text must be a non-empty string");
    return [];
  }

  const {
    context = "general",
    customAllowlist = [],
    customPatterns = [],
  } = options;
  const cleaned = cleanText(text);
  const preprocessed = preprocessText(text);
  const variations = createTextVariations(text);
  const matches = new Set();
  const falsePositives = new Set();

  const words = cleaned.split(/\s+/);
  const individualWords = new Set(
    words.map((w) => w.toLowerCase().replace(/[^\w]/g, ""))
  );

  // First pass: collect false positives
  for (const word of individualWords) {
    if (
      isAllowedWord(word, context, cleaned, customAllowlist, customPatterns)
    ) {
      falsePositives.add(word);
      console.log(`Skipping allowed word: "${word}"`);
    }
  }

  // Check for standalone banned words first
  const checkAgainstRegexes = (textToCheck) => {
    for (const { word, regex } of bannedWordRegexes) {
      if (regex.test(textToCheck)) {
        const regexMatches = textToCheck.match(regex);
        if (regexMatches && regexMatches.length > 0) {
          const matchedText = regexMatches[0].toLowerCase().trim();
          let isFalsePositive = isAllowedWord(
            matchedText,
            context,
            textToCheck,
            customAllowlist,
            customPatterns
          );

          for (const fp of falsePositives) {
            if (
              fp.includes(matchedText.replace(/[^\w]/g, "")) &&
              matchedText.replace(/[^\w]/g, "") !== fp
            ) {
              isFalsePositive = true;
              break;
            }
          }

          if (!isFalsePositive) {
            matches.add(word);
            console.log(`Found match for "${word}" in: "${textToCheck}"`);
          } else {
            console.log(
              `Skipping false positive for "${word}" in: "${matchedText}"`
            );
          }
        }
      }
    }
  };

  // Check banned word regexes
  checkAgainstRegexes(cleaned);
  checkAgainstRegexes(preprocessed);
  for (const variation of variations) {
    checkAgainstRegexes(variation);
  }

  const problematicPatterns = [
    { pattern: /\b[f][uüûU][\s._\-*]*[c(][\s._\-*]*[k]\b/i, word: "fuck" },
    { pattern: /\b[p][o0][\s._\-*]*[r][\s._\-*]*[n]\b/i, word: "porn" },
    { pattern: /\b[n][e3][\s._\-*]*[g9][\s._\-*]*[r]\b/i, word: "negr" },
    { pattern: /\b[s][h][\s._\-*]*[i1!|][\s._\-*]*[t7]\b/i, word: "shit" },
    { pattern: /\b[d][i1!|][\s._\-*]*[c(][\s._\-*]*[k]\b/i, word: "dick" },
    {
      pattern: /\b[b][o0][\s._\-*]*[o0][\s._\-*]*b[\s._\-*]*[s5]\b/i,
      word: "boobs",
    },
    { pattern: /\b[c][uüûU][\s._\-*]*[m]\b/i, word: "cum" },
    { pattern: /\b[a@4][\s._\-*]*[s$5][\s._\-*]*[s$5]\b/i, word: "ass" },
    {
      pattern: /\b[p][uü][\s._\-*]*[s$5][\s._\-*]*[s$5][\s._\-*]*[y]\b/i,
      word: "pussy",
    },
    {
      pattern:
        /\b[n][i1!|][\s._\-*]*[g9][\s._\-*]*[g9][\s._\-*]*[e3][\s._\-*]*[r]\b/i,
      word: "nigger",
    },
    {
      pattern: /\b[n][i1!|][\s._\-*]*[g9][\s._\-*]*[g9][\s._\-*]*[a]\b/i,
      word: "nigga",
    },
    { pattern: /\b[s][e3][\s._\-*]*[x]\b/i, word: "sex" },
    { pattern: /\b[n][i1!|][\s._\-*]*[g9]\b/i, word: "nig" },
  ];

  // Only check problematic patterns if no matches found yet
  if (!matches.size) {
    for (const { pattern, word } of problematicPatterns) {
      const stripped = cleaned.replace(/[^a-zA-Z0-9]/g, "");
      let containsFalsePositive = false;
      for (const fp of falsePositives) {
        if (fp.includes(stripped) && stripped !== fp) {
          containsFalsePositive = true;
          break;
        }
      }

      if (!containsFalsePositive && pattern.test(stripped)) {
        const patternMatch = stripped.match(pattern);
        if (patternMatch && patternMatch.length > 0) {
          const matchedText = patternMatch[0].toLowerCase();
          let isFalsePositive = isAllowedWord(
            matchedText,
            context,
            cleaned,
            customAllowlist,
            customPatterns
          );

          for (const fp of falsePositives) {
            if (fp.includes(matchedText) && matchedText !== fp) {
              isFalsePositive = true;
              break;
            }
          }

          if (!isFalsePositive) {
            matches.add(word);
            console.log(
              `Found match by pattern for "${word}" in stripped: "${stripped}"`
            );
          } else {
            console.log(`Skipping false positive pattern match for "${word}"`);
          }
        }
      }

      const asteriskStripped = text
        .replace(/\*/g, "")
        .replace(/[^a-zA-Z0-9]/g, "");
      containsFalsePositive = false;
      for (const fp of falsePositives) {
        if (fp.includes(asteriskStripped) && asteriskStripped !== fp) {
          containsFalsePositive = true;
          break;
        }
      }

      if (!containsFalsePositive && pattern.test(asteriskStripped)) {
        const patternMatch = asteriskStripped.match(pattern);
        if (patternMatch && patternMatch.length > 0) {
          const matchedText = patternMatch[0].toLowerCase();
          let isFalsePositive = isAllowedWord(
            matchedText,
            context,
            text,
            customAllowlist,
            customPatterns
          );

          for (const fp of falsePositives) {
            if (fp.includes(matchedText) && matchedText !== fp) {
              isFalsePositive = true;
              break;
            }
          }

          if (!isFalsePositive) {
            matches.add(word);
            console.log(
              `Found match by pattern for "${word}" in asterisk-stripped: "${asteriskStripped}"`
            );
          } else {
            console.log(`Skipping false positive pattern match for "${word}"`);
          }
        }
      }

      // Check all variations for problematic patterns
      for (const variation of variations) {
        if (pattern.test(variation)) {
          const patternMatch = variation.match(pattern);
          if (patternMatch && patternMatch.length > 0) {
            const matchedText = patternMatch[0].toLowerCase();
            let isFalsePositive = isAllowedWord(
              matchedText,
              context,
              variation,
              customAllowlist,
              customPatterns
            );

            for (const fp of falsePositives) {
              if (
                fp.includes(matchedText.replace(/[^\w]/g, "")) &&
                matchedText.replace(/[^\w]/g, "") !== fp
              ) {
                isFalsePositive = true;
                break;
              }
            }

            if (!isFalsePositive) {
              matches.add(word);
              console.log(
                `Found match by pattern for "${word}" in variation: "${variation}"`
              );
            } else {
              console.log(
                `Skipping false positive pattern match for "${word}" in variation: "${variation}"`
              );
            }
          }
        }
      }
    }
  }

  const wordsWithAsterisks = text.split(/\s+/).filter((w) => w.includes("*"));
  for (const currentWord of wordsWithAsterisks) {
    let isPartOfAllowed = isAllowedWord(
      currentWord.replace(/\*/g, "").toLowerCase(),
      context,
      text,
      customAllowlist,
      customPatterns
    );
    if (isPartOfAllowed) {
      console.log(`Skipping asterisk word (part of allowed): "${currentWord}"`);
      continue;
    }

    const pattern = new RegExp(
      `^${currentWord.replace(/\*/g, ".").replace(/[^\w.]/g, "")}$`,
      "i"
    );
    for (const bannedWord of bannedWordList) {
      if (
        currentWord.length === bannedWord.length &&
        pattern.test(bannedWord)
      ) {
        matches.add(bannedWord);
        console.log(
          `Found asterisk match for "${bannedWord}" in: "${currentWord}"`
        );
      }
    }
  }

  const lettersOnly = cleaned.match(/\b[a-zA-Z]\s+[a-zA-Z](\s+[a-zA-Z])+\b/g);
  if (lettersOnly) {
    for (const spacedLetters of lettersOnly) {
      const withoutSpaces = spacedLetters.replace(/\s+/g, "").toLowerCase();
      if (bannedWordList.includes(withoutSpaces)) {
        matches.add(withoutSpaces);
        console.log(
          `Found spaced word match: "${withoutSpaces}" in "${spacedLetters}"`
        );
      }
    }
  }

  return Array.from(matches);
}

// Function to test the improved content filter
function testContentFilter() {
  const testCases = [
    // Standard test cases
    "This is a normal sentence",
    "This has the word s-e-x in it",
    "This contains n i g g e r with spaces",
    "This has a55 with numbers",
    "This has f.u.c.k with dots",
    "This has s_h_i_t with underscores",
    "This has c*u*m with asterisks",
    "This has n3gr obfuscated",
    "This has @ss with symbols",
    "Sh!t with substitutions",
    "F*ck with an asterisk",
    "S.e.x with dots",
    "n-e-g-r with dashes",
    "p0rn with a zero",
    "s3x with number",
    "b00bs with zeros",
    "d1ck with number one",
    "n!gger with exclamation mark",
    "n1gg3r with numbers",
    "f_u_c_k with underscores",
    "por.n with dot",
    "di(k with parenthesis",
    "p*rn with asterisk",
    "bo0bs with zero",
    "p-o-r-n with dashes",
    "s**t with multiple asterisks",
    "f**k multiple asterisks in middle",
    "se* with end asterisk",
    "*ex with start asterisk",
    "d**k multiple asterisks",
    "p***n with multiple asterisks",
    // False positive test cases
    "Arnold Schwarzenegger is an actor",
    "The document has been accumulated in the database",
    "The class assignment is due tomorrow",
    "We มีความจำเป็นต้องวิเคราะห์ปัญหานี้",
    "The cockpit of the airplane",
    "I'm going to massage my sore muscles",
    "Let's assess the situation",
    "The basement needs cleaning",
    "We need to associate these things",
    "What's your assumption about this?",
    "Let's pass the ball",
    "The cucumber salad was delicious",
    "The therapist helped me",
    "I love grapefruit juice",
    // Multilingual test cases
    "Assalomu Aleykum my friend",
    "Salam Alaikum to everyone",
    "Shalom from Israel",
    "Salaam as a greeting",
    // Additional test cases for "nig"
    "The night sky is beautiful",
    "Nigeria is a vibrant country",
    // Test case for standalone "ass"
    "ass assalomu aleykum",
    // New test cases for concatenated words
    "Fuckyou",
    "fuckyou",
    "asshole",
    "n1gga",
    "shitstorm",
    // False positive test for similar words
    "refuse to comply",
  ];

  console.log("===== IMPROVED CONTENT FILTER TEST =====");
  for (const testCase of testCases) {
    const matches = detectBannedWords(testCase, {
      context: testCase.match(/assalomu|salam|shalom|salaam/i)
        ? "multilingual"
        : "english",
      customAllowlist: ["schwarzenegger", "cockpit"],
      customPatterns: [],
    });
    console.log(
      `"${testCase}" - ${
        matches.length > 0 ? `Banned: ${matches.join(", ")}` : "CLEAN"
      }`
    );
  }
}

// Demo usage
// testContentFilter();

// Main filtering function for export
export function containsBannedWords(text, options = {}) {
  return detectBannedWords(text, options).length > 0;
}

// Export other utilities
export const bannedWords = bannedWordRegexes.map((item) => item.regex);
export { cleanText, detectBannedWords };
