# KiderCrash

A React Native (Expo) puzzle game where players draw rectangles to select tiles that sum to 10. Progress through 200+ educational stages or challenge yourself in a 60-second IQ sprint.

## Features

- **Level Mode**: Progress through 200+ named stages from daycare to cosmic adventures
- **Challenge Mode**: 60-second timed gameplay with IQ scoring
- **Local Storage**: All data stored on device, no internet required
- **Touch Gameplay**: Draw rectangles with your finger to select tiles
- **Educational Theme**: Stages named after life milestones from daycare to beyond

## Installation

1. Install dependencies:
```bash
npx expo install
```

2. Start the development server:
```bash
npx expo start
```

3. Run on your preferred platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator  
- Press `w` for web browser
- Scan QR code with Expo Go app on your device

## Project Structure

```
app/
├── (tabs)/           # Tab navigation screens
│   ├── index.js      # Home dashboard
│   ├── levels.js     # Level selection
│   ├── challenge.js  # Challenge mode
│   └── profile.js    # Settings & profile
├── components/       # Reusable components
├── store/           # Zustand state management
├── utils/           # Utilities and helpers
├── onboarding.js    # Welcome & tutorial
├── details/[id].js  # Level detail screen
├── about.js         # Help & information
└── _layout.js       # Root navigation
```

## Game Rules

1. **Draw Rectangles**: Drag your finger to select tiles in rectangular shapes
2. **Sum to 10**: Selected tiles must sum to exactly 10 to clear
3. **Visual Feedback**: Green = success (sum = 10), Blue = try again (sum ≠ 10)
4. **SwapMaster Items**: Swap any two tiles (earned by completing levels)
5. **Split Items**: Break a tile into 3-4 smaller tiles (earned by completing levels)
6. **Multi-page Levels**: Higher levels (80+) require clearing multiple boards
7. **Rectangle Only**: No L-shapes or irregular selections allowed

## Development

### Adding New Screens

1. Create screen file in appropriate directory
2. Add navigation route in `_layout.js` or tab layout
3. Import and use shared components from `/components`
4. Use `useGameStore()` for state management

### Extending Game Logic

- **Board Generation**: Modify `utils/boardGenerator.js`
- **Difficulty Scaling**: Adjust parameters in board generator
- **Stage Names**: Update `utils/stageNames.js`
- **Storage**: Extend `utils/StorageUtils.js`

### State Management

Uses Zustand for lightweight state management:
- `userData`: User profile and identity
- `gameData`: Progress, scores, items
- `settings`: App preferences

## Build & Deploy

### Development Build
```bash
npx expo build:ios
npx expo build:android
```

### Production Build
```bash
npx expo build:ios --release-channel production
npx expo build:android --release-channel production
```

### Web Build
```bash
npx expo export:web
```

## Next Steps

Here are concrete improvements to implement:

1. **Enhanced Board Generator**: Add more sophisticated difficulty algorithms with guaranteed solvability validation
2. **Polished Animations**: Implement tile explosion effects, smooth transitions, and celebration animations
3. **Change Item Tutorial**: Add interactive tutorial showing how to use Change items effectively
4. **Difficulty Validators**: Create tools to test and balance level difficulty progression
5. **Internationalization**: Add multi-language support for stage names and UI text
6. **Accessibility**: Implement screen reader support, high contrast mode, and larger text options
7. **Save Export/Import**: Allow users to backup and restore their progress across devices
8. **Achievement System**: Add badges and milestones for completing stage groups or reaching IQ thresholds

## Technical Notes

- **Expo SDK**: Uses Expo 53.0.20 for maximum compatibility
- **Navigation**: Expo Router with tab + stack navigation
- **Storage**: AsyncStorage for local data persistence
- **Gestures**: React Native Gesture Handler for smooth touch interactions
- **Haptics**: Expo Haptics for tactile feedback
- **Cross-Platform**: Runs on iOS, Android, and Web

## License

MIT License - see LICENSE file for details.