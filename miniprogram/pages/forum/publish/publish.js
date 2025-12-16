// pages/forum/publish/publish.js
Page({
  data: {
    statusBarHeight: 0,
    navbarHeight: 132,
    content: '',
    images: []
  },

  onLoad() {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navbarHeight = statusBarHeight + 88;
    
    this.setData({
      statusBarHeight: statusBarHeight,
      navbarHeight: navbarHeight
    });
  },

  // 内容输入
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 选择图片
  onChooseImage() {
    const remaining = 9 - this.data.images.length;
    wx.chooseImage({
      count: remaining,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        const images = [...this.data.images, ...tempFilePaths];
        this.setData({
          images: images.slice(0, 9) // 最多9张
        });
      }
    });
  },

  // 删除图片
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.filter((img, idx) => idx !== index);
    this.setData({ images });
  },

  // 发布帖子
  onPublish() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    // 获取当前用户信息
    const currentAccount = wx.getStorageSync('currentAccount') || '游客';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    const avatar = userInfo.avatarUrl || '/images/tabbar/mine.png';

    // 创建新帖子
    const timestamp = Date.now();
    const newPost = {
      id: timestamp,
      author: currentUser,
      avatar: avatar,
      timestamp: timestamp,
      content: content,
      showFullText: content.length > 50,
      images: this.data.images,
      hot: 1, // 初始热度为1（发布者自己查看）
      likes: 0,
      liked: false,
      comments: 0
    };

    // 添加到论坛页面和本地存储
    const pages = getCurrentPages();
    const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
    
    // 格式化时间
    const formatTime = (ts) => {
      const now = Date.now();
      const diff = now - ts;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (minutes < 1) {
        return '刚刚';
      } else if (minutes < 60) {
        return `${minutes}分钟前`;
      } else if (hours < 24) {
        return `${hours}小时前`;
      } else if (days < 7) {
        return `${days}天前`;
      } else {
        const date = new Date(ts);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}-${day}`;
      }
    };
    
    newPost.time = formatTime(timestamp);
    newPost.isMine = true;
    
    // 从本地存储加载现有帖子
    let posts = wx.getStorageSync('forumPosts') || [];
    posts = [newPost, ...posts];
    wx.setStorageSync('forumPosts', posts);
    
    if (forumPage) {
      const allPosts = [newPost, ...forumPage.data.posts];
      forumPage.setData({ posts: allPosts });
      forumPage.savePosts();
      forumPage.sortPosts();
    }

    wx.showToast({
      title: '发布成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  },

  // 返回
  onBack() {
    wx.navigateBack();
  }
});

