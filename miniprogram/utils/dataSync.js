// utils/dataSync.js
// 数据同步工具模块

/**
 * 获取当前账号的存储key
 */
function getAccountKey(key) {
  const currentAccount = wx.getStorageSync('currentAccount');
  if (!currentAccount) {
    return key;
  }
  return `account_${currentAccount}_${key}`;
}

/**
 * 同步用户基本信息到记录页面
 */
function syncUserInfoToToday() {
  try {
    const userData = wx.getStorageSync(getAccountKey('userData'));
    if (!userData) return;

    // 获取记录页面的实例
    const pages = getCurrentPages();
    const todayPage = pages.find(page => page.route === 'pages/diet-exercise/today/today');
    
    if (todayPage) {
      // 更新用户信息
      const userInfo = {
        sex: userData.gender === '男' ? 'male' : 'female',
        weight: userData.weight || 70,
        height: userData.height || 175,
        age: userData.age || 25,
        activityFactor: 1.55
      };
      
      todayPage.setData({
        userInfo: userInfo
      });
      
      // 重新计算能量平衡
      if (typeof todayPage.calculateEnergyBalance === 'function') {
        todayPage.calculateEnergyBalance();
      }
    }
  } catch (e) {
    console.error('同步用户信息到记录页面失败', e);
  }
}

/**
 * 同步今日摄入数据到我的页面
 */
function syncIntakeToMine() {
  try {
    const todayData = wx.getStorageSync(getAccountKey('todayData'));
    if (!todayData) return;

    // 获取我的页面的实例
    const pages = getCurrentPages();
    const minePage = pages.find(page => page.route === 'pages/mine/index/index');
    
    if (minePage) {
      const userData = wx.getStorageSync(getAccountKey('userData')) || {};
      const currentIntake = todayData.intake || 0;
      const targetIntake = userData.targetIntake || 2000;
      const intakePercent = targetIntake > 0 ? Math.min(100, Math.round((currentIntake / targetIntake) * 100)) : 0;
      
      minePage.setData({
        currentIntake: currentIntake,
        targetIntake: targetIntake,
        intakePercent: intakePercent
      });
      
      // 保存更新后的数据
      if (typeof minePage.saveUserData === 'function') {
        minePage.saveUserData();
      }
    }
  } catch (e) {
    console.error('同步摄入数据到我的页面失败', e);
  }
}

/**
 * 从记录页面同步数据到我的页面
 */
function syncFromTodayToMine() {
  try {
    const currentAccount = wx.getStorageSync('currentAccount');
    if (!currentAccount) return;
    
    const pages = getCurrentPages();
    const todayPage = pages.find(page => page.route === 'pages/diet-exercise/today/today');
    const minePage = pages.find(page => page.route === 'pages/mine/index/index');
    
    if (todayPage && minePage) {
      const intake = todayPage.data.intake || 0;
      const userDataKey = `account_${currentAccount}_userData`;
      const userData = wx.getStorageSync(userDataKey) || {};
      const targetIntake = userData.targetIntake || 2000;
      const intakePercent = targetIntake > 0 ? Math.min(100, Math.round((intake / targetIntake) * 100)) : 0;
      
      minePage.setData({
        currentIntake: intake,
        targetIntake: targetIntake,
        intakePercent: intakePercent
      });
      
      // 更新本地存储
      const updatedUserData = {
        ...userData,
        currentIntake: intake,
        targetIntake: targetIntake,
        intakePercent: intakePercent
      };
      wx.setStorageSync(userDataKey, updatedUserData);
    }
  } catch (e) {
    console.error('从记录页面同步数据失败', e);
  }
}

/**
 * 从我的页面同步用户信息到记录页面
 */
function syncFromMineToToday() {
  try {
    const pages = getCurrentPages();
    const minePage = pages.find(page => page.route === 'pages/mine/index/index');
    const todayPage = pages.find(page => page.route === 'pages/diet-exercise/today/today');
    
    if (minePage && todayPage) {
      const userData = {
        sex: minePage.data.gender === '男' ? 'male' : 'female',
        weight: minePage.data.weight || 70,
        height: minePage.data.height || 175,
        age: minePage.data.age || 25,
        activityFactor: 1.55
      };
      
      todayPage.setData({
        userInfo: userData
      });
      
      // 重新计算能量平衡
      if (typeof todayPage.calculateEnergyBalance === 'function') {
        todayPage.calculateEnergyBalance();
      }
    }
  } catch (e) {
    console.error('从我的页面同步用户信息失败', e);
  }
}

/**
 * 保存今日数据到本地存储
 */
function saveTodayData(data) {
  try {
    wx.setStorageSync(getAccountKey('todayData'), data);
    
    // 同步到我的页面
    syncIntakeToMine();
  } catch (e) {
    console.error('保存今日数据失败', e);
  }
}

/**
 * 保存用户数据到本地存储
 */
function saveUserData(data) {
  try {
    wx.setStorageSync(getAccountKey('userData'), data);
    
    // 同步到记录页面
    syncUserInfoToToday();
  } catch (e) {
    console.error('保存用户数据失败', e);
  }
}

module.exports = {
  getAccountKey,
  syncUserInfoToToday,
  syncIntakeToMine,
  syncFromTodayToMine,
  syncFromMineToToday,
  saveTodayData,
  saveUserData
};
