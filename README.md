# Hanzi Movie Method - Chinese Character Learning Database

A Next.js web application for learning Chinese characters using the **Hanzi Movie Method** from Mandarin Blueprint.

## What is the Hanzi Movie Method?

The Hanzi Movie Method is a mnemonic system for learning Chinese characters that combines:

- **Actors** - Represent the initial sound of the pinyin (e.g., Jackie Chan for "j-")
- **Sets** - Locations that represent the final sound + tone (e.g., your childhood home for "-an" tone 1)
- **Props** - Objects that represent character components/radicals
- **Movie Scenes** - Vivid, memorable scenes combining all elements to encode the character

## Features

- 📝 **Character Management** - Add, edit, and delete Chinese characters with their movie scenes
- 🎭 **Actor Database** - Manage actors for each pinyin initial sound
- 🎬 **Set Database** - Organize locations by final sound and tone
- 🎪 **Props Database** - Track components/radicals as memorable props
- 📖 **Review System** - Flashcard-style review with progress tracking
- 🔍 **Search & Filter** - Find characters by hanzi, pinyin, or meaning
- 💾 **Local Storage** - All data persisted in browser storage

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm (comes with Node.js)

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Start by creating Actors** - Go to the Actors page and add actors for each pinyin initial you want to learn
2. **Create Sets** - Add locations for each final sound + tone combination
3. **Add Props** - Create props for character components/radicals
4. **Add Characters** - Combine actors, sets, and props into vivid movie scenes
5. **Review Regularly** - Use the Review feature to strengthen your memory

## Docker

Run the app using Docker Compose:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

The app will be available at:

- **Frontend**: http://localhost:3000
- **HanziPy API**: http://localhost:5000

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- Local Storage - Data persistence

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── actors/          # Actors management page
│   ├── characters/      # Characters management page
│   ├── props/           # Props management page
│   ├── review/          # Review/flashcard page
│   ├── sets/            # Sets management page
│   ├── layout.tsx       # Root layout with sidebar
│   └── page.tsx         # Dashboard/home page
├── components/          # React components
│   ├── ActorForm.tsx
│   ├── CharacterCard.tsx
│   ├── CharacterForm.tsx
│   ├── PropForm.tsx
│   ├── SetForm.tsx
│   └── Sidebar.tsx
├── hooks/               # Custom React hooks
│   └── useLocalStorage.ts
├── lib/                 # Utility functions
│   └── storage.ts       # Local storage operations
└── types/               # TypeScript type definitions
    └── index.ts
```

## License

MIT
