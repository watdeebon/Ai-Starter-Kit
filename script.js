/**
 * AI Starter Kit - JavaScript Functions
 * Version 2.1 Enhanced with LINE Integration
 * Features: LIFF Integration, Flex Messages, Responsive UI, Advanced UX
 */

// ============================================
// Configuration and Global Variables
// ============================================
const CONFIG = {
  LIFF_ID: '2007750782-8EGkB1Z3',
  SHARE_URL_BASE: window.location.origin + window.location.pathname,
  TOAST_DURATION: 3000,
  SCROLL_OFFSET: 100,
  NAVBAR_HEIGHT: 70,
  DEBOUNCE_DELAY: 100
};

let liffInitialized = false;
let userProfile = null;
let isInLineApp = false;
let currentSection = null;
let scrollTimeout = null;
let resizeTimeout = null;

// ============================================
// Utility Functions
// ============================================

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll events
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

/**
 * Get current date in Thai format
 */
function getCurrentDateThai() {
  const now = new Date();
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const day = now.getDate();
  const month = thaiMonths[now.getMonth()];
  const year = now.getFullYear() + 543; // Convert to Buddhist Era
  
  return `${day} ${month} ${year}`;
}

// ============================================
// Toast Notification System
// ============================================
class ToastManager {
  constructor() {
    this.toastElement = document.getElementById('toast');
    this.messageElement = document.getElementById('toast-message');
    this.iconElement = document.getElementById('toast-icon');
    this.queue = [];
    this.isShowing = false;
  }

  show(message, type = 'success', duration = CONFIG.TOAST_DURATION) {
    const toast = { message, type, duration };
    this.queue.push(toast);
    
    if (!this.isShowing) {
      this.showNext();
    }
  }

  showNext() {
    if (this.queue.length === 0) {
      this.isShowing = false;
      return;
    }

    this.isShowing = true;
    const { message, type, duration } = this.queue.shift();
    
    // Set icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    this.iconElement.textContent = icons[type] || icons.info;
    this.messageElement.textContent = message;
    this.toastElement.className = `toast ${type}`;
    this.toastElement.classList.add('show');
    
    setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide() {
    this.toastElement.classList.remove('show');
    setTimeout(() => {
      this.showNext();
    }, 300); // Wait for animation to complete
  }
}

const toast = new ToastManager();

// ============================================
// LINE Environment Detection and LIFF
// ============================================
class LineManager {
  constructor() {
    this.detectEnvironment();
    this.initializeElements();
  }

  detectEnvironment() {
    const userAgent = navigator.userAgent;
    isInLineApp = userAgent.includes('Line/') || 
                 userAgent.includes('LINE/') ||
                 window.location.hostname.includes('liff') ||
                 window.location.search.includes('liff');
    
    this.updateFeatureStatus();
    return isInLineApp;
  }

  updateFeatureStatus() {
    const statusElement = document.getElementById('line-feature-status');
    
    if (isInLineApp) {
      statusElement.textContent = 'เปิดใน LINE แล้ว! สามารถใช้ฟีเจอร์แชร์ได้';
      statusElement.style.color = '#00B900';
    } else {
      statusElement.textContent = 'ฟีเจอร์แชร์ใช้ได้ใน LINE เท่านั้น';
      statusElement.style.color = '#e53e3e';
    }
  }

  initializeElements() {
    this.loginBtn = document.getElementById('login-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    this.userProfileDiv = document.getElementById('user-profile');
    this.userAvatar = document.getElementById('user-avatar');
    this.userName = document.getElementById('user-name');
  }

  async initializeLIFF() {
    try {
      console.log('Initializing LIFF...');
      await liff.init({ liffId: CONFIG.LIFF_ID });
      liffInitialized = true;
      
      console.log('LIFF initialized successfully');
      
      if (liff.isLoggedIn()) {
        console.log('User is logged in');
        await this.loadUserProfile();
      } else {
        console.log('User is not logged in');
        const savedProfile = this.loadUserSession();
        if (savedProfile) {
          console.log('Loaded profile from session');
          userProfile = savedProfile;
          this.updateUIForLoggedInUser();
        } else {
          this.updateUIForLoggedOutUser();
        }
      }
      
      this.updateShareButtonStates();
      
    } catch (error) {
      console.error('LIFF initialization failed:', error);
      this.updateUIForLiffError();
      toast.show('เกิดข้อผิดพลาดในการเชื่อมต่อ LINE', 'error');
    }
  }

  async loadUserProfile() {
    try {
      const profile = await liff.getProfile();
      userProfile = {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl || ''
      };
      
      console.log('User profile loaded:', userProfile);
      this.saveUserSession(userProfile);
      this.updateUIForLoggedInUser();
      toast.show(`ยินดีต้อนรับ ${userProfile.displayName}! 🎉`);
      
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.updateUIForLoggedOutUser();
      toast.show('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
    }
  }

  login() {
    if (!liffInitialized) {
      toast.show('กำลังเชื่อมต่อกับ LINE...', 'info');
      return;
    }
    
    try {
      liff.login();
    } catch (error) {
      console.error('Login failed:', error);
      toast.show('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่', 'error');
    }
  }

  logout() {
    try {
      if (liffInitialized && liff.isLoggedIn()) {
        liff.logout();
      }
      userProfile = null;
      this.clearUserSession();
      this.updateUIForLoggedOutUser();
      this.updateShareButtonStates();
      toast.show('ออกจากระบบเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.show('ออกจากระบบไม่สำเร็จ', 'error');
    }
  }

  updateUIForLoggedInUser() {
    if (this.loginBtn) this.loginBtn.style.display = 'none';
    if (this.userProfileDiv) this.userProfileDiv.style.display = 'flex';
    
    if (userProfile) {
      if (this.userName) this.userName.textContent = userProfile.displayName;
      if (this.userAvatar && userProfile.pictureUrl) {
        this.userAvatar.src = userProfile.pictureUrl;
        this.userAvatar.style.display = 'block';
      } else if (this.userAvatar) {
        this.userAvatar.style.display = 'none';
      }
    }
  }

  updateUIForLoggedOutUser() {
    if (isInLineApp && this.loginBtn) {
      this.loginBtn.style.display = 'flex';
    } else if (this.loginBtn) {
      this.loginBtn.style.display = 'none';
    }
    if (this.userProfileDiv) this.userProfileDiv.style.display = 'none';
  }

  updateUIForLiffError() {
    const statusElement = document.getElementById('line-feature-status');
    if (statusElement) {
      statusElement.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE';
      statusElement.style.color = '#e53e3e';
    }
    this.updateUIForLoggedOutUser();
  }

  updateShareButtonStates() {
    const shareButtons = document.querySelectorAll('.share-btn');
    
    shareButtons.forEach(btn => {
      if (!isInLineApp) {
        btn.disabled = true;
        btn.title = 'ฟีเจอร์นี้ใช้ได้ใน LINE เท่านั้น';
      } else if (!userProfile) {
        btn.disabled = true;
        btn.title = 'กรุณาเข้าสู่ระบบด้วย LINE ก่อน';
      } else {
        btn.disabled = false;
        btn.title = 'แชร์ส่วนนี้';
      }
    });
  }

  // Session Management
  saveUserSession(profile) {
    try {
      localStorage.setItem('lineUserProfile', JSON.stringify(profile));
      localStorage.setItem('lineLoginTime', Date.now().toString());
    } catch (error) {
      console.log('Session save failed:', error);
    }
  }

  loadUserSession() {
    try {
      const savedProfile = localStorage.getItem('lineUserProfile');
      const loginTime = localStorage.getItem('lineLoginTime');
      
      if (savedProfile && loginTime) {
        const timeDiff = Date.now() - parseInt(loginTime);
        if (timeDiff < 24 * 60 * 60 * 1000) { // 24 hours
          return JSON.parse(savedProfile);
        }
      }
    } catch (error) {
      console.log('Session load failed:', error);
    }
    return null;
  }

  clearUserSession() {
    try {
      localStorage.removeItem('lineUserProfile');
      localStorage.removeItem('lineLoginTime');
    } catch (error) {
      console.log('Session clear failed:', error);
    }
  }
}

const lineManager = new LineManager();

// ============================================
// Flex Message Creation for LINE Sharing
// ============================================
class FlexMessageBuilder {
  static createSectionMessage(sectionId, sectionTitle, sectionDescription) {
    const currentUrl = `${CONFIG.SHARE_URL_BASE}#${sectionId}`;
    const dateStr = getCurrentDateThai();
    
    return {
      type: "flex",
      altText: `AI Starter Kit: ${sectionTitle}`,
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "AI Starter Kit",
              weight: "bold",
              color: "#ffffff",
              size: "lg"
            },
            {
              type: "text",
              text: "สำหรับครูยุคใหม่",
              color: "#ffffff",
              size: "sm",
              margin: "xs"
            }
          ],
          backgroundColor: "#667eea",
          paddingAll: "15px"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: sectionTitle,
              weight: "bold",
              size: "lg",
              color: "#333333",
              wrap: true
            },
            {
              type: "text",
              text: sectionDescription,
              size: "sm",
              color: "#666666",
              wrap: true,
              margin: "md"
            },
            {
              type: "separator",
              margin: "lg"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "📅",
                      color: "#aaaaaa",
                      size: "sm",
                      flex: 0
                    },
                    {
                      type: "text",
                      text: dateStr,
                      wrap: true,
                      color: "#666666",
                      size: "sm",
                      flex: 5
                    }
                  ]
            },
            {
              type: "separator",
              margin: "lg"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "📅",
                      color: "#aaaaaa",
                      size: "sm",
                      flex: 0
                    },
                    {
                      type: "text",
                      text: dateStr,
                      wrap: true,
                      color: "#666666",
                      size: "sm",
                      flex: 5
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "👥",
                      color: "#aaaaaa",
                      size: "sm",
                      flex: 0
                    },
                    {
                      type: "text",
                      text: "เหมาะสำหรับครูทุกระดับ",
                      wrap: true,
                      color: "#666666",
                      size: "sm",
                      flex: 5
                    }
                  ]
                }
              ]
            }
          ],
          paddingAll: "20px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "sm",
              action: {
                type: "uri",
                uri: currentUrl
              },
              label: "เข้าสู่หลักสูตร",
              color: "#667eea"
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                {
                  type: "text",
                  text: "🚀 พัฒนาด้วยใจเพื่อครูไทย",
                  color: "#aaaaaa",
                  size: "xs",
                  align: "center",
                  wrap: true
                }
              ],
              margin: "sm"
            }
          ],
          paddingAll: "20px"
        }
      }
    };
  }
}

// ============================================
// Share Functions
// ============================================
class ShareManager {
  static getSectionContent(sectionId) {
    const sectionData = {
      'section1': {
        title: '🎯 เปิดโลก AI กับคุณครู',
        description: 'เริ่มต้นทำความรู้จักกับ AI และการประยุกต์ใช้ในการศึกษา พร้อมกิจกรรม Ice Breaking และ Discussion เพื่อสร้างความเข้าใจพื้นฐานเกี่ยวกับปัญญาประดิษฐ์'
      },
      'section2': {
        title: '🛠️ รู้จักเครื่องมือ AI สำหรับครู',
        description: 'แนะนำเครื่องมือ AI ที่ครูสามารถนำไปใช้ได้จริง เช่น ChatGPT, Claude, Canva AI, Gamma และ Quizizz พร้อมวิธีการใช้งานเบื้องต้น'
      },
      'section3': {
        title: '⚡ Hands-on Workshop',
        description: 'ลงมือปฏิบัติจริง! สร้างสื่อการสอนและแก้ปัญหาการเรียนการสอนด้วย AI ผ่านกิจกรรม Workshop ที่ได้ลองทำจริง'
      },
      'section4': {
        title: '⚖️ จริยธรรม AI ในการศึกษา',
        description: 'เรียนรู้การใช้ AI อย่างรับผิดชอบ พร้อม Best Practices และ Guidelines สำหรับห้องเรียน รวมถึงข้อควรระวังด้านความเป็นส่วนตัว'
      },
      'section5': {
        title: '📝 ตัวอย่าง Prompts สำหรับครู',
        description: 'Prompt Templates พร้อมใช้! ตัวอย่าง Prompts สำหรับสร้างแผนการสอน ใบงาน กิจกรรม และการประเมินผล พร้อมเทคนิคการเขียน Prompt ที่ดี'
      },
      'section6': {
        title: '📚 แหล่งเรียนรู้และทรัพยากร',
        description: 'แหล่งเรียนรู้เพิ่มเติมและแผนพัฒนาต่อยอดทักษะ AI เป็นเวลา 90 วัน พร้อมทรัพยากรที่เป็นประโยชน์สำหรับครู'
      }
    };

    return sectionData[sectionId] || {
      title: 'AI Starter Kit สำหรับครูยุคใหม่',
      description: 'หลักสูตรอบรม AI สำหรับครูที่ต้องการนำเทคโนโลยีมาใช้ในการสอน'
    };
  }

  static async shareToLine(sectionId) {
    if (!isInLineApp) {
      toast.show('ฟีเจอร์นี้ใช้ได้ใน LINE เท่านั้น', 'error');
      return false;
    }
    
    if (!userProfile) {
      toast.show('กรุณาเข้าสู่ระบบด้วย LINE ก่อน', 'error');
      return false;
    }
    
    if (!liffInitialized) {
      toast.show('กำลังเชื่อมต่อกับ LINE...', 'info');
      return false;
    }
    
    try {
      let flexMessage;
      
      if (sectionId === 'all') {
        flexMessage = FlexMessageBuilder.createCourseOverviewMessage();
      } else {
        const sectionContent = this.getSectionContent(sectionId);
        flexMessage = FlexMessageBuilder.createSectionMessage(
          sectionId, 
          sectionContent.title, 
          sectionContent.description
        );
      }
      
      const result = await liff.shareTargetPicker([flexMessage]);
      
      if (result) {
        toast.show('แชร์สำเร็จ! 🎉');
        this.trackShareEvent(sectionId, 'success');
        return true;
      }
      
    } catch (error) {
      console.error('Share failed:', error);
      
      if (error.code === 'CANCEL') {
        toast.show('ยกเลิกการแชร์');
      } else {
        toast.show('แชร์ไม่สำเร็จ กรุณาลองใหม่', 'error');
      }
      
      this.trackShareEvent(sectionId, 'failed');
      return false;
    }
  }

  static trackShareEvent(sectionId, status) {
    // Analytics tracking
    console.log(`Share Event: ${sectionId} - ${status}`);
    
    // You can add Google Analytics or other tracking here
    if (typeof gtag !== 'undefined') {
      gtag('event', 'share', {
        'section_id': sectionId,
        'status': status,
        'user_id': userProfile?.userId || 'anonymous'
      });
    }
  }

  static setButtonLoading(button, loading) {
    if (loading) {
      button.disabled = true;
      button.classList.add('loading');
      button.innerHTML = `
        <svg class="share-icon animate-spin" viewBox="0 0 24 24" width="16" height="16">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        กำลังแชร์...
      `;
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      button.innerHTML = `
        <svg class="share-icon" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
        </svg>
        แชร์
      `;
      lineManager.updateShareButtonStates();
    }
  }
}

// ============================================
// Navigation and Scroll Management
// ============================================
class NavigationManager {
  constructor() {
    this.navbar = document.getElementById('navbar');
    this.navToggle = document.getElementById('nav-toggle');
    this.navList = document.querySelector('.nav-list');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.sections = document.querySelectorAll('.section');
    this.backToTopBtn = document.getElementById('back-to-top');
    
    this.init();
  }

  init() {
    this.setupScrollListener();
    this.setupNavigationClick();
    this.setupMobileMenu();
    this.setupBackToTop();
    this.updateActiveSection();
  }

  setupScrollListener() {
    const throttledScroll = throttle(() => {
      this.updateActiveSection();
      this.toggleBackToTop();
    }, 50);
    
    window.addEventListener('scroll', throttledScroll);
  }

  updateActiveSection() {
    let currentActive = null;
    const scrollTop = window.pageYOffset;
    const navbarHeight = CONFIG.NAVBAR_HEIGHT;
    
    this.sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + scrollTop - navbarHeight - 50;
      const sectionBottom = sectionTop + rect.height;
      
      if (scrollTop >= sectionTop && scrollTop < sectionBottom) {
        currentActive = section.id;
      }
    });
    
    // Update navigation links
    this.navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === `#${currentActive}`) {
        link.classList.add('active');
      }
    });
    
    currentSection = currentActive;
  }

  setupNavigationClick() {
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const navbarHeight = CONFIG.NAVBAR_HEIGHT;
          const targetPosition = targetElement.offsetTop - navbarHeight - 20;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          
          // Close mobile menu if open
          this.closeMobileMenu();
        }
      });
    });
  }

  setupMobileMenu() {
    if (this.navToggle) {
      this.navToggle.addEventListener('click', () => {
        this.toggleMobileMenu();
      });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.navbar.contains(e.target)) {
        this.closeMobileMenu();
      }
    });
  }

  toggleMobileMenu() {
    this.navToggle.classList.toggle('active');
    this.navList.classList.toggle('active');
  }

  closeMobileMenu() {
    this.navToggle.classList.remove('active');
    this.navList.classList.remove('active');
  }

  setupBackToTop() {
    if (this.backToTopBtn) {
      this.backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
  }

  toggleBackToTop() {
    if (this.backToTopBtn) {
      if (window.pageYOffset > 300) {
        this.backToTopBtn.classList.add('show');
      } else {
        this.backToTopBtn.classList.remove('show');
      }
    }
  }
}

// ============================================
// Copy to Clipboard Functionality
// ============================================
class ClipboardManager {
  static async copyText(text, element) {
    try {
      await navigator.clipboard.writeText(text.trim());
      this.showCopySuccess(element);
      toast.show('คัดลอก Prompt สำเร็จ! 📋');
      return true;
    } catch (err) {
      console.log('Could not copy text: ', err);
      this.fallbackCopyText(text);
      toast.show('ไม่สามารถคัดลอกได้', 'error');
      return false;
    }
  }

  static fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.show('คัดลอก Prompt สำเร็จ! 📋');
    } catch (err) {
      console.error('Fallback copy failed', err);
      toast.show('ไม่สามารถคัดลอกได้', 'error');
    }
    
    document.body.removeChild(textArea);
  }

  static showCopySuccess(element) {
    const originalClass = element.className;
    element.classList.add('copy-success');
    
    setTimeout(() => {
      element.className = originalClass;
    }, 1000);
  }

  static setupCopyableElements() {
    document.querySelectorAll('.prompt-text.copyable').forEach(promptBox => {
      promptBox.addEventListener('click', function() {
        const text = this.textContent.replace('📋', '').trim();
        ClipboardManager.copyText(text, this);
      });
    });
  }
}

// ============================================
// Intersection Observer for Animations
// ============================================
class AnimationManager {
  constructor() {
    this.setupIntersectionObserver();
  }

  setupIntersectionObserver() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('.section').forEach(section => {
      observer.observe(section);
    });

    // Observe tool cards with staggered animation
    document.querySelectorAll('.tool-card').forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
      observer.observe(card);
    });
  }
}

// ============================================
// Print Functionality
// ============================================
class PrintManager {
  static setupPrintButton() {
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        this.printPage();
      });
    }
  }

  static printPage() {
    // Hide elements that shouldn't be printed
    const elementsToHide = [
      '.navbar', '.back-to-top', '.toast', 
      '.share-btn', '.action-btn', '.line-profile'
    ];
    
    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.style.display = 'none');
    });

    // Add print-specific styles
    document.body.classList.add('printing');
    
    // Print
    window.print();
    
    // Restore elements after printing
    setTimeout(() => {
      elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.style.display = '');
      });
      document.body.classList.remove('printing');
    }, 1000);
    
    toast.show('กำลังเตรียมการพิมพ์...', 'info');
  }
}

// ============================================
// Keyboard Shortcuts
// ============================================
class KeyboardManager {
  constructor() {
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt + S for share current section
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentSection) {
          this.shareCurrentSection();
        }
      }
      
      // Alt + L for login/logout
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.toggleLogin();
      }
      
      // Alt + P for print
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        PrintManager.printPage();
      }
      
      // Escape to close mobile menu
      if (e.key === 'Escape') {
        const navManager = window.navigationManager;
        if (navManager) {
          navManager.closeMobileMenu();
        }
      }
    });
  }

  async shareCurrentSection() {
    if (currentSection) {
      const button = document.querySelector(`.share-btn[data-section="${currentSection}"]`);
      if (button) {
        ShareManager.setButtonLoading(button, true);
        const success = await ShareManager.shareToLine(currentSection);
        ShareManager.setButtonLoading(button, false);
      }
    } else {
      toast.show('ไม่พบส่วนที่ต้องการแชร์', 'warning');
    }
  }

  toggleLogin() {
    if (userProfile) {
      lineManager.logout();
    } else if (isInLineApp) {
      lineManager.login();
    } else {
      toast.show('ฟีเจอร์นี้ใช้ได้ใน LINE เท่านั้น', 'warning');
    }
  }
}

// ============================================
// Ripple Effect for Buttons
// ============================================
class RippleManager {
  static setupRippleEffect() {
    const buttons = document.querySelectorAll('.btn, .line-login-btn, .share-btn, .action-btn');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        if (this.disabled) return;
        
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255,255,255,0.6)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s linear';
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '1000';
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
          }
        }, 600);
      });
    });
  }
}

// ============================================
// Performance Monitor
// ============================================
class PerformanceManager {
  static init() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
      
      // Track Core Web Vitals if available
      if ('web-vitals' in window) {
        this.trackCoreWebVitals();
      }
    });

    // Monitor memory usage (if available)
    if (performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
          console.warn('High memory usage detected');
        }
      }, 30000); // Check every 30 seconds
    }
  }

  static trackCoreWebVitals() {
    // This would integrate with web-vitals library if available
    console.log('Core Web Vitals tracking would be implemented here');
  }
}

// ============================================
// Main App Initialization
// ============================================
class AIStarterKitApp {
  constructor() {
    this.init();
  }

  async init() {
    console.log('🚀 AI Starter Kit Enhanced v2.1 - Initializing...');
    
    try {
      // Initialize core managers
      this.setupManagers();
      
      // Initialize LINE features
      await this.initializeLine();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI enhancements
      this.initializeUIEnhancements();
      
      console.log('✅ AI Starter Kit initialized successfully!');
      
      // Show welcome message
      setTimeout(() => {
        toast.show('ยินดีต้อนรับสู่ AI Starter Kit! 🎉', 'success');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      toast.show('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ', 'error');
    }
  }

  setupManagers() {
    window.navigationManager = new NavigationManager();
    window.animationManager = new AnimationManager();
    window.keyboardManager = new KeyboardManager();
    
    // Initialize performance monitoring
    PerformanceManager.init();
  }

  async initializeLine() {
    if (isInLineApp && typeof liff !== 'undefined') {
      await lineManager.initializeLIFF();
    } else {
      console.log('Not in LINE environment or LIFF not available');
      lineManager.updateUIForLoggedOutUser();
      lineManager.updateShareButtonStates();
    }
  }

  setupEventListeners() {
    // Login/Logout buttons
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', () => lineManager.login());
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => lineManager.logout());
    }
    
    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const sectionId = this.getAttribute('data-section');
        ShareManager.setButtonLoading(this, true);
        
        try {
          await ShareManager.shareToLine(sectionId);
        } finally {
          ShareManager.setButtonLoading(this, false);
        }
      });
    });
    
    // Share all button
    const shareAllBtn = document.getElementById('share-all-btn');
    if (shareAllBtn) {
      shareAllBtn.addEventListener('click', async function() {
        ShareManager.setButtonLoading(this, true);
        
        try {
          await ShareManager.shareToLine('all');
        } finally {
          ShareManager.setButtonLoading(this, false);
        }
      });
    }
    
    // Print functionality
    PrintManager.setupPrintButton();
    
    // Window resize handler
    window.addEventListener('resize', debounce(() => {
      lineManager.updateShareButtonStates();
    }, CONFIG.DEBOUNCE_DELAY));
  }

  initializeUIEnhancements() {
    // Setup copyable elements
    ClipboardManager.setupCopyableElements();
    
    // Setup ripple effects
    RippleManager.setupRippleEffect();
    
    // Add smooth scrolling polyfill for older browsers
    if (!('scrollBehavior' in document.documentElement.style)) {
      this.addSmoothScrollPolyfill();
    }
  }

  addSmoothScrollPolyfill() {
    // Simple smooth scroll polyfill
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          const targetPosition = target.offsetTop - CONFIG.NAVBAR_HEIGHT;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }
}

// ============================================
// Debug Functions (Global)
// ============================================
window.debugAIKit = {
  liff: () => {
    console.log('=== LIFF Debug Info ===');
    console.log('LIFF Initialized:', liffInitialized);
    console.log('Is in LINE App:', isInLineApp);
    console.log('User Profile:', userProfile);
    console.log('LIFF Login Status:', liffInitialized ? liff.isLoggedIn() : 'N/A');
    console.log('Current Section:', currentSection);
  },
  
  testShare: (sectionId = 'section1') => {
    console.log('Testing share for section:', sectionId);
    return ShareManager.shareToLine(sectionId);
  },
  
  testToast: (message = 'Test notification', type = 'success') => {
    toast.show(message, type);
  },
  
  performance: () => {
    console.log('=== Performance Info ===');
    console.log('Navigation timing:', performance.getEntriesByType('navigation')[0]);
    console.log('Memory usage:', performance.memory);
    console.log('Resource timing:', performance.getEntriesByType('resource').length + ' resources loaded');
  },
  
  accessibility: () => {
    console.log('=== Accessibility Check ===');
    const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    console.log(`${focusableElements.length} focusable elements found`);
    
    const missingAlt = document.querySelectorAll('img:not([alt])');
    if (missingAlt.length > 0) {
      console.warn(`${missingAlt.length} images missing alt text`);
    }
  }
};

// ============================================
// Service Worker Registration (Optional)
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// ============================================
// Initialize Application
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  window.aiStarterKit = new AIStarterKitApp();
});

// ============================================
// Global Error Handler
// ============================================
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  toast.show('เกิดข้อผิดพลาดที่ไม่คาดคิด', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  toast.show('เกิดข้อผิดพลาดในการประมวลผล', 'error');
});

// ============================================
// Export for testing (if needed)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ShareManager,
    ClipboardManager,
    NavigationManager,
    FlexMessageBuilder
  };
}
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "🔗",
                      color: "#aaaaaa",
                      size: "sm",
                      flex: 0
                    },
                    {
                      type: "text",
                      text: "ดูรายละเอียดเพิ่มเติม",
                      wrap: true,
                      color: "#667eea",
                      size: "sm",
                      flex: 5,
                      decoration: "underline"
                    }
                  ]
                }
              ]
            }
          ],
          paddingAll: "15px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "sm",
              action: {
                type: "uri",
                uri: currentUrl
              },
              label: "เรียนรู้เพิ่มเติม",
              color: "#667eea"
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                {
                  type: "text",
                  text: "#AIStarterKit #ครูยุคใหม่ #ปัญญาประดิษฐ์",
                  color: "#aaaaaa",
                  size: "xs",
                  align: "center",
                  wrap: true
                }
              ],
              margin: "sm"
            }
          ],
          paddingAll: "15px"
        }
      }
    };
  }

  static createCourseOverviewMessage() {
    const currentUrl = CONFIG.SHARE_URL_BASE;
    const dateStr = getCurrentDateThai();
    
    return {
      type: "flex",
      altText: "AI Starter Kit สำหรับครูยุคใหม่ - หลักสูตรอบรม",
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "AI Starter Kit",
              weight: "bold",
              color: "#ffffff",
              size: "xl"
            },
            {
              type: "text",
              text: "สำหรับครูยุคใหม่",
              color: "#ffffff",
              size: "md",
              margin: "xs"
            },
            {
              type: "text",
              text: "หลักสูตรอบรม 1 วัน (6 ชั่วโมง)",
              color: "#ffffff",
              size: "sm",
              margin: "md"
            }
          ],
          backgroundColor: "#667eea",
          paddingAll: "20px"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "🎯 เนื้อหาที่จะได้เรียนรู้",
              weight: "bold",
              size: "md",
              color: "#333333"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "• เปิดโลก AI กับคุณครู",
                  size: "sm",
                  color: "#666666"
                },
                {
                  type: "text",
                  text: "• รู้จักเครื่องมือ AI สำหรับครู",
                  size: "sm",
                  color: "#666666"
                },
                {
                  type: "text",
                  text: "• Hands-on Workshop",
                  size: "sm",
                  color: "#666666"
                },
                {
                  type: "text",
                  text: "• จริยธรรม AI ในการศึกษา",
                  size: "sm",
                  color: "#666666"
                },
                {
                  type: "text",
                  text: "• ตัวอย่าง Prompts สำหรับครู",
                  size: "sm",
                  color: "#666666"
                },
                {
                  type: "text",
                  text: "• แหล่งเรียนรู้และทรัพยากร",
                  size: "sm",
                  color: "#666666"
                }
              ]
