# Daycare Number Elimination

Clear tiles by drawing rectangles summing to 10 — climb 200+ school-life levels or sprint in a 60s IQ Challenge.

## Features

### Game Modes
- **Level Mode**: Progress through 200+ named levels from daycare to cosmic adventures
- **Challenge Mode**: 60-second IQ sprint with scoring and titles

### Core Gameplay
- Draw rectangles on a grid to select tiles
- Rectangles must sum to exactly 10 to clear
- Use Change items to swap tiles when stuck
- Beautiful classroom-themed design with wooden frame and green chalkboard

### Progression System
- Earn Change items by completing levels
- Track best level and challenge IQ scores
- Persistent progress saved locally and synced to backend

## Installation

### Prerequisites
- Node.js 20+
- MySQL database access
- Expo CLI: `npm install -g @expo/cli`

### Frontend Setup

1. Install dependencies:
```bash
expo install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your API base URL:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

4. Start the Expo development server:
```bash
npm run dev
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials:
```
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password  
DB_DATABASE=your-database-name
PORT=8080
```

5. Initialize the database:
```bash
npm run init-db
```

6. Start the server:
```bash
npm run dev
```

## API Usage Examples

### Health Check
```bash
curl http://localhost:8080/api/health
```

### User Sync
```bash
curl -X POST http://localhost:8080/api/user/sync \
  -H "Content-Type: application/json" \
  -d '{"uid":"user123","email":"test@example.com","nickname":"Player1"}'
```

### Get Level Board
```bash
curl http://localhost:8080/api/board/level/1
```

### Settle Progress
```bash
curl -X POST http://localhost:8080/api/progress/settle \
  -H "Content-Type: application/json" \
  -d '{"uid":"user123","level":1,"changeItemsDelta":1}'
```

## Architecture

### Frontend (React Native + Expo)
- **Navigation**: Expo Router with stack navigation
- **State Management**: Zustand for global state
- **Storage**: AsyncStorage for local persistence
- **Styling**: React Native StyleSheet

### Backend (Node.js + Express)
- **Database**: MySQL with connection pooling
- **Validation**: Zod schemas
- **API**: RESTful endpoints with structured error handling

## Database Schema

### users
- `id` - Auto-increment primary key
- `uid` - Unique user identifier
- `email` - Optional email address
- `nickname` - Optional display name
- `meta_json` - JSON metadata
- `created_at`, `updated_at` - Timestamps

### levels
- `level` - Level number (1-200)
- `stage_name` - Display name for level

### user_progress
- `user_id` - Foreign key to users
- `current_level` - Current level being played
- `best_level` - Highest level completed
- `change_items` - Number of change items owned

### user_challenge_record
- `user_id` - Foreign key to users
- `best_iq` - Highest IQ score achieved
- `best_iq_title` - Title corresponding to best IQ
- `last_iq` - Most recent IQ score

## Next Steps

1. **Pagination & Infinite Scroll**: Implement efficient loading for large level lists
2. **Optimistic Updates**: Update UI immediately while syncing to backend
3. **Error Boundaries**: Add React error boundaries for better error handling
4. **Analytics**: Add event tracking for gameplay metrics
5. **E2E Testing**: Implement automated testing with Detox or similar
6. **Offline Cache**: Cache boards locally for offline play
7. **Push Notifications**: Remind users about daily challenges
8. **Social Features**: Add leaderboards and friend challenges

## Development Commands

### Frontend
```bash
npm run dev          # Start Expo dev server
npm run build:web    # Build for web deployment
```

### Backend  
```bash
npm run dev          # Start development server
npm run init-db      # Initialize database schema
```

## Game Design

### Difficulty Scaling
- **Levels 1-40**: Easy - Adjacent pairs, small rectangles
- **Levels 41-90**: Medium - Scattered pairs, larger rectangles needed  
- **Levels 91-200+**: Hard - Edge/corner placements, interference numbers
- **Challenge Mode**: Uses level 130+ difficulty parameters

### Board Generation
- Deterministic based on level seed
- Guaranteed solvable with optional single-change assistance
- Scales from 4x4 (16 tiles) to 12x11 (132 tiles) maximum

## License

MIT License - see LICENSE file for details.