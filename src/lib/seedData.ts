// Seed data for the Hanzi Movie Method database
// This file contains initial data that can be imported into the app

// Example actors for Hanzi Movie Method initials
// Categories: Male (basic initials), Female (y-/i- initials), Fictional (w-/u- initials), Basketball Players (ü initials)

export const exampleActors = [
  // MALE actors - initials: b-, p-, m-, f-, d-, t-, n-, l-, g-, k-, h-, zh-, ch-, sh-, r-, z-, c-, s-, Ø (null initial)
  { name: "Bobby Lee", initial: "b-", emoji: "🤪", category: "male" },
  { name: "Pewdiepie", initial: "p-", emoji: "🎮", category: "male" },
  { name: "Mike Tyson", initial: "m-", emoji: "🥊", category: "male" },
  { name: "Pharrell", initial: "f-", emoji: "🎶", category: "male" },
  { name: "Dave Chappelle", initial: "d-", emoji: "🤣", category: "male" },
  { name: "Tom Cruise", initial: "t-", emoji: "🧗‍♂️", category: "male" },
  { name: "Neil deGrasse Tyson", initial: "n-", emoji: "🌌", category: "male" },
  { name: "Leonardo DiCaprio", initial: "l-", emoji: "🚢", category: "male" },
  { name: "George W. Bush", initial: "g-", emoji: "🛢️", category: "male" },
  { name: "Keanu Reeves", initial: "k-", emoji: "🔫", category: "male" },
  { name: "Hugh Jackman", initial: "h-", emoji: "🐺", category: "male" },
  { name: "Jimmy O Yang", initial: "zh-", emoji: "🏓", category: "male" },
  { name: "Channing Tatum", initial: "ch-", emoji: "🎩", category: "male" },
  { name: "Shohei Ohtani", initial: "sh-", emoji: "⚾", category: "male" },
  { name: "Robert Downey Jr", initial: "r-", emoji: "🦾", category: "male" },
  { name: "Jay Z", initial: "z-", emoji: "🗽", category: "male" },
  { name: "Chris Rock", initial: "c-", emoji: "🪨", category: "male" },
  { name: "iShow(Speed)", initial: "s-", emoji: "🏃🏿", category: "male" },
  { name: "Elon Musk", initial: "Ø-", emoji: "🤖", category: "male" },

  // FEMALE actors - initials: y-, bi-, pi-, mi-, di-, ti-, ji-, qi-, xi-, ni-, li-
  { name: "Michelle Yeoh", initial: "y-", emoji: "🐅", category: "female" },
  { name: "Billie Eilish", initial: "bi-", emoji: "🧢", category: "female" },
  { name: "Pink", initial: "pi-", emoji: "🩷", category: "female" },
  { name: "Michelle Obama", initial: "mi-", emoji: "👩🏿", category: "female" },
  { name: "Cameron Diaz", initial: "di-", emoji: "🎭", category: "female" },
  { name: "TEA (Tanya)", initial: "ti-", emoji: "🍵", category: "female" },
  { name: "Jisoo", initial: "ji-", emoji: "🪷", category: "female" },
  { name: "Chiquita", initial: "qi-", emoji: "👶🏻", category: "female" },
  { name: "Sta(cie)", initial: "xi-", emoji: "✈️", category: "female" },
  { name: "Han(ni)", initial: "ni-", emoji: "😻", category: "female" },
  { name: "Lisa", initial: "li-", emoji: "💋", category: "female" },

  // FICTIONAL characters - initials: w-, bu-, pu-, mu-, fu-, du-, tu-, nu-, lu-, zu-, cu-, su-, zhu-, chu-, shu-, ru-, ku-, hu-, gu-
  { name: "Walter White", initial: "w-", emoji: "🧪", category: "fictional" },
  { name: "Bugs Bunny", initial: "bu-", emoji: "🐰", category: "fictional" },
  { name: "Pooh Bear", initial: "pu-", emoji: "🍯", category: "fictional" },
  { name: "Mulan", initial: "mu-", emoji: "⚔️", category: "fictional" },
  { name: "Kung (Fu) Panda", initial: "fu-", emoji: "🐼", category: "fictional" },
  { name: "Duke Nukem", initial: "du-", emoji: "💥", category: "fictional" },
  { name: "Tupac", initial: "tu-", emoji: "🤬", category: "fictional" },
  { name: "Nutty Professor", initial: "nu-", emoji: "👨🏿‍🏫", category: "fictional" },
  { name: "Luke Skywalker", initial: "lu-", emoji: "💫", category: "fictional" },
  { name: "Zuko", initial: "zu-", emoji: "🔥", category: "fictional" },
  { name: "Edward Cullen", initial: "cu-", emoji: "🧛🏻‍♂️", category: "fictional" },
  { name: "Super Mario", initial: "su-", emoji: "🍄", category: "fictional" },
  { name: "Piglet", initial: "zhu-", emoji: "🐷", category: "fictional" },
  { name: "Pika(chu)", initial: "chu-", emoji: "⚡", category: "fictional" },
  { name: "Mu(shu)", initial: "shu-", emoji: "🐉", category: "fictional" },
  { name: "Rufio", initial: "ru-", emoji: "🗡", category: "fictional" },
  { name: "A(ku)ma", initial: "ku-", emoji: "👺", category: "fictional" },
  { name: "Hulk", initial: "hu-", emoji: "👽", category: "fictional" },
  { name: "Forrest (Gu)mp", initial: "gu-", emoji: "🍫", category: "fictional" },

  // BASKETBALL PLAYERS - initials: yu-, nü-, lü-, ju-, qu-, xu-
  { name: "Yao Ming", initial: "yu-", emoji: "🚀", category: "basketball_players" },
  { name: "Ma(nu) Ginobili", initial: "nü-", emoji: "𖤓", category: "basketball_players" },
  { name: "Skip to my (Lu)", initial: "lü-", emoji: "⏭️", category: "basketball_players" },
  { name: "Julius Erving", initial: "ju-", emoji: "👨🏾‍⚕️", category: "basketball_players" },
  { name: "Sha(qu)ille O'Neal", initial: "qu-", emoji: "👨🏿‍🦲", category: "basketball_players" },
  { name: "Sue Bird", initial: "xu-", emoji: "🐦", category: "basketball_players" },
];

// Example rooms for each tone
export const exampleRooms = [
  { name: "Bathroom", tone: 1, emoji: "🚿", description: "Tone 1 (high level ā) - You go to the bathroom in the morning, waking up" },
  { name: "Kitchen", tone: 2, emoji: "🍽️", description: "Tone 2 (rising á) - After you get up you go to the kitchen to eat breakfast, energy rises" },
  { name: "Office", tone: 3, emoji: "👨🏻‍💻", description: "Tone 3 (dipping ǎ) - You use up your energy at work and look forward to going home, energy goes down before going back up" },
  { name: "Bedroom", tone: 4, emoji: "🛌", description: "Tone 4 (falling à) - You're tired after a long day, energy falls" },
  { name: "Dream land", tone: 5, emoji: "💤", description: "Tone 5 (neutral a) - You're asleep, neutral feeling" },
];

// Example sets for HMM finals: -a, -ai, -ao, -an, -ang, -o, -ong, -ou, -e, -ei, -(e)n, -(e)ng
export const exampleSets = [  
  { name: "Childhood Home", final: "-Ø", emoji: "🏡" },
  { name: "Australia", final: "-a", emoji: "🦘" },
  { name: "Chiang Mai", final: "-ai", emoji: "🐘" },
  { name: "Macau", final: "-ao", emoji: "🎰" },
  { name: "Xi'an", final: "-an", emoji: "🏯" },
  { name: "Shanghai", final: "-ang", emoji: "🥟" },
  { name: "Kuala Lumpur", final: "-o", emoji: "🐒" },
  { name: "Hong Kong", final: "-ong", emoji: "🌸" },
  { name: "Seoul", final: "-ou", emoji: "🫰" },
  { name: "Osaka", final: "-e", emoji: "⛩" },
  { name: "Beijing", final: "-(e)i", emoji: "🏛️" },
  { name: "Shenzhen", final: "-(e)n", emoji: "🚄" },
  { name: "Chengdu", final: "-(e)ng", emoji: "🫕" },
];
