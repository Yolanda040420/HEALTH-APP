// pages/forum/forum/forum.js
Page({
  data: {
    // 顶部论坛 / 资讯
    activeTab: 'forum',
    
    // 论坛排序
    sortType: 'latest', // 'latest' | 'hot'
    
    // 消息提醒
    notificationVisible: false,
    hasNewNotifications: false,
    notifications: [],
    
    // 论坛帖子列表
    posts: [],
    
    sortedPosts: [],
    
    // 资讯文章列表
    articles: [
      {
        id: 1,
        title: '春天户外运动注意事项',
        snippet: '春暖花开, 正是户外运动的好时节。但也要注意提防花粉过敏和温差变化...',
        images: [
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png'
        ],
        imageCount: 4,
        time: '7小时前',
        comments: 13
      },
      {
        id: 2,
        title: '新手健身入门指南',
        snippet: '想开始健身却不知道从哪练起?先抓住三个核心:1.有氧+力量结合...',
        images: [
          '/images/tabbar/forum.png',
          '/images/tabbar/forum.png'
        ],
        imageCount: 2,
        time: '10小时前',
        comments: 5
      }
    ]
  },

  // 顶部 论坛 / 资讯 tab
  onSubTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 排序切换
  onSortTap(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ sortType: type });
    this.sortPosts();
  },

  // 排序帖子
  sortPosts() {
    const { posts, sortType } = this.data;
    let sortedPosts = [...posts];
    
    if (sortType === 'latest') {
      // 按时间从最新到最旧排序
      sortedPosts.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortType === 'hot') {
      // 按热度从多到少排序
      sortedPosts.sort((a, b) => b.hot - a.hot);
    }
    
    this.setData({ sortedPosts });
    this.savePosts();
  },

  // 点赞
  onLikeTap(e) {
    const id = e.currentTarget.dataset.id;
    const currentAccount = wx.getStorageSync('currentAccount') || '';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    
    const posts = this.data.posts.map(post => {
      if (post.id === id) {
        const liked = !post.liked;
        const updatedPost = {
          ...post,
          liked: liked,
          likes: liked ? post.likes + 1 : post.likes - 1
        };
        
        // 如果是点赞自己的帖子，添加消息提醒
        if (liked && post.isMine) {
          this.addNotification('like', `用户 ${currentUser} 赞了你的帖子"${post.content.substring(0, 20)}..."`, post.id);
        }
        
        return updatedPost;
      }
      return post;
    });
    
    this.setData({ posts });
    this.savePosts();
    this.sortPosts();
  },

  // 添加消息提醒
  addNotification(type, content, postId) {
    let notifications = wx.getStorageSync('notifications') || [];
    const newNotification = {
      id: Date.now(),
      type: type,
      content: content,
      time: '刚刚',
      read: false,
      postId: postId // 保存帖子ID，用于跳转
    };
    notifications = [newNotification, ...notifications];
    wx.setStorageSync('notifications', notifications);
    this.setData({ hasNewNotifications: true });
  },

  // 评论
  onCommentTap(e) {
    const id = e.currentTarget.dataset.id;
    // 跳转到帖子详情页
    wx.navigateTo({
      url: `/pages/forum/detail/detail?id=${id}`
    });
  },

  // 资讯卡片点击
  onArticleCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/forum/info-detail/info-detail?id=${id}`
    });
  },

  // 资讯评论点击
  onArticleCommentTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/forum/info-detail/info-detail?id=${id}`
    });
  },

  // 通知项点击
  onNotificationItemTap(e) {
    const notificationId = e.currentTarget.dataset.id;
    const postId = e.currentTarget.dataset.postId;
    
    console.log('点击通知，notificationId:', notificationId, 'postId:', postId);
    
    // 从当前通知列表中查找完整的通知数据
    const notification = this.data.notifications.find(n => n.id === notificationId);
    const actualPostId = postId || (notification && notification.postId);
    
    console.log('实际postId:', actualPostId, '通知数据:', notification);
    
    // 标记通知为已读
    let notifications = wx.getStorageSync('notifications') || [];
    notifications = notifications.map(n => {
      if (n.id === notificationId) {
        return { ...n, read: true };
      }
      return n;
    });
    
    // 保存到本地存储
    wx.setStorageSync('notifications', notifications);
    
    // 更新状态
    const hasNewNotifications = notifications.some(n => !n.read);
    this.setData({
      notifications: this.data.notifications.map(n => {
        if (n.id === notificationId) {
          return { ...n, read: true };
        }
        return n;
      }),
      hasNewNotifications
    });
    
    // 关闭弹窗
    this.setData({ notificationVisible: false });
    
    // 如果有postId，跳转到帖子详情页
    if (actualPostId) {
      wx.navigateTo({
        url: `/pages/forum/detail/detail?id=${actualPostId}`
      });
    } else {
      // 如果没有postId，提示用户
      wx.showToast({
        title: '无法跳转，缺少帖子ID',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 查看全文
  onViewFullPost(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/forum/detail/detail?id=${id}`
    });
  },

  // 帖子卡片点击
  onPostCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/forum/detail/detail?id=${id}`
    });
  },

  // 通知图标点击
  onNotificationTap() {
    this.loadNotifications();
    this.setData({ notificationVisible: true });
  },

  // 关闭通知弹窗
  onCloseNotification() {
    this.setData({ notificationVisible: false });
    // 标记所有通知为已读
    this.markNotificationsAsRead();
  },

  // 阻止弹窗内容点击事件冒泡
  onModalContentTap() {
    // 阻止事件冒泡
  },

  // 加载消息提醒
  loadNotifications() {
    // 从本地存储加载消息提醒（只显示自己的帖子/评论被点赞或回复的消息）
    let notifications = wx.getStorageSync('notifications') || [];
    
    // 获取当前用户信息
    const currentAccount = wx.getStorageSync('currentAccount') || '';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    
    // 过滤出只属于自己的通知（通过检查通知内容是否包含自己的用户名或账号）
    // 这里简化处理，实际应该从通知数据中判断
    // 由于通知内容格式是"用户 XXX 赞了你的帖子..."，我们需要检查是否是自己的帖子/评论
    // 更准确的做法是在添加通知时记录帖子/评论的作者
    notifications = notifications.filter(notification => {
      // 检查通知内容是否包含"你的"，表示是自己的
      return notification.content && notification.content.includes('你的');
    });
    
    // 确保所有通知都有postId（如果没有，尝试从帖子列表中匹配）
    notifications = notifications.map(notification => {
      if (!notification.postId) {
        // 尝试从帖子列表中查找匹配的帖子
        const matchingPost = this.data.posts.find(post => {
          return notification.content && notification.content.includes(post.content.substring(0, 20));
        });
        if (matchingPost) {
          notification.postId = matchingPost.id;
        }
      }
      return notification;
    });
    
    // 检查是否有未读消息
    const hasNewNotifications = notifications.some(n => !n.read);
    
    this.setData({
      notifications,
      hasNewNotifications
    });
  },

  // 标记所有通知为已读
  markNotificationsAsRead() {
    const notifications = this.data.notifications.map(n => ({ ...n, read: true }));
    wx.setStorageSync('notifications', notifications);
    this.setData({
      notifications,
      hasNewNotifications: false
    });
  },

  // 发布按钮
  onPublish() {
    wx.navigateTo({
      url: '/pages/forum/publish/publish'
    });
  },

  onLoad() {
    console.log('论坛页面加载');
    this.initPosts();
    this.sortPosts();
    this.loadNotifications();
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '刚刚';
    const now = Date.now();
    const diff = now - timestamp;
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
      const date = new Date(timestamp);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}-${day}`;
    }
  },

  // 初始化帖子数据
  initPosts() {
    // 从本地存储加载帖子
    let posts = wx.getStorageSync('forumPosts') || [];
    
    // 如果没有数据，创建默认数据
    if (posts.length === 0) {
      posts = [
        {
          id: 1,
          author: '麦门信徒',
          avatar: '/images/tabbar/mine.png',
          timestamp: Date.now() - 5 * 60 * 1000,
          content: '麦摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归',
          showFullText: true,
          images: [
            '/images/tabbar/forum.png',
            '/images/tabbar/forum.png',
            '/images/tabbar/forum.png',
            '/images/tabbar/forum.png',
            '/images/tabbar/forum.png',
            '/images/tabbar/forum.png'
          ],
          hot: 130,
          likes: 9,
          liked: false,
          comments: 0,
          isMine: false
        },
        {
          id: 2,
          author: '熊 (减脂版)',
          avatar: '/images/tabbar/mine.png',
          timestamp: Date.now() - 20 * 60 * 1000,
          content: '人，中午好，我是熊。熊刚从紫荆打包了一份鸡胸。咬了一口以后熊悟了：这不是鸡胸，是肌肉训练器材，是对熊的考验。好消息：熊蛋白质拉满了；坏消息：牙...',
          showFullText: true,
          images: [],
          hot: 297,
          likes: 13,
          liked: false,
          comments: 0,
          isMine: false
        },
        {
          id: 3,
          author: '健身小白',
          avatar: '/images/tabbar/mine.png',
          timestamp: Date.now() - 60 * 60 * 1000,
          content: '今天开始健身第一天，记录一下！',
          showFullText: false,
          images: [
            '/images/tabbar/forum.png',
            '/images/tabbar/forum.png'
          ],
          hot: 50,
          likes: 5,
          liked: true,
          comments: 0,
          isMine: false
        }
      ];
      wx.setStorageSync('forumPosts', posts);
    }
    
    // 检查哪些是自己的帖子，并格式化时间
    const currentAccount = wx.getStorageSync('currentAccount') || '';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    
    // 从本地存储加载每个帖子的评论数
    posts = posts.map(post => {
      const postCommentsKey = `post_${post.id}_comments`;
      const comments = wx.getStorageSync(postCommentsKey) || [];
      const totalComments = comments.reduce((total, comment) => {
        return total + 1 + (comment.replies ? comment.replies.length : 0);
      }, 0);
      
      return {
        ...post,
        isMine: post.author === currentUser,
        time: this.formatTime(post.timestamp),
        comments: totalComments || post.comments || 0
      };
    });
    
    this.setData({ posts });
  },

  // 保存帖子数据
  savePosts() {
    wx.setStorageSync('forumPosts', this.data.posts);
  },

  // 删除帖子
  onDeletePost(e) {
    e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条帖子吗？',
      success: (res) => {
        if (res.confirm) {
          const posts = this.data.posts.filter(p => p.id !== id);
          this.setData({ posts });
          this.savePosts();
          this.sortPosts();
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  onShow() {
    // 页面显示时重新加载消息提醒
    this.loadNotifications();
    // 重新检查哪些是自己的帖子，并更新评论数和时间
    const currentAccount = wx.getStorageSync('currentAccount') || '';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    
    const posts = this.data.posts.map(post => {
      // 从本地存储加载每个帖子的评论数
      const postCommentsKey = `post_${post.id}_comments`;
      const comments = wx.getStorageSync(postCommentsKey) || [];
      const totalComments = comments.reduce((total, comment) => {
        return total + 1 + (comment.replies ? comment.replies.length : 0);
      }, 0);
      
      return {
        ...post,
        isMine: post.author === currentUser,
        time: this.formatTime(post.timestamp),
        comments: totalComments || post.comments || 0
      };
    });
    
    this.setData({ posts });
    this.sortPosts();
  }
});
