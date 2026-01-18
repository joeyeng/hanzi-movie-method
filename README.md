# Hanzi Movie Method - Chinese Character Learning Database

A Next.js web application for learning Chinese characters using the **Hanzi Movie Method** from Mandarin Blueprint.

## What is the Hanzi Movie Method?

The Hanzi Movie Method is a mnemonic system for learning Chinese characters that combines:

- **Actors** - Represent the initial sound of the pinyin (e.g., Jackie Chan for "j-")
- **Sets** - Locations that represent the final sound (e.g., your childhood home for "-an")
- **Rooms** - Specific rooms within sets that represent tones (e.g., living room = tone 1)
- **Props/Components** - Objects that represent character components/radicals
- **Movie Scenes** - Vivid, memorable scenes combining all elements to encode the character

## Features

### Character Management

- 📝 Add, edit, and delete Chinese characters with their movie scenes
- 🔍 Search & filter by hanzi, pinyin, or meaning
- 📊 View character decomposition and components
- 🔗 Track compound words containing each character

### Database Management

- 🎭 **Actors** - Organize by category (male, female, fictional, basketball players) with initial sound assignments
- 🏠 **Sets** - Manage locations by final sound with automatic HMM final mapping
- 🚪 **Rooms** - Assign rooms to tones (1-5) within each set
- 🧩 **Components** - View and manage character components/radicals

### Import System

- 📥 Import example actors, sets, and rooms with one click
- 🔄 Smart import updates existing entries instead of creating duplicates
- 📋 Default descriptions loaded from centralized configuration

### Review System

- 📖 Flashcard-style review with progress tracking
- ⭐ Track review status and accuracy
- 🎯 Focus on characters that need more practice

### API Integration

- 🔤 Pinyin segmentation with intelligent final sound parsing
- 🧱 Character decomposition via HanziPy
- 📚 Example sentences from Tatoeba database
- 📖 Dictionary lookups via CC-CEDICT

## Tech Stack

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[Docker](https://www.docker.com/)** - Containerized deployment
- **[Python Flask](https://flask.palletsprojects.com/)** - Backend API services
- **Local Storage** - Client-side data persistence

### Backend Services

- **HanziPy Server** (Port 6001) - Character decomposition using hanzipy and jieba
- **Tatoeba Server** (Port 6002) - Example sentence lookups

## Getting Started

### Prerequisites

- Docker and Docker Compose (recommended)
- Or: Node.js 18.17+, Python 3.9+

### Quick Start with Docker

```bash
# Clone the repository
git clone <repository-url>
cd hanzi-movie-method

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

The app will be available at:

- **Frontend**: http://localhost:6000
- **HanziPy API**: http://localhost:6001
- **Tatoeba API**: http://localhost:6002

### Manual Installation

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Install Python dependencies for backend services:

   ```bash
   cd hanzipy_server && pip install -r requirements.txt
   cd ../tatoeba_server && pip install flask
   ```

3. Start the services:

   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - HanziPy server
   cd hanzipy_server && python server.py

   # Terminal 3 - Tatoeba server
   cd tatoeba_server && python server.py
   ```

4. Open [http://localhost:6000](http://localhost:6000)

## Usage

1. **Import Example Data** - Go to the Import page and load example actors, sets, and rooms
2. **Customize Your Database** - Edit actors, sets, and rooms to use your own memorable associations
3. **Add Characters** - Create movie scenes combining actors, sets, rooms, and components
4. **Review Regularly** - Use the Review feature to strengthen your memory

## Project Structure

```
hanzi-movie-method/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── actors/             # Actors management
│   │   ├── api/                # API routes
│   │   │   ├── examples/       # Example sentences API
│   │   │   └── hanzi/          # Character decomposition API
│   │   ├── characters/         # Character management
│   │   │   └── [id]/           # Individual character view
│   │   ├── component/          # Component details
│   │   ├── compounds/          # Compound words
│   │   │   └── [id]/           # Individual compound view
│   │   ├── database/           # Database overview
│   │   ├── import/             # Data import page
│   │   ├── props/              # Props/components management
│   │   ├── review/             # Flashcard review
│   │   ├── rooms/              # Rooms management
│   │   ├── sets/               # Sets management
│   │   ├── layout.tsx          # Root layout with sidebar
│   │   └── page.tsx            # Dashboard/home page
│   ├── components/             # React components
│   │   ├── ActorForm.tsx       # Actor add/edit form
│   │   ├── CharacterCard.tsx   # Character display card
│   │   ├── CharacterForm.tsx   # Character add/edit form
│   │   ├── CompoundCard.tsx    # Compound word card
│   │   ├── EmojiPicker.tsx     # Emoji selection component
│   │   ├── PropForm.tsx        # Prop add/edit form
│   │   ├── RoomForm.tsx        # Room add/edit form
│   │   ├── SetForm.tsx         # Set add/edit form
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── StudyCard.tsx       # Review flashcard
│   ├── hooks/                  # Custom React hooks
│   │   └── useLocalStorage.ts  # Local storage hook
│   ├── lib/                    # Utility functions
│   │   ├── cedict.ts           # CC-CEDICT dictionary utilities
│   │   ├── defaults.json       # Default descriptions for actors/sets
│   │   ├── hanzipy.ts          # HanziPy API client
│   │   ├── seedData.ts         # Example data for imports
│   │   └── storage.ts          # Local storage operations
│   └── types/                  # TypeScript type definitions
│       └── index.ts            # Core type definitions
├── hanzipy_server/             # Python HanziPy service
│   ├── Dockerfile
│   ├── requirements.txt
│   └── server.py
├── tatoeba_server/             # Python Tatoeba service
│   ├── Dockerfile
│   └── server.py
├── docker-compose.yml          # Docker orchestration
├── Dockerfile                  # Production frontend build
├── Dockerfile.dev              # Development frontend build
└── package.json
```

## HMM Sound Mappings

### Initial Sounds (Actors by Category)

- **Male**: b-, p-, m-, f-, d-, t-, n-, l-, g-, k-, h-, zh-, ch-, sh-, r-, z-, c-, s-, Ø-
- **Female**: y-, bi-, pi-, mi-, di-, ti-, ji-, qi-, xi-, ni-, li-
- **Fictional**: w-, bu-, pu-, mu-, fu-, du-, tu-, nu-, lu-, zu-, cu-, su-, zhu-, chu-, shu-, ru-, ku-, hu-, gu-
- **Basketball Players**: yu-, nü-, lü-, ju-, qu-, xu-

### Final Sounds (Sets)

- -Ø (null), -a, -ai, -ao, -an, -ang, -o, -ong, -ou, -e, -(e)i, -(e)n, -(e)ng

### Tones (Rooms)

- Tone 1 (high level), Tone 2 (rising), Tone 3 (dipping), Tone 4 (falling), Tone 5 (neutral)

## License

MIT
