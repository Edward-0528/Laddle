import type { TriviaPack } from './types';

export const PACKS_C: TriviaPack[] = [
  // -------------------------------------------------------------------------
  // throwback
  // -------------------------------------------------------------------------
  {
    id: 'throwback-totally-80s',
    title: 'Totally 80s',
    category: 'throwback',
    blurb: 'Tease your hair, grab your Walkman, and rewind to the decade of neon.',
    difficulty: 'easy',
    timeLimit: 20,
    questions: [
      {
        text: 'Which company created the arcade game Pac-Man?',
        choices: ['Atari', 'Namco', 'Nintendo', 'Sega'],
        answer: 1,
      },
      {
        text: 'Which puzzle, invented by Erno Rubik, became a worldwide craze in the early 1980s?',
        choices: ["Rubik's Cube", 'Tamagotchi', 'Furby', 'Slinky'],
        answer: 0,
      },
      {
        text: "Which 1982 Michael Jackson album features 'Billie Jean' and 'Beat It'?",
        choices: ['Bad', 'Off the Wall', 'Thriller', 'Dangerous'],
        answer: 2,
      },
      { text: "In Gremlins (1984), you must never feed a mogwai after what?", choices: ["Sunset", "Midnight", "Noon", "Bedtime"], answer: 1 },
      {
        text: 'Which handheld game system did Nintendo release in 1989?',
        choices: ['Game Boy', 'Game Gear', 'Atari Lynx', 'Neo Geo Pocket'],
        answer: 0,
      },
      {
        text: "MTV launched in 1981. What does the 'M' stand for?",
        choices: ['Movie', 'Media', 'Music', 'Modern'],
        answer: 2,
      },
      {
        text: "Which 1982 Steven Spielberg film features an alien who wants to 'phone home'?",
        choices: ['Gremlins', 'E.T. the Extra-Terrestrial', 'Close Encounters', 'Alien'],
        answer: 1,
      },
      { text: "Which 1985 film follows five teens stuck in Saturday detention?", choices: ["Sixteen Candles", "Pretty in Pink", "The Breakfast Club", "St. Elmo's Fire"], answer: 2 },
      {
        text: "Which band released 'Don't Stop Believin'' in 1981?",
        choices: ['Journey', 'Foreigner', 'Boston', 'REO Speedwagon'],
        answer: 0,
      },
      {
        text: "Which video game hero first appeared as 'Jumpman' in Donkey Kong (1981)?",
        choices: ['Luigi', 'Link', 'Mario', 'Sonic'],
        answer: 2,
      },
      {
        text: 'The 1985 Live Aid concerts were held in London and which other city?',
        choices: ['New York', 'Philadelphia', 'Los Angeles', 'Chicago'],
        answer: 1,
      },
      {
        text: 'Which 1980s TV show featured a talking car named KITT?',
        choices: ['Airwolf', 'The A-Team', 'Miami Vice', 'Knight Rider'],
        answer: 3,
      },
    ],
  },
  {
    id: 'throwback-nineties-nostalgia',
    title: 'Nineties Nostalgia',
    category: 'throwback',
    blurb: 'Dial up the modem and dust off your slap bracelets. The 90s are calling.',
    difficulty: 'easy',
    timeLimit: 20,
    questions: [
      {
        text: 'Which keychain virtual pet did Bandai release in 1996?',
        choices: ['Tamagotchi', 'Furby', 'Beanie Baby', 'Polly Pocket'],
        answer: 0,
      },
      {
        text: 'Which furry talking toy from 1998 seemed to learn English over time?',
        choices: ['Teddy Ruxpin', 'Tickle Me Elmo', 'Furby', 'Talkboy'],
        answer: 2,
      },
      { text: "Which 90s cartoon followed babies Tommy, Chuckie and Angelica?", choices: ["Rugrats", "Hey Arnold!", "Doug", "Recess"], answer: 0 },
      {
        text: 'Which game console did Sony first release in 1994?',
        choices: ['Dreamcast', 'Saturn', 'Xbox', 'PlayStation'],
        answer: 3,
      },
      {
        text: 'The first Pokemon games came out in 1996 for which handheld system?',
        choices: ['Game Boy', 'Nintendo DS', 'Game Gear', 'PSP'],
        answer: 0,
      },
      {
        text: 'Which sitcom starred Will Smith as a teen sent to live with relatives?',
        choices: ['Family Matters', 'Saved by the Bell', 'The Fresh Prince of Bel-Air', 'Boy Meets World'],
        answer: 2,
      },
      {
        text: "Which Spice Girl was known as 'Posh Spice'?",
        choices: ['Geri Halliwell', 'Victoria Beckham', 'Emma Bunton', 'Mel B'],
        answer: 1,
      },
      {
        text: "Which game used collectible cardboard discs flipped with a heavy 'slammer'?",
        choices: ['Marbles', 'Jacks', 'Tiddlywinks', 'Pogs'],
        answer: 3,
      },
      {
        text: 'Which 1997 James Cameron film won 11 Academy Awards?',
        choices: ['Titanic', 'Avatar', 'Terminator 2', 'The Abyss'],
        answer: 0,
      },
      {
        text: "On the early web, what did 'www' stand for?",
        choices: ['World Web Wire', 'Wide World Web', 'World Wide Web', 'Web Wide World'],
        answer: 2,
      },
      { text: "Which boy band released \"I Want It That Way\" in 1999?", choices: ["NSYNC", "Boyz II Men", "98 Degrees", "Backstreet Boys"], answer: 3 },
      {
        text: 'Which plush toys with heart-shaped tags became a late-90s collecting craze?',
        choices: ['Care Bears', 'Cabbage Patch Kids', 'Pound Puppies', 'Beanie Babies'],
        answer: 3,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // food-drink
  // -------------------------------------------------------------------------
  {
    id: 'food-drink-around-the-world',
    title: 'Food Around the World',
    category: 'food-drink',
    blurb: 'A globe-trotting tasting menu. Come hungry, leave a little bit smarter.',
    difficulty: 'easy',
    timeLimit: 20,
    questions: [
      {
        text: 'Paella is a traditional rice dish from which country?',
        choices: ['Italy', 'Spain', 'Mexico', 'Portugal'],
        answer: 1,
      },
      {
        text: 'Sushi rice is traditionally seasoned with which liquid?',
        choices: ['Rice vinegar', 'Soy sauce', 'Fish sauce', 'Coconut milk'],
        answer: 0,
      },
      {
        text: 'What is the main ingredient in guacamole?',
        choices: ['Tomato', 'Lime', 'Avocado', 'Green pepper'],
        answer: 2,
      },
      {
        text: 'Hummus is made primarily from which legume?',
        choices: ['Lentils', 'Black beans', 'Fava beans', 'Chickpeas'],
        answer: 3,
      },
      {
        text: 'Which cheese is traditionally used on a Margherita pizza?',
        choices: ['Parmesan', 'Mozzarella', 'Gorgonzola', 'Ricotta'],
        answer: 1,
      },
      {
        text: 'Kimchi is a traditional fermented dish from which country?',
        choices: ['Korea', 'Japan', 'Thailand', 'Vietnam'],
        answer: 0,
      },
      {
        text: 'Which Japanese soup is made from fermented soybean paste?',
        choices: ['Ramen', 'Pho', 'Miso soup', 'Udon'],
        answer: 2,
      },
      {
        text: 'Which spice traditionally gives paella its golden color?',
        choices: ['Turmeric', 'Paprika', 'Cumin', 'Saffron'],
        answer: 3,
      },
      {
        text: 'Pierogi are filled dumplings most associated with which country?',
        choices: ['Hungary', 'Poland', 'Greece', 'Ireland'],
        answer: 1,
      },
      {
        text: 'Greek tzatziki is made from yogurt, garlic, and which vegetable?',
        choices: ['Cucumber', 'Eggplant', 'Spinach', 'Zucchini'],
        answer: 0,
      },
      {
        text: 'Poutine, made of fries, cheese curds, and gravy, comes from which country?',
        choices: ['United States', 'Belgium', 'Canada', 'Ireland'],
        answer: 2,
      },
      {
        text: 'The tagine, both a stew and a clay cooking pot, is most associated with which country?',
        choices: ['Turkey', 'India', 'Greece', 'Morocco'],
        answer: 3,
      },
    ],
  },
  {
    id: 'food-drink-cocktails-brews',
    title: 'Cocktails & Brews',
    category: 'food-drink',
    blurb: 'Shaken, stirred, or poured: test your knowledge of the bar menu.',
    difficulty: 'medium',
    timeLimit: 20,
    questions: [
      {
        text: 'A classic margarita is made with tequila, lime juice, and what?',
        choices: ['Rum', 'Grenadine', 'Orange liqueur', 'Sweet vermouth'],
        answer: 2,
      },
      {
        text: 'Which spirit is the base of a classic mojito?',
        choices: ['Rum', 'Gin', 'Vodka', 'Tequila'],
        answer: 0,
      },
      {
        text: 'A classic dry martini combines gin with which other ingredient?',
        choices: ['Triple sec', 'Dry vermouth', 'Lime juice', 'Tonic water'],
        answer: 1,
      },
      {
        text: 'True Champagne must come from a region in which country?',
        choices: ['Italy', 'Spain', 'Germany', 'France'],
        answer: 3,
      },
      {
        text: 'By law, bourbon whiskey must be made mostly from which grain?',
        choices: ['Barley', 'Rye', 'Corn', 'Wheat'],
        answer: 2,
      },
      {
        text: 'Which beer style is named after the Czech city of Plzen?',
        choices: ['Pilsner', 'Porter', 'Stout', 'Bock'],
        answer: 0,
      },
      {
        text: 'Tequila is distilled from which plant?',
        choices: ['Sugarcane', 'Blue agave', 'Juniper', 'Barley'],
        answer: 1,
      },
      {
        text: 'A Moscow Mule is traditionally served in a mug made of which metal?',
        choices: ['Tin', 'Silver', 'Pewter', 'Copper'],
        answer: 3,
      },
      {
        text: 'Rioja wine comes from which country?',
        choices: ['Italy', 'Portugal', 'Spain', 'France'],
        answer: 2,
      },
      {
        text: 'Gin gets its signature flavor mainly from which berry?',
        choices: ['Juniper', 'Elderberry', 'Blackcurrant', 'Cranberry'],
        answer: 0,
      },
      {
        text: 'Which cocktail combines vodka, coffee liqueur, and cream?',
        choices: ['Black Russian', 'White Russian', 'Cosmopolitan', 'Screwdriver'],
        answer: 1,
      },
      {
        text: 'Guinness gets its dark color from which roasted ingredient?',
        choices: ['Coffee beans', 'Cocoa', 'Chicory', 'Barley'],
        answer: 3,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // sports
  // -------------------------------------------------------------------------
  {
    id: 'sports-basics',
    title: 'Sports Basics',
    category: 'sports',
    blurb: 'Rules, gear, and game day lingo. No sweat required, just your brain.',
    difficulty: 'easy',
    timeLimit: 20,
    questions: [
      {
        text: 'How many players does each soccer team have on the field at once?',
        choices: ['9', '11', '10', '12'],
        answer: 1,
      },
      {
        text: 'In tennis, what is a score of zero called?',
        choices: ['Love', 'Nil', 'Duck', 'Zip'],
        answer: 0,
      },
      {
        text: 'How many points is a touchdown worth in American football?',
        choices: ['3', '5', '6', '7'],
        answer: 2,
      },
      {
        text: 'In golf, what is one stroke under par on a hole called?',
        choices: ['Eagle', 'Bogey', 'Par', 'Birdie'],
        answer: 3,
      },
      {
        text: 'How many players per team are on the court in basketball?',
        choices: ['4', '5', '6', '7'],
        answer: 1,
      },
      {
        text: 'In bowling, what is it called when you knock down all 10 pins on your first ball?',
        choices: ['Strike', 'Spare', 'Split', 'Turkey'],
        answer: 0,
      },
      {
        text: 'How many interlocking rings are on the Olympic flag?',
        choices: ['4', '6', '5', '7'],
        answer: 2,
      },
      {
        text: 'What is a perfect score in a single game of ten-pin bowling?',
        choices: ['100', '200', '250', '300'],
        answer: 3,
      },
      {
        text: 'Which Grand Slam tennis tournament is played on grass?',
        choices: ['French Open', 'Wimbledon', 'US Open', 'Australian Open'],
        answer: 1,
      },
      {
        text: 'In baseball, how many strikes make a strikeout?',
        choices: ['3', '4', '2', '5'],
        answer: 0,
      },
      {
        text: 'A marathon is approximately how many miles long?',
        choices: ['13.1', '24', '26.2', '30'],
        answer: 2,
      },
      {
        text: 'In ice hockey, what is the name of the rubber disc players shoot?',
        choices: ['Ball', 'Shuttle', 'Stone', 'Puck'],
        answer: 3,
      },
    ],
  },
  {
    id: 'sports-legends-big-moments',
    title: 'Legends & Big Moments',
    category: 'sports',
    blurb: 'Iconic athletes and unforgettable moments from the history books.',
    difficulty: 'medium',
    timeLimit: 20,
    questions: [
      {
        text: 'In 1954, who became the first person to run a mile in under four minutes?',
        choices: ['Jesse Owens', 'Carl Lewis', 'Roger Bannister', 'Emil Zatopek'],
        answer: 2,
      },
      {
        text: 'At which Olympics did Jesse Owens win four gold medals?',
        choices: ['Berlin 1936', 'London 1948', 'Paris 1924', 'Los Angeles 1932'],
        answer: 0,
      },
      {
        text: "Which boxer called himself 'The Greatest' and would 'float like a butterfly'?",
        choices: ['Joe Frazier', 'Muhammad Ali', 'Mike Tyson', 'Sugar Ray Leonard'],
        answer: 1,
      },
      {
        text: 'Nadia Comaneci scored the first perfect 10 in Olympic gymnastics for which country?',
        choices: ['Soviet Union', 'Hungary', 'Bulgaria', 'Romania'],
        answer: 3,
      },
      {
        text: "In the 1980 'Miracle on Ice', the US men's hockey team beat which country?",
        choices: ['Canada', 'Finland', 'Soviet Union', 'Sweden'],
        answer: 2,
      },
      {
        text: 'Which country won the first FIFA World Cup in 1930?',
        choices: ['Uruguay', 'Brazil', 'Argentina', 'Italy'],
        answer: 0,
      },
      {
        text: "Which baseball legend was nicknamed 'The Sultan of Swat'?",
        choices: ['Lou Gehrig', 'Babe Ruth', 'Joe DiMaggio', 'Ty Cobb'],
        answer: 1,
      },
      {
        text: 'Michael Jordan won six NBA championships with which team?',
        choices: ['Los Angeles Lakers', 'Boston Celtics', 'New York Knicks', 'Chicago Bulls'],
        answer: 3,
      },
      {
        text: 'Which country hosted the first modern Olympic Games in 1896?',
        choices: ['France', 'Italy', 'Greece', 'United Kingdom'],
        answer: 2,
      },
      {
        text: 'Pele won three World Cups playing for which country?',
        choices: ['Brazil', 'Argentina', 'Portugal', 'Uruguay'],
        answer: 0,
      },
      {
        text: "Who scored the famous 'Hand of God' goal at the 1986 World Cup?",
        choices: ['Pele', 'Diego Maradona', 'Johan Cruyff', 'Zinedine Zidane'],
        answer: 1,
      },
      {
        text: "Who won tennis's 'Golden Slam' in 1988: all four majors plus Olympic gold?",
        choices: ['Martina Navratilova', 'Chris Evert', 'Monica Seles', 'Steffi Graf'],
        answer: 3,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // geography
  // -------------------------------------------------------------------------
  {
    id: 'geography-capitals-flags',
    title: 'Capitals & Flags',
    category: 'geography',
    blurb: 'Big cities and bold colors. Can you name the nation behind each clue?',
    difficulty: 'medium',
    timeLimit: 20,
    questions: [
      { text: "What is the capital of Switzerland?", choices: ["Zurich", "Geneva", "Bern", "Basel"], answer: 2 },
      {
        text: "Which country's flag is white with a single red circle in the center?",
        choices: ['Japan', 'Bangladesh', 'South Korea', 'China'],
        answer: 0,
      },
      {
        text: 'What is the capital of Canada?',
        choices: ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'],
        answer: 2,
      },
      {
        text: "Which country's flag is white with a blue Nordic cross?",
        choices: ['Sweden', 'Norway', 'Iceland', 'Finland'],
        answer: 3,
      },
      {
        text: 'What is the capital of Brazil?',
        choices: ['Rio de Janeiro', 'Brasilia', 'Sao Paulo', 'Salvador'],
        answer: 1,
      },
      {
        text: "Which flag has vertical green, white, and orange stripes, green nearest the pole?",
        choices: ['Ireland', 'Italy', 'India', 'Mexico'],
        answer: 0,
      },
      {
        text: 'What is the capital of Turkey?',
        choices: ['Istanbul', 'Izmir', 'Ankara', 'Antalya'],
        answer: 2,
      },
      {
        text: "Which country's flag shows a red maple leaf between two red side bands?",
        choices: ['United States', 'Switzerland', 'Austria', 'Canada'],
        answer: 3,
      },
      {
        text: 'What is the capital of Egypt?',
        choices: ['Alexandria', 'Cairo', 'Luxor', 'Giza'],
        answer: 1,
      },
      {
        text: "Which country's flag has horizontal stripes of black, red, and gold?",
        choices: ['Germany', 'Belgium', 'Spain', 'Portugal'],
        answer: 0,
      },
      {
        text: 'What is the capital of New Zealand?',
        choices: ['Auckland', 'Christchurch', 'Wellington', 'Queenstown'],
        answer: 2,
      },
      {
        text: "Which country's flag is red with a single large yellow star in the center?",
        choices: ['China', 'Morocco', 'Turkey', 'Vietnam'],
        answer: 3,
      },
    ],
  },
  {
    id: 'geography-around-the-world',
    title: 'Around the World',
    category: 'geography',
    blurb: 'Pack your bags for a whirlwind tour of rivers, ruins, and wonders.',
    difficulty: 'medium',
    timeLimit: 20,
    questions: [
      {
        text: 'Which river flows through Cairo?',
        choices: ['Tigris', 'Congo', 'Nile', 'Euphrates'],
        answer: 2,
      },
      {
        text: 'Machu Picchu is located in which country?',
        choices: ['Peru', 'Mexico', 'Bolivia', 'Chile'],
        answer: 0,
      },
      { text: "The city of Marrakech is in which country?", choices: ["Algeria", "Morocco", "Tunisia", "Egypt"], answer: 1 },
      {
        text: 'The Taj Mahal is located in which Indian city?',
        choices: ['Delhi', 'Mumbai', 'Jaipur', 'Agra'],
        answer: 3,
      },
      {
        text: 'The ancient rock-carved city of Petra is in which country?',
        choices: ['Egypt', 'Turkey', 'Jordan', 'Lebanon'],
        answer: 2,
      },
      {
        text: 'Mount Kilimanjaro is located in which country?',
        choices: ['Tanzania', 'Kenya', 'Uganda', 'Ethiopia'],
        answer: 0,
      },
      {
        text: 'Which river flows through Paris?',
        choices: ['Loire', 'Seine', 'Rhine', 'Thames'],
        answer: 1,
      },
      {
        text: 'The temple complex of Angkor Wat is in which country?',
        choices: ['Thailand', 'Vietnam', 'Laos', 'Cambodia'],
        answer: 3,
      },
      {
        text: 'Which is the largest country in South America by area?',
        choices: ['Argentina', 'Peru', 'Brazil', 'Colombia'],
        answer: 2,
      },
      {
        text: 'The Great Barrier Reef lies off the coast of which Australian state?',
        choices: ['Queensland', 'New South Wales', 'Victoria', 'Western Australia'],
        answer: 0,
      },
      {
        text: 'The Colosseum is located in which city?',
        choices: ['Athens', 'Rome', 'Florence', 'Naples'],
        answer: 1,
      },
      {
        text: 'Which desert covers much of northern Africa?',
        choices: ['Gobi', 'Kalahari', 'Atacama', 'Sahara'],
        answer: 3,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // science-nature
  // -------------------------------------------------------------------------
  {
    id: 'science-nature-animal-kingdom',
    title: 'Animal Kingdom',
    category: 'science-nature',
    blurb: 'Fur, feathers, and fins. How well do you know your fellow creatures?',
    difficulty: 'easy',
    timeLimit: 20,
    questions: [
      {
        text: 'What is a baby kangaroo called?',
        choices: ['Cub', 'Joey', 'Kit', 'Calf'],
        answer: 1,
      },
      { text: "Besides the echidna, which mammal lays eggs?", choices: ["Platypus", "Armadillo", "Pangolin", "Hedgehog"], answer: 0 },
      { text: "What is a male duck called?", choices: ["Gander", "Cob", "Buck", "Drake"], answer: 3 },
      {
        text: 'What is the fastest land animal?',
        choices: ['Lion', 'Pronghorn', 'Greyhound', 'Cheetah'],
        answer: 3,
      },
      {
        text: 'What is a group of lions called?',
        choices: ['Pack', 'Pride', 'Herd', 'Flock'],
        answer: 1,
      },
      {
        text: 'Which mammal is capable of true powered flight?',
        choices: ['Bat', 'Flying squirrel', 'Sugar glider', 'Colugo'],
        answer: 0,
      },
      {
        text: 'What do giant pandas mainly eat?',
        choices: ['Eucalyptus', 'Fish', 'Bamboo', 'Berries'],
        answer: 2,
      },
      {
        text: 'How many hearts does an octopus have?',
        choices: ['One', 'Two', 'Four', 'Three'],
        answer: 3,
      },
      {
        text: 'What is a group of crows called?',
        choices: ['A parliament', 'A murder', 'A gaggle', 'A pod'],
        answer: 1,
      },
      {
        text: 'Which is the tallest animal in the world?',
        choices: ['Giraffe', 'African elephant', 'Ostrich', 'Moose'],
        answer: 0,
      },
      {
        text: 'Koalas are native to which country?',
        choices: ['New Zealand', 'South Africa', 'Australia', 'Indonesia'],
        answer: 2,
      },
      {
        text: 'What type of animal is a Komodo dragon?',
        choices: ['Snake', 'Crocodile', 'Salamander', 'Lizard'],
        answer: 3,
      },
    ],
  },
  {
    id: 'science-nature-space-science',
    title: 'Space & Science',
    category: 'science-nature',
    blurb: 'From atoms to orbits, a quick launch through the wonders of science.',
    difficulty: 'easy',
    timeLimit: 20,
    questions: [
      { text: "What is the name of the galaxy that contains our solar system?", choices: ["Andromeda", "Milky Way", "Whirlpool", "Sombrero"], answer: 1 },
      {
        text: 'What is the chemical symbol for gold?',
        choices: ['Au', 'Ag', 'Go', 'Gd'],
        answer: 0,
      },
      {
        text: 'Which planet is closest to the Sun?',
        choices: ['Venus', 'Mercury', 'Mars', 'Earth'],
        answer: 1,
      },
      {
        text: 'Who was the first person to walk on the Moon?',
        choices: ['Buzz Aldrin', 'Yuri Gagarin', 'John Glenn', 'Neil Armstrong'],
        answer: 3,
      },
      { text: "What is the hardest natural substance on Earth?", choices: ["Quartz", "Granite", "Diamond", "Topaz"], answer: 2 },
      {
        text: 'Which is the largest planet in our solar system?',
        choices: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'],
        answer: 0,
      },
      {
        text: 'At sea level, water boils at what temperature in degrees Celsius?',
        choices: ['90', '100', '120', '212'],
        answer: 1,
      },
      {
        text: 'Which planet is famous for its bright, prominent ring system?',
        choices: ['Mars', 'Jupiter', 'Venus', 'Saturn'],
        answer: 3,
      },
      {
        text: 'What is the dense center of an atom called?',
        choices: ['Electron', 'Orbital', 'Nucleus', 'Shell'],
        answer: 2,
      },
      {
        text: 'Who developed the theory of general relativity?',
        choices: ['Albert Einstein', 'Isaac Newton', 'Niels Bohr', 'Stephen Hawking'],
        answer: 0,
      },
      {
        text: 'Which force keeps the planets in orbit around the Sun?',
        choices: ['Magnetism', 'Gravity', 'Friction', 'Static electricity'],
        answer: 1,
      },
      {
        text: "What is the most abundant gas in Earth's atmosphere?",
        choices: ['Oxygen', 'Carbon dioxide', 'Argon', 'Nitrogen'],
        answer: 3,
      },
    ],
  },
];
