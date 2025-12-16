// pages/forum/detail/detail.js
Page({
  data: {
    statusBarHeight: 0,
    navbarHeight: 132,
    postId: null,
    post: {},
    comments: [],
    commentText: '',
    replyingTo: null, // 正在回复的评论ID和作者
    replyingCommentId: null
  },

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navbarHeight = statusBarHeight + 88;
    
    this.setData({
      statusBarHeight: statusBarHeight,
      navbarHeight: navbarHeight,
      postId: options.id
    });

    // 加载帖子数据
    this.loadPostData();
    
    // 增加帖子热度（每次进入都增加）
    this.increasePostHot();
  },

  // 加载帖子数据
  loadPostData() {
    // 从论坛页面获取帖子数据（实际项目中应该从服务器获取）
    const pages = getCurrentPages();
    const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
    
    if (forumPage) {
      const post = forumPage.data.posts.find(p => p.id === parseInt(this.data.postId));
      if (post) {
        // 检查是否是自己的帖子
        const currentAccount = wx.getStorageSync('currentAccount') || '';
        const userInfo = wx.getStorageSync('userInfo') || {};
        const isMyPost = post.author === (userInfo.nickName || currentAccount);
        
        // 从本地存储加载评论数
        const postCommentsKey = `post_${this.data.postId}_comments`;
        const comments = wx.getStorageSync(postCommentsKey) || [];
        const totalComments = comments.reduce((total, comment) => {
          return total + 1 + (comment.replies ? comment.replies.length : 0);
        }, 0);
        
        this.setData({ 
          post: { 
            ...post, 
            comments: totalComments || post.comments || 0,
            time: this.formatTime(post.timestamp)
          },
          isMyPost: isMyPost
        });
        this.loadComments();
        return;
      }
    }

    // 如果没有找到，使用默认数据
    const defaultPost = {
      id: parseInt(this.data.postId),
      author: '麦门信徒',
      avatar: '/images/tabbar/mine.png',
      time: '5分钟前',
      content: '麦摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归摇摇薯条什么时候回归',
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
      comments: 12
    };
    
    this.setData({ 
      post: defaultPost,
      isMyPost: false
    });
    this.loadComments();
  },

  // 增加帖子热度（每次进入都增加）
  increasePostHot() {
    const post = this.data.post;
    if (post && post.id) {
      const newHot = (post.hot || 0) + 1;
      this.setData({
        'post.hot': newHot
      });

      // 同步到论坛页面和本地存储
      const pages = getCurrentPages();
      const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
      if (forumPage) {
        const posts = forumPage.data.posts.map(p => {
          if (p.id === post.id) {
            return { ...p, hot: newHot };
          }
          return p;
        });
        forumPage.setData({ posts });
        forumPage.savePosts();
        if (typeof forumPage.sortPosts === 'function') {
          forumPage.sortPosts();
        }
      }
      
      // 更新本地存储
      let allPosts = wx.getStorageSync('forumPosts') || [];
      allPosts = allPosts.map(p => {
        if (p.id === post.id) {
          return { ...p, hot: newHot };
        }
        return p;
      });
      wx.setStorageSync('forumPosts', allPosts);
    }
  },

  // 加载评论
  loadComments() {
    const postId = this.data.postId;
    const currentAccount = wx.getStorageSync('currentAccount') || '';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    
    // 从本地存储加载该帖子的评论
    const postCommentsKey = `post_${postId}_comments`;
    let comments = wx.getStorageSync(postCommentsKey) || [];
    
    // 如果没有评论数据，初始化为空数组
    if (comments.length === 0) {
      comments = [];
    }
    
    // 标记哪些是自己的评论
    comments = comments.map(comment => ({
      ...comment,
      isMine: comment.author === currentUser
    }));
    
    // 更新帖子评论数（包括回复）
    const totalComments = comments.reduce((total, comment) => {
      return total + 1 + (comment.replies ? comment.replies.length : 0);
    }, 0);
    
    const post = {
      ...this.data.post,
      comments: totalComments
    };
    
    this.setData({ 
      comments,
      post
    });
    
    // 同步到论坛页面
    const pages = getCurrentPages();
    const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
    if (forumPage) {
      const posts = forumPage.data.posts.map(p => {
        if (p.id === post.id) {
          return { ...p, comments: totalComments };
        }
        return p;
      });
      forumPage.setData({ posts });
      forumPage.savePosts();
    }
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    });
  },

  // 评论输入框聚焦
  onCommentInputFocus() {
    // 聚焦输入框
  },

  // 评论输入框失焦
  onCommentInputBlur() {
    // 失焦处理
  },

  // 提交评论
  onSubmitComment() {
    const commentText = this.data.commentText.trim();
    if (!commentText) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }

    // 获取当前用户信息
    const currentAccount = wx.getStorageSync('currentAccount') || '游客';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUser = userInfo.nickName || currentAccount;
    
    const postId = this.data.postId;
    const postCommentsKey = `post_${postId}_comments`;
    
    if (this.data.replyingCommentId) {
      // 回复评论
      const comments = this.data.comments.map(comment => {
        if (comment.id === this.data.replyingCommentId) {
          const replies = comment.replies || [];
          replies.push({
            id: Date.now(),
            author: currentUser,
            content: commentText
          });
          return { ...comment, replies };
        }
        return comment;
      });
      
      // 保存到本地存储
      wx.setStorageSync(postCommentsKey, comments);
      
      // 计算总评论数（包括回复）
      const totalComments = comments.reduce((total, comment) => {
        return total + 1 + (comment.replies ? comment.replies.length : 0);
      }, 0);
      
      const post = {
        ...this.data.post,
        comments: totalComments
      };
      
      this.setData({
        comments,
        post,
        commentText: '',
        replyingTo: null,
        replyingCommentId: null
      });
      
      // 同步到论坛页面
      const pages = getCurrentPages();
      const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
      if (forumPage) {
        const posts = forumPage.data.posts.map(p => {
          if (p.id === post.id) {
            return { ...p, comments: totalComments };
          }
          return p;
        });
        forumPage.setData({ posts });
        forumPage.savePosts();
      }
      
      // 更新本地存储
      let allPosts = wx.getStorageSync('forumPosts') || [];
      allPosts = allPosts.map(p => {
        if (p.id === post.id) {
          return { ...p, comments: totalComments };
        }
        return p;
      });
      wx.setStorageSync('forumPosts', allPosts);
      
      // 如果是回复自己的评论，添加消息提醒
      const repliedComment = comments.find(c => c.id === this.data.replyingCommentId);
      if (repliedComment && repliedComment.isMine) {
        this.addNotification('reply', `用户 ${currentUser} 回复了你的评论"${repliedComment.content.substring(0, 20)}..."`, this.data.postId);
      }
    } else {
      // 新评论
      const newComment = {
        id: Date.now(),
        author: currentUser,
        avatar: userInfo.avatarUrl || '/images/tabbar/mine.png',
        time: '刚刚',
        content: commentText,
        likes: 0,
        liked: false,
        replies: [],
        isMine: true
      };

      const comments = [newComment, ...this.data.comments];
      
      // 保存到本地存储
      wx.setStorageSync(postCommentsKey, comments);
      
      // 计算总评论数（包括回复）
      const totalComments = comments.reduce((total, comment) => {
        return total + 1 + (comment.replies ? comment.replies.length : 0);
      }, 0);
      
      const post = {
        ...this.data.post,
        comments: totalComments
      };

      this.setData({
        comments,
        post,
        commentText: ''
      });

      // 同步到论坛页面和本地存储
      const pages = getCurrentPages();
      const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
      if (forumPage) {
        const posts = forumPage.data.posts.map(p => {
          if (p.id === post.id) {
            return { ...p, comments: totalComments };
          }
          return p;
        });
        forumPage.setData({ posts });
        forumPage.savePosts();
        forumPage.sortPosts();
      }

      // 更新本地存储
      let allPosts = wx.getStorageSync('forumPosts') || [];
      allPosts = allPosts.map(p => {
        if (p.id === post.id) {
          return { ...p, comments: totalComments };
        }
        return p;
      });
      wx.setStorageSync('forumPosts', allPosts);
      
      // 如果是评论自己的帖子，添加消息提醒
      if (this.data.isMyPost) {
        this.addNotification('comment', `用户 ${currentUser} 评论了你的帖子"${post.content.substring(0, 20)}..."`, this.data.postId);
      }
    }

    wx.showToast({
      title: this.data.replyingCommentId ? '回复成功' : '评论成功',
      icon: 'success'
    });
  },

  // 评论点赞
  onCommentLikeTap(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const postId = this.data.postId;
    const postCommentsKey = `post_${postId}_comments`;
    
    const comments = this.data.comments.map(comment => {
      if (comment.id === commentId) {
        const liked = !comment.liked;
        const updatedComment = {
          ...comment,
          liked: liked,
          likes: liked ? (comment.likes || 0) + 1 : Math.max(0, (comment.likes || 0) - 1)
        };
        
        // 如果是点赞自己的评论，添加消息提醒
        if (liked && comment.isMine) {
          this.addNotification('like', `用户赞了你的评论"${comment.content.substring(0, 20)}..."`, this.data.postId);
        }
        
        return updatedComment;
      }
      return comment;
    });
    
    // 保存到本地存储
    wx.setStorageSync(postCommentsKey, comments);
    
    this.setData({ comments });
  },

  // 回复评论
  onReplyTap(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const author = e.currentTarget.dataset.author;
    this.setData({
      replyingTo: author,
      replyingCommentId: commentId
    });
    // 聚焦输入框
  },

  // 删除评论
  onDeleteComment(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const postId = this.data.postId;
    const postCommentsKey = `post_${postId}_comments`;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: (res) => {
        if (res.confirm) {
          const comments = this.data.comments.filter(comment => comment.id !== commentId);
          
          // 保存到本地存储
          wx.setStorageSync(postCommentsKey, comments);
          
          // 计算总评论数（包括回复）
          const totalComments = comments.reduce((total, comment) => {
            return total + 1 + (comment.replies ? comment.replies.length : 0);
          }, 0);
          
          const post = {
            ...this.data.post,
            comments: totalComments
          };
          
          this.setData({
            comments,
            post
          });

          // 同步到论坛页面和本地存储
          const pages = getCurrentPages();
          const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
          if (forumPage) {
            const posts = forumPage.data.posts.map(p => {
              if (p.id === post.id) {
                return { ...p, comments: totalComments };
              }
              return p;
            });
            forumPage.setData({ posts });
            forumPage.savePosts();
            forumPage.sortPosts();
          }

          // 更新本地存储
          let allPosts = wx.getStorageSync('forumPosts') || [];
          allPosts = allPosts.map(p => {
            if (p.id === post.id) {
              return { ...p, comments: totalComments };
            }
            return p;
          });
          wx.setStorageSync('forumPosts', allPosts);

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 删除帖子
  onDeletePost() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条帖子吗？',
      success: (res) => {
        if (res.confirm) {
          // 从论坛页面删除帖子
          // 从论坛页面和本地存储删除帖子
          const pages = getCurrentPages();
          const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
          if (forumPage) {
            const posts = forumPage.data.posts.filter(p => p.id !== this.data.post.id);
            forumPage.setData({ posts });
            forumPage.savePosts();
            forumPage.sortPosts();
          }
          
          // 更新本地存储
          let allPosts = wx.getStorageSync('forumPosts') || [];
          allPosts = allPosts.filter(p => p.id !== this.data.post.id);
          wx.setStorageSync('forumPosts', allPosts);

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        }
      }
    });
  },

  // 点赞
  onLikeTap() {
    const post = this.data.post;
    const liked = !post.liked;
    this.setData({
      'post.liked': liked,
      'post.likes': liked ? post.likes + 1 : post.likes - 1
    });

    // 如果是点赞自己的帖子，添加消息提醒
    if (liked && this.data.isMyPost) {
      const currentAccount = wx.getStorageSync('currentAccount') || '';
      const userInfo = wx.getStorageSync('userInfo') || {};
      const currentUser = userInfo.nickName || currentAccount;
      this.addNotification('like', `用户 ${currentUser} 赞了你的帖子"${post.content.substring(0, 20)}..."`, this.data.postId);
    }

    // 同步到论坛页面和本地存储
    const pages = getCurrentPages();
    const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
    if (forumPage) {
      const posts = forumPage.data.posts.map(p => {
        if (p.id === post.id) {
          return { ...p, liked, likes: post.likes };
        }
        return p;
      });
      forumPage.setData({ posts });
      forumPage.savePosts();
      forumPage.sortPosts();
    }
    
    // 更新本地存储
    let allPosts = wx.getStorageSync('forumPosts') || [];
    allPosts = allPosts.map(p => {
      if (p.id === post.id) {
        return { ...p, liked, likes: post.likes };
      }
      return p;
    });
    wx.setStorageSync('forumPosts', allPosts);
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
      postId: postId || this.data.postId // 保存帖子ID，用于跳转
    };
    notifications = [newNotification, ...notifications];
    wx.setStorageSync('notifications', notifications);
    
    // 更新论坛页面的消息提醒状态
    const pages = getCurrentPages();
    const forumPage = pages.find(page => page.route === 'pages/forum/forum/forum');
    if (forumPage) {
      forumPage.setData({ hasNewNotifications: true });
    }
  },

  // 图片点击
  onImageTap(e) {
    const src = e.currentTarget.dataset.src;
    const images = this.data.post.images || [];
    wx.previewImage({
      current: src,
      urls: images
    });
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

  // 返回
  onBack() {
    wx.navigateBack();
  }
});
