// ---------------------------------------------------------------------------
// Library Quiz Seed Data
// Pre-configured quizzes aligned to California K-12 curriculum standards.
// Each entry is a "template" — teachers fork a personal copy to their
// dashboard, edit it, and launch it. The data here is used by the seed
// script (scripts/seedLibrary.ts) to populate Firestore once.
//
// California Standards referenced:
//   Math  : CCSS (Common Core State Standards, adopted by CA)
//   ELA   : CA ELA/ELD Framework
//   Science: CA NGSS (Next Generation Science Standards)
//   History: CA HSS (History-Social Science Framework)
// ---------------------------------------------------------------------------

import type { QuizQuestion, QuizSettings } from '../types/quiz';
import type { SubjectArea, GradeBand, GradeLevel } from '../types/quiz';

export interface LibraryQuizSeed {
  title: string;
  description: string;
  subject: SubjectArea;
  gradeLevel: GradeLevel;
  gradeBand: GradeBand;
  caStandard: string;
  category: string;
  questions: Omit<QuizQuestion, 'id'>[];
  settings: QuizSettings;
}

const DEFAULT_SETTINGS: QuizSettings = {
  questionDuration: 30,
  showLeaderboardAfterEach: true,
  shuffleQuestions: false,
  shuffleChoices: true,
  maxPlayers: 35,
};

// ---------------------------------------------------------------------------
// Grade Band: K–2
// ---------------------------------------------------------------------------

const kinder_counting: LibraryQuizSeed = {
  title: 'Counting & Numbers (Kindergarten)',
  description: 'Counting to 20, comparing numbers, and understanding quantity — aligned to CA CCSS.MATH.K.CC.',
  subject: 'math',
  gradeLevel: 'K',
  gradeBand: 'K-2',
  caStandard: 'CCSS.MATH.K.CC',
  category: 'Math',
  settings: { ...DEFAULT_SETTINGS, questionDuration: 20 },
  questions: [
    { text: 'How many fingers do you have on both hands?', choices: ['8', '9', '10', '11'], correctAnswerIndex: 2, timeLimit: 20 },
    { text: 'What number comes after 5?', choices: ['4', '5', '6', '7'], correctAnswerIndex: 2, timeLimit: 20 },
    { text: 'Which group has MORE apples: 3 apples or 7 apples?', choices: ['3 apples', '7 apples', 'They are equal', 'I cannot tell'], correctAnswerIndex: 1, timeLimit: 20 },
    { text: 'What number comes before 10?', choices: ['8', '9', '11', '12'], correctAnswerIndex: 1, timeLimit: 20 },
    { text: 'Count the dots: ● ● ● ● — how many?', choices: ['2', '3', '4', '5'], correctAnswerIndex: 2, timeLimit: 20 },
    { text: 'Which number is the SMALLEST?', choices: ['7', '3', '9', '5'], correctAnswerIndex: 1, timeLimit: 20 },
    { text: 'How many sides does a square have?', choices: ['3', '4', '5', '6'], correctAnswerIndex: 1, timeLimit: 20 },
    { text: 'What is 2 + 3?', choices: ['4', '5', '6', '3'], correctAnswerIndex: 1, timeLimit: 20 },
    { text: 'If you have 6 toys and give away 2, how many are left?', choices: ['2', '3', '4', '8'], correctAnswerIndex: 2, timeLimit: 20 },
    { text: 'What number is ten more than 5?', choices: ['10', '15', '50', '51'], correctAnswerIndex: 1, timeLimit: 20 },
    { text: 'Which shape has 3 corners?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], correctAnswerIndex: 2, timeLimit: 20 },
    { text: 'What comes BETWEEN 7 and 9?', choices: ['6', '8', '10', '5'], correctAnswerIndex: 1, timeLimit: 20 },
    { text: 'How many days are in a week?', choices: ['5', '6', '7', '8'], correctAnswerIndex: 2, timeLimit: 20 },
    { text: 'Count by 2s: 2, 4, 6, ___', choices: ['7', '8', '9', '10'], correctAnswerIndex: 1, timeLimit: 20 },
    { text: 'Which number is the LARGEST?', choices: ['12', '8', '19', '15'], correctAnswerIndex: 2, timeLimit: 20 },
  ],
};

const grade2_ela: LibraryQuizSeed = {
  title: 'Reading Comprehension — Grade 2',
  description: 'Phonics, sight words, story elements, and basic reading skills per CA ELA/ELD Framework Grade 2.',
  subject: 'english',
  gradeLevel: '2',
  gradeBand: 'K-2',
  caStandard: 'CA.ELA.2.RL',
  category: 'English Language Arts',
  settings: { ...DEFAULT_SETTINGS, questionDuration: 25 },
  questions: [
    { text: 'What is the MAIN CHARACTER in a story?', choices: ['The setting', 'The most important person or animal', 'The ending', 'The problem'], correctAnswerIndex: 1, timeLimit: 25 },
    { text: 'Which word rhymes with "cat"?', choices: ['dog', 'car', 'hat', 'cup'], correctAnswerIndex: 2, timeLimit: 25 },
    { text: 'What does a period (.) tell a reader to do?', choices: ['Ask a question', 'Show excitement', 'Stop at the end of a sentence', 'Keep reading without stopping'], correctAnswerIndex: 2, timeLimit: 25 },
    { text: 'The "setting" of a story is…', choices: ['Who the story is about', 'Where and when a story takes place', 'The lesson of the story', 'The biggest problem'], correctAnswerIndex: 1, timeLimit: 25 },
    { text: 'Which word is a NOUN?', choices: ['run', 'quickly', 'dog', 'happy'], correctAnswerIndex: 2, timeLimit: 25 },
    { text: 'What does the prefix "re-" mean in "redo"?', choices: ['Before', 'Again', 'Not', 'Under'], correctAnswerIndex: 1, timeLimit: 25 },
    { text: 'A synonym for "happy" is:', choices: ['sad', 'angry', 'glad', 'tired'], correctAnswerIndex: 2, timeLimit: 25 },
    { text: 'What is the PLURAL of "mouse"?', choices: ['mouses', 'mouse', 'mice', 'mices'], correctAnswerIndex: 2, timeLimit: 25 },
    { text: 'Which sentence uses correct capitalization?', choices: ['my dog is named max.', 'My dog is named Max.', 'my Dog is named max.', 'My Dog Is Named Max.'], correctAnswerIndex: 1, timeLimit: 25 },
    { text: 'The "moral" of a fable is…', choices: ['The funniest part', 'The first sentence', 'The lesson the story teaches', 'The main character\'s name'], correctAnswerIndex: 2, timeLimit: 25 },
    { text: 'An antonym for "big" is:', choices: ['large', 'huge', 'small', 'tall'], correctAnswerIndex: 2, timeLimit: 25 },
    { text: 'Which word is a VERB?', choices: ['jump', 'ball', 'blue', 'fast'], correctAnswerIndex: 0, timeLimit: 25 },
    { text: 'What punctuation mark ends a question?', choices: ['.', '!', '?', ','], correctAnswerIndex: 2, timeLimit: 25 },
    { text: 'Nonfiction books tell about…', choices: ['Made-up stories', 'Real people, places, or events', 'Fairy tales', 'Talking animals'], correctAnswerIndex: 1, timeLimit: 25 },
  ],
};

// ---------------------------------------------------------------------------
// Grade Band: 3–5
// ---------------------------------------------------------------------------

const grade4_math: LibraryQuizSeed = {
  title: 'Multiplication & Division — Grade 4',
  description: 'Multi-digit multiplication, division with remainders, and factors. CA CCSS.MATH.4.NBT & 4.OA.',
  subject: 'math',
  gradeLevel: '4',
  gradeBand: '3-5',
  caStandard: 'CCSS.MATH.4.NBT',
  category: 'Math',
  settings: { ...DEFAULT_SETTINGS, questionDuration: 30 },
  questions: [
    { text: 'What is 7 × 8?', choices: ['54', '56', '63', '48'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'What is 144 ÷ 12?', choices: ['10', '11', '12', '13'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Which of these is a factor of 24?', choices: ['5', '7', '6', '9'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What is 23 × 4?', choices: ['82', '88', '92', '96'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What is the remainder when 29 is divided by 4?', choices: ['0', '1', '3', '5'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which number is prime?', choices: ['9', '15', '17', '21'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What is 6² (6 squared)?', choices: ['12', '18', '36', '66'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: '500 × 40 = ?', choices: ['200', '2,000', '20,000', '200,000'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'A pattern starts: 3, 6, 12, 24. What comes next?', choices: ['36', '42', '48', '96'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What is the LCM of 4 and 6?', choices: ['2', '10', '12', '24'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Which equation uses the ASSOCIATIVE property?', choices: ['4×3 = 3×4', '(2×3)×4 = 2×(3×4)', '5×(2+3) = 5×2+5×3', '8÷4 = 2'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'What is 1,200 ÷ 30?', choices: ['4', '40', '400', '4,000'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Sara has 84 stickers to share equally among 7 friends. How many does each friend get?', choices: ['10', '11', '12', '14'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What is 9 × 9?', choices: ['72', '81', '89', '99'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which of the following is a MULTIPLE of 8?', choices: ['26', '34', '40', '46'], correctAnswerIndex: 2, timeLimit: 30 },
  ],
};

const grade5_science: LibraryQuizSeed = {
  title: 'Earth\'s Systems — Grade 5',
  description: 'Water cycle, weather patterns, Earth\'s layers, and landforms. Aligned to CA NGSS 5-ESS2.',
  subject: 'science',
  gradeLevel: '5',
  gradeBand: '3-5',
  caStandard: 'CA.NGSS.5-ESS2',
  category: 'Science',
  settings: { ...DEFAULT_SETTINGS, questionDuration: 30 },
  questions: [
    { text: 'What process turns liquid water into water vapor?', choices: ['Condensation', 'Precipitation', 'Evaporation', 'Infiltration'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'When water vapor cools and turns back into liquid droplets in clouds, this is called:', choices: ['Evaporation', 'Condensation', 'Runoff', 'Transpiration'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which layer of the Earth is the thinnest?', choices: ['Inner core', 'Outer core', 'Mantle', 'Crust'], correctAnswerIndex: 3, timeLimit: 30 },
    { text: 'Mountains form when tectonic plates:', choices: ['Separate apart', 'Slide past each other horizontally', 'Collide and push upward', 'Sink into the mantle'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Most of Earth\'s fresh water is stored in:', choices: ['Rivers', 'Lakes', 'Glaciers and ice caps', 'Groundwater'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The water cycle is powered mainly by:', choices: ['The moon\'s gravity', 'Energy from the Sun', 'Wind currents', 'Earth\'s rotation'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which type of rock forms from cooled magma?', choices: ['Sedimentary', 'Metamorphic', 'Igneous', 'Limestone'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Precipitation includes all of these EXCEPT:', choices: ['Rain', 'Snow', 'Fog', 'Hail'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What is an aquifer?', choices: ['A type of cloud', 'Underground water stored in rock', 'Ocean current', 'A mountain valley'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Erosion is best defined as:', choices: ['The build-up of soil', 'The wearing away and moving of rock/soil by wind, water, or ice', 'Volcanic activity', 'Earthquake damage'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'California\'s Central Valley is mostly covered by:', choices: ['Desert', 'Sedimentary soil from rivers', 'Volcanic rock', 'Dense forest'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which gas makes up most of Earth\'s atmosphere?', choices: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What drives ocean currents?', choices: ['Only the moon', 'Wind, temperature, and salinity differences', 'Rainfall', 'Fish migration'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The San Andreas Fault is a boundary where plates:', choices: ['Collide head-on', 'Pull apart', 'Slide horizontally past each other', 'One sinks under the other'], correctAnswerIndex: 2, timeLimit: 30 },
  ],
};

const grade5_history: LibraryQuizSeed = {
  title: 'Colonial America & U.S. Founding — Grade 5',
  description: 'Colonial life, American Revolution, and founding documents. CA HSS 5.4–5.7.',
  subject: 'history',
  gradeLevel: '5',
  gradeBand: '3-5',
  caStandard: 'CA.HSS.5.4',
  category: 'History',
  settings: { ...DEFAULT_SETTINGS, questionDuration: 30 },
  questions: [
    { text: 'Which document declared the 13 colonies independent from Britain?', choices: ['The Constitution', 'The Bill of Rights', 'The Declaration of Independence', 'The Magna Carta'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'In what year was the Declaration of Independence signed?', choices: ['1765', '1776', '1781', '1787'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Who wrote most of the Declaration of Independence?', choices: ['George Washington', 'Benjamin Franklin', 'Thomas Jefferson', 'John Adams'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The "no taxation without representation" slogan referred to:', choices: ['Colonists refusing to pay any taxes', 'Colonists wanting a voice in Parliament before being taxed', 'British soldiers taking colonial property', 'The Tea Act of 1773'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which battle is considered the turning point of the Revolutionary War?', choices: ['Lexington and Concord', 'Bunker Hill', 'Saratoga', 'Yorktown'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The Boston Tea Party was a protest against:', choices: ['The Stamp Act', 'The Tea Act (tax on tea)', 'Closing of Boston Harbor', 'British troops in homes'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Who was the Commander-in-Chief of the Continental Army?', choices: ['Benjamin Franklin', 'Paul Revere', 'George Washington', 'John Hancock'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The Mayflower Compact (1620) was significant because it:', choices: ['Ended slavery in New England', 'Established the idea of self-government', 'Created the first U.S. Congress', 'Made Pilgrims citizens of England'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'What were the first 10 amendments to the Constitution called?', choices: ['The Federalist Papers', 'The Articles of Confederation', 'The Bill of Rights', 'The Declaration of Rights'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The Three-Fifths Compromise dealt with:', choices: ['How to count enslaved people for representation', 'How to divide land in the West', 'Trade between states', 'The number of senators per state'], correctAnswerIndex: 0, timeLimit: 30 },
    { text: 'Which colony was founded as a refuge for Catholics?', choices: ['Virginia', 'Massachusetts', 'Maryland', 'Pennsylvania'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What was the main crop of the southern colonies?', choices: ['Wheat and corn', 'Tobacco and cotton', 'Rice and fish', 'Potatoes and beans'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The Battle of Lexington and Concord (1775) is significant because:', choices: ['It ended the war', 'It was the first military clash of the Revolution', 'The French joined the war', 'Washington crossed the Delaware'], correctAnswerIndex: 1, timeLimit: 30 },
  ],
};

// ---------------------------------------------------------------------------
// Grade Band: 6–8
// ---------------------------------------------------------------------------

const grade7_science: LibraryQuizSeed = {
  title: 'Life Science: Cells & Genetics — Grade 7',
  description: 'Cell structure, mitosis, DNA basics, and Mendelian genetics. CA NGSS MS-LS1, MS-LS3.',
  subject: 'science',
  gradeLevel: '7',
  gradeBand: '6-8',
  caStandard: 'CA.NGSS.MS-LS1',
  category: 'Science',
  settings: DEFAULT_SETTINGS,
  questions: [
    { text: 'What structure controls what enters and exits a cell?', choices: ['Cell wall', 'Cell membrane', 'Nucleus', 'Ribosome'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which organelle is the "powerhouse" of the cell?', choices: ['Ribosome', 'Golgi apparatus', 'Mitochondria', 'Vacuole'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Plant cells have these TWO structures that animal cells do NOT:', choices: ['Nucleus and ribosome', 'Cell wall and chloroplasts', 'Mitochondria and vacuole', 'Cell membrane and nucleus'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'DNA is found mainly in which organelle?', choices: ['Ribosome', 'Mitochondria', 'Nucleus', 'Vacuole'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'During mitosis a cell divides to produce:', choices: ['4 cells with half the chromosomes', '2 identical daughter cells', '2 cells genetically different', '8 identical daughter cells'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'A dominant allele:', choices: ['Is only expressed when two copies are present', 'Is always expressed when present', 'Only appears in females', 'Causes mutations'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'If T = tall (dominant) and t = short (recessive), what is the phenotype of Tt?', choices: ['Short', 'Tall', 'Medium height', 'Cannot be determined'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'A Punnett square is used to predict:', choices: ['How many cells divide', 'Possible genetic outcomes of a cross', 'The speed of evolution', 'Protein shape'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Chromosomes are made of:', choices: ['Protein only', 'RNA only', 'DNA and protein', 'Lipids and water'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The process where plants use sunlight to make food is:', choices: ['Respiration', 'Fermentation', 'Photosynthesis', 'Digestion'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Which base pairs with Adenine (A) in DNA?', choices: ['Adenine', 'Cytosine', 'Guanine', 'Thymine'], correctAnswerIndex: 3, timeLimit: 30 },
    { text: 'A mutation is:', choices: ['A change in an organism\'s DNA sequence', 'Cell division', 'A type of protein', 'Natural selection'], correctAnswerIndex: 0, timeLimit: 30 },
    { text: 'Asexual reproduction produces offspring that are:', choices: ['Genetically diverse', 'Genetically identical to the parent', 'Always larger than the parent', 'Unable to reproduce'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which molecule carries genetic instructions from the nucleus to ribosomes?', choices: ['DNA', 'mRNA', 'tRNA', 'ATP'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The theory of evolution by natural selection was proposed by:', choices: ['Gregor Mendel', 'Louis Pasteur', 'Charles Darwin', 'Marie Curie'], correctAnswerIndex: 2, timeLimit: 30 },
  ],
};

const grade8_math: LibraryQuizSeed = {
  title: 'Algebra I Foundations — Grade 8',
  description: 'Linear equations, slope, functions, and systems. CA CCSS.MATH.8.EE, 8.F.',
  subject: 'math',
  gradeLevel: '8',
  gradeBand: '6-8',
  caStandard: 'CCSS.MATH.8.EE',
  category: 'Math',
  settings: DEFAULT_SETTINGS,
  questions: [
    { text: 'Solve for x: 3x + 5 = 20', choices: ['3', '4', '5', '6'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What is the slope of y = 4x − 7?', choices: ['-7', '4', '-4', '7'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which equation represents a line with slope 2 and y-intercept −3?', choices: ['y = -3x + 2', 'y = 2x − 3', 'y = 3x − 2', 'y = -2x + 3'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'What is the slope between (1, 2) and (3, 8)?', choices: ['2', '3', '4', '6'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Simplify: 2(3x − 4) + 5x', choices: ['6x − 4', '11x − 8', '11x + 8', '6x + 5'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Solve the system: x + y = 10, x − y = 2. What is x?', choices: ['3', '4', '6', '8'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Which of these is NOT a function?', choices: ['y = 2x + 1', 'y = x²', '{(1,2),(2,3),(3,4)}', '{(1,2),(1,3),(2,4)}'], correctAnswerIndex: 3, timeLimit: 30 },
    { text: 'What is 3² + 4²?', choices: ['14', '25', '49', '5'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Using the Pythagorean theorem, if a=6 and b=8, what is c?', choices: ['10', '12', '14', '100'], correctAnswerIndex: 0, timeLimit: 30 },
    { text: 'Solve: 5(x − 2) = 15', choices: ['1', '3', '5', '7'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The graph of a linear function is always a:', choices: ['Curve', 'Parabola', 'Straight line', 'Circle'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Scientific notation for 0.00045 is:', choices: ['4.5 × 10³', '4.5 × 10⁻³', '4.5 × 10⁻⁴', '45 × 10⁻³'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'If f(x) = 2x + 1, what is f(4)?', choices: ['7', '8', '9', '10'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Two parallel lines have slopes that are:', choices: ['Equal', 'Opposite signs', 'Negative reciprocals', 'Both zero'], correctAnswerIndex: 0, timeLimit: 30 },
  ],
};

// ---------------------------------------------------------------------------
// Grade Band: 9–12
// ---------------------------------------------------------------------------

const grade10_biology: LibraryQuizSeed = {
  title: 'Biology: Ecology & Ecosystems — Grade 10',
  description: 'Energy flow, food webs, biomes, population dynamics, and human impact. CA NGSS HS-LS2.',
  subject: 'science',
  gradeLevel: '10',
  gradeBand: '9-12',
  caStandard: 'CA.NGSS.HS-LS2',
  category: 'Science',
  settings: DEFAULT_SETTINGS,
  questions: [
    { text: 'Which trophic level contains the MOST energy in an ecosystem?', choices: ['Tertiary consumers', 'Secondary consumers', 'Primary consumers', 'Producers'], correctAnswerIndex: 3, timeLimit: 30 },
    { text: 'About what percentage of energy is transferred from one trophic level to the next?', choices: ['1%', '10%', '50%', '90%'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'A food WEB differs from a food CHAIN because it:', choices: ['Shows only one path of energy', 'Shows multiple feeding relationships', 'Includes decomposers', 'Only shows producers'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which biome has the highest biodiversity?', choices: ['Tundra', 'Taiga', 'Temperate forest', 'Tropical rainforest'], correctAnswerIndex: 3, timeLimit: 30 },
    { text: 'A keystone species is one that:', choices: ['Has the largest population', 'Has a disproportionately large effect on its ecosystem', 'Is at the top of every food chain', 'Only lives in one biome'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Nitrogen fixation is performed mainly by:', choices: ['Plants', 'Fungi', 'Bacteria in the soil', 'Animals'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'What term describes a species that arrives in a new region and negatively impacts native species?', choices: ['Endemic species', 'Keystone species', 'Invasive species', 'Indicator species'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Primary succession begins on:', choices: ['Abandoned farmland', 'A burned forest', 'Bare rock with no soil', 'A drained lake bed'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Which human activity is the LEADING cause of biodiversity loss globally?', choices: ['Climate change', 'Habitat destruction', 'Overhunting', 'Pollution'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The carbon cycle is disrupted most by:', choices: ['Photosynthesis', 'Burning fossil fuels', 'Animal respiration', 'Ocean evaporation'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Mutualism is a relationship where:', choices: ['One organism benefits, one is harmed', 'One benefits, one is unaffected', 'Both organisms benefit', 'Both organisms are harmed'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The niche of an organism refers to:', choices: ['Its geographic location', 'Its role and position in its ecosystem', 'Its body size', 'Its reproductive rate'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Which gas do producers remove from the atmosphere during photosynthesis?', choices: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Methane'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'California\'s chaparral biome is characterized by:', choices: ['Dense evergreen forests', 'Hot dry summers and mild wet winters with drought-adapted shrubs', 'Permafrost and treeless plains', 'Year-round rainfall and tall canopy trees'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The greenhouse effect is caused by atmospheric gases that:', choices: ['Block sunlight from reaching Earth', 'Trap heat radiating from Earth\'s surface', 'Increase UV radiation', 'Absorb rainfall'], correctAnswerIndex: 1, timeLimit: 30 },
  ],
};

const grade11_us_history: LibraryQuizSeed = {
  title: 'U.S. History: Civil War to Civil Rights — Grade 11',
  description: 'Reconstruction, industrialization, World Wars, Great Depression, and Civil Rights. CA HSS 11.1–11.10.',
  subject: 'history',
  gradeLevel: '11',
  gradeBand: '9-12',
  caStandard: 'CA.HSS.11',
  category: 'History',
  settings: DEFAULT_SETTINGS,
  questions: [
    { text: 'The 13th Amendment (1865) did which of the following?', choices: ['Gave women the right to vote', 'Abolished slavery', 'Gave formerly enslaved people citizenship', 'Established due process'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Reconstruction (1865–1877) ended largely because of:', choices: ['The completion of westward expansion', 'The Compromise of 1877 removing federal troops from the South', 'A Supreme Court ruling', 'A second civil war'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The Sherman Antitrust Act (1890) was designed to:', choices: ['Protect labor unions', 'Break up monopolies and prevent unfair business practices', 'Regulate railroad fares', 'Control immigration'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The U.S. entered World War I in 1917 after the discovery that Germany was trying to ally with:', choices: ['France', 'Britain', 'Mexico', 'Japan'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'The 19th Amendment (1920) guaranteed:', choices: ['Prohibition of alcohol', 'Women\'s suffrage', 'Civil rights for Black Americans', 'Abolition of the poll tax'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The Great Depression was triggered in part by:', choices: ['World War I reparations from Germany', 'The stock market crash of October 1929', 'A nationwide drought', 'A banking law passed by Congress'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'FDR\'s "New Deal" programs were primarily intended to:', choices: ['Expand the military', 'Provide relief, recovery, and reform during the Depression', 'Enter the U.S. into WWII', 'Reduce immigration'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The U.S. declared war on Japan after the attack on:', choices: ['Midway Island', 'Guadalcanal', 'Pearl Harbor', 'Wake Island'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Internment of Japanese Americans during WWII was authorized by:', choices: ['The Espionage Act', 'Executive Order 9066', 'A Supreme Court decision', 'Congress via legislation'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The Civil Rights Act of 1964 prohibited discrimination based on:', choices: ['Age only', 'Religion only', 'Race, color, religion, sex, and national origin', 'Economic status'], correctAnswerIndex: 2, timeLimit: 30 },
    { text: 'Brown v. Board of Education (1954) ruled that:', choices: ['Segregated schools were constitutional', 'Segregated schools were unconstitutional', 'Schools must be federally funded', 'Prayer in schools was illegal'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'Dr. Martin Luther King Jr.\'s philosophy of nonviolent protest was heavily influenced by:', choices: ['Malcolm X', 'Mahatma Gandhi', 'Booker T. Washington', 'Marcus Garvey'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The Voting Rights Act of 1965 was passed to:', choices: ['Lower the voting age to 18', 'Eliminate discriminatory voting practices like literacy tests', 'Require photo IDs at polls', 'Create the Electoral College'], correctAnswerIndex: 1, timeLimit: 30 },
    { text: 'The "Red Scare" after WWII was a period of fear about:', choices: ['Nuclear war with China', 'The spread of communism and Soviet spying in the U.S.', 'A Communist takeover of Latin America', 'Racial violence in the South'], correctAnswerIndex: 1, timeLimit: 30 },
  ],
};

// ---------------------------------------------------------------------------
// Exported catalog
// ---------------------------------------------------------------------------

export const LIBRARY_QUIZZES: LibraryQuizSeed[] = [
  kinder_counting,
  grade2_ela,
  grade4_math,
  grade5_science,
  grade5_history,
  grade7_science,
  grade8_math,
  grade10_biology,
  grade11_us_history,
];

// Human-readable labels used throughout the Library UI
export const SUBJECT_LABELS: Record<SubjectArea, string> = {
  math: 'Math',
  science: 'Science',
  english: 'English Language Arts',
  history: 'History',
  'social-studies': 'Social Studies',
  other: 'Other',
};

export const SUBJECT_COLORS: Record<SubjectArea, string> = {
  math: '#6C3FC5',
  science: '#4ECDC4',
  english: '#55A3FF',
  history: '#F5A623',
  'social-studies': '#FF6B6B',
  other: '#8B6BD4',
};

export const GRADE_BANDS: Array<{ value: GradeBand; label: string }> = [
  { value: 'K-2',  label: 'K–2 (Primary)'       },
  { value: '3-5',  label: '3–5 (Elementary)'     },
  { value: '6-8',  label: '6–8 (Middle School)'  },
  { value: '9-12', label: '9–12 (High School)'   },
];
