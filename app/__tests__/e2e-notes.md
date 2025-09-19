# E2E Testing Notes for Board Component

## Critical Test Cases

### 1. Last Cell Visibility Test
**Objective**: Ensure the bottom-right cell (position 7,7) is fully visible on all devices.

**Test Steps**:
1. Load any level on various device sizes (iPhone SE, iPad, Android tablets)
2. Scroll to ensure the entire board is visible
3. Verify the last cell (bottom-right) is completely within the viewport
4. Check that the cell content (number) is fully readable
5. Verify touch interaction works on the last cell

**Expected Result**: The last cell should be fully visible with no clipping or overflow.

### 2. Board Square Verification
**Objective**: Confirm the board maintains a perfect square aspect ratio.

**Test Steps**:
1. Measure board outer dimensions using developer tools
2. Verify width === height for the board frame
3. Test on different orientations (portrait/landscape)
4. Verify square ratio is maintained during device rotation

**Expected Result**: Board should always be perfectly square regardless of device or orientation.

### 3. Touch Accuracy Test
**Objective**: Ensure touch coordinates map correctly to grid positions.

**Test Steps**:
1. Tap each corner cell individually
2. Tap center cells
3. Drag selection across multiple cells
4. Verify selection highlights match touched areas
5. Test edge cases (touching near cell boundaries)

**Expected Result**: Touch input should accurately select the intended cells with no offset errors.

### 4. Font Scaling Test
**Objective**: Verify text remains readable and properly sized across devices.

**Test Steps**:
1. Check font size calculation: fontSize = Math.floor(cellSize * 0.52)
2. Verify allowFontScaling={false} prevents system scaling
3. Test with device accessibility settings (large text)
4. Ensure text fits within cell boundaries
5. Verify lineHeight === cellSize for proper centering

**Expected Result**: Text should be consistently sized and centered regardless of system settings.

### 5. Performance Test
**Objective**: Ensure smooth rendering and interaction performance.

**Test Steps**:
1. Load board with maximum tiles (64 tiles)
2. Perform rapid selection gestures
3. Monitor frame rate during animations
4. Test on lower-end devices
5. Verify no memory leaks during extended play

**Expected Result**: Smooth 60fps performance with no stuttering or memory issues.

## Device-Specific Tests

### Small Screens (iPhone SE, small Android)
- Verify minimum cell size is maintained
- Check that board doesn't exceed screen bounds
- Ensure touch targets are large enough (minimum 44px)

### Large Screens (iPad, Android tablets)
- Verify board scales appropriately
- Check maximum size limits are respected
- Ensure board remains centered

### Landscape Orientation
- Verify board adapts to landscape layout
- Check header height calculations
- Ensure safe area handling works correctly

## Automated Test Scenarios

```javascript
// Example test structure
describe('Board Overflow Prevention', () => {
  test('board fits in viewport on all screen sizes', () => {
    const screenSizes = [
      { width: 375, height: 667 }, // iPhone SE
      { width: 414, height: 896 }, // iPhone 11
      { width: 768, height: 1024 }, // iPad
    ];
    
    screenSizes.forEach(size => {
      // Test board sizing calculations
      // Verify no overflow occurs
    });
  });
});
```

## Manual Testing Checklist

- [ ] Last cell fully visible on iPhone SE
- [ ] Last cell fully visible on iPad
- [ ] Board maintains square aspect ratio
- [ ] Touch selection works accurately
- [ ] Font size appropriate on all devices
- [ ] No horizontal scrolling required
- [ ] No vertical overflow beyond safe areas
- [ ] Smooth animation performance
- [ ] Proper handling of device rotation
- [ ] Accessibility features work correctly