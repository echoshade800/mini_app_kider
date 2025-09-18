/**
 * Level Grid System - 简化的关卡数字方块增长规则
 * Purpose: 仅定义数字方块的数量增长，不涉及棋盘尺寸
 */

/**
 * 根据关卡获取数字方块填充率
 * @param {number} level 关卡数 (1-200+)
 * @returns {number} 填充率 (0-1)
 */
export function getTileFillRatio(level) {
  // 关卡 → 填充率增长表（1–200）
  if (level >= 1 && level <= 10) {
    return 0.3;    // 新手引导，方块少
  }
  if (level >= 11 && level <= 20) {
    return 0.4;    // 逐步增加
  }
  if (level >= 21 && level <= 30) {
    return 0.5;
  }
  if (level >= 31 && level <= 50) {
    return 0.6;
  }
  if (level >= 51 && level <= 80) {
    return 0.7;    // 中期稳态
  }
  if (level >= 81 && level <= 120) {
    return 0.75;
  }
  if (level >= 121 && level <= 200) {
    return 0.8;    // 高难度
  }
  
  // 200关以后继续使用高填充率
  return 0.8;
}

/**
 * 根据关卡获取数字分布策略
 * @param {number} level 关卡数
 * @returns {Object} 数字分布配置
 */
export function getNumberDistribution(level) {
  if (level <= 30) {
    return {
      smallNumbers: 0.6,  // 1-3的比例
      mediumNumbers: 0.3, // 4-6的比例
      largeNumbers: 0.1   // 7-9的比例
    };
  }
  
  if (level <= 80) {
    return {
      smallNumbers: 0.5,
      mediumNumbers: 0.4,
      largeNumbers: 0.1
    };
  }
  
  return {
    smallNumbers: 0.4,
    mediumNumbers: 0.4,
    largeNumbers: 0.2
  };
}