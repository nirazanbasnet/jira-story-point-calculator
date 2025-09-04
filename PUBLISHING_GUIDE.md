# 🚀 Publishing Guide: Jira Story Point Calculator Extension

## 📋 Pre-Publication Checklist

### ✅ Required Files (All Present)
- [x] `manifest.json` - Extension configuration
- [x] `content.js` - Main extension logic
- [x] `popup.html` - Extension popup interface
- [x] `popup.js` - Popup functionality
- [x] `icons/` - Extension icons (16x16, 48x48, 128x128)
- [x] `README.md` - Documentation

### ✅ Code Quality Check
- [x] No console errors
- [x] Clean, well-commented code
- [x] Proper error handling
- [x] Security best practices followed

## 🎯 Extension Overview

**Name:** Jira Story Point Calculator  
**Version:** 1.0  
**Description:** Automatically calculate Story Points based on Time Tracking and Complexity fields with Priority bonus support  
**Category:** Developer Tools, Productivity  

## 📁 File Structure for Publishing

```
jira-story-point-calculator/
├── manifest.json          # Extension manifest
├── content.js            # Content script
├── popup.html            # Popup interface
├── popup.js              # Popup functionality
├── icons/
│   ├── icon16.png        # 16x16 icon
│   ├── icon48.png        # 48x48 icon
│   └── icon128.png       # 128x128 icon
└── README.md             # Documentation
```

## 🔧 Pre-Publishing Steps

### 1. Test the Extension Locally
```bash
# Load extension in Chrome
1. Open Chrome and go to chrome://extensions/
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select your extension folder
4. Test all functionality on Jira pages
```

### 2. Verify All Features Work
- [ ] Auto-activation on Jira pages
- [ ] Time format parsing (1d = 8h, 1d 15m = 8.25h)
- [ ] Priority bonus (+0.5 for Urgent)
- [ ] Story point calculation
- [ ] Popup interface
- [ ] Keyboard shortcuts
- [ ] Status notifications

### 3. Code Review
- [ ] Remove any console.log statements
- [ ] Ensure error handling is graceful
- [ ] Verify no sensitive information in code
- [ ] Check for any hardcoded URLs or credentials

## 📦 Prepare for Chrome Web Store

### 1. Create a ZIP File
```bash
# Remove unnecessary files
rm -rf .git/ .history/ .DS_Store test.html debug-test.html test-loader.html test-priority.html

# Create ZIP archive
zip -r jira-story-point-calculator-v1.0.zip . -x "*.git*" "*.DS_Store" "test*.html"
```

### 2. Required Assets for Chrome Web Store

#### Screenshots (Required)
- **Small screenshot:** 1280x800 pixels
- **Large screenshot:** 1280x800 pixels
- **Promotional image:** 440x280 pixels

#### Store Listing Content

**Short Description (132 characters max):**
```
Automatically calculate Jira story points from time tracking and complexity with priority bonus support.
```

**Detailed Description:**
```
🎯 Jira Story Point Calculator - Your Ultimate Agile Planning Companion

Transform your Jira workflow with automatic story point calculations based on time tracking and complexity fields. This powerful extension eliminates manual calculations and ensures consistent story point estimation across your team.

✨ KEY FEATURES:
• Automatic story point calculation using the proven TW formula
• Full Jira time format support (1d = 8h, 1d 15m = 8.25h, etc.)
• Priority-based bonus system (+0.5 points for Urgent priority)
• Real-time monitoring and automatic updates
• Smart auto-activation on Jira pages
• Beautiful, intuitive popup interface
• Comprehensive keyboard shortcuts

🧮 CALCULATION FORMULA:
Story Points = √(Time × Complexity) + Priority Bonus
Where 1d = 8 hours (standard Jira workday)

⏰ SUPPORTED TIME FORMATS:
• 1d → 8 hours
• 1d 15m → 8.25 hours  
• 2d 3h 45m → 19.75 hours
• 3h 30m → 3.5 hours
• And many more combinations

⌨️ KEYBOARD SHORTCUTS:
• Ctrl + Shift + A: Activate calculator
• Ctrl + Shift + D: Deactivate calculator
• Ctrl + Shift + C: Trigger calculation

🔧 TECHNICAL FEATURES:
• Seamless Jira integration
• Session persistence
• Debounced input handling
• Continuous monitoring (2s intervals)
• Cross-browser compatibility

Perfect for:
• Agile teams and Scrum masters
• Project managers and team leads
• Developers and QA engineers
• Anyone using Jira for project management

Boost your team's productivity and ensure consistent story point estimation with the Jira Story Point Calculator!
```

**Category:** Developer Tools

**Language:** English

**Tags:** jira, story points, agile, scrum, project management, time tracking, complexity, productivity

## 🚀 Publishing Steps

### 1. Chrome Web Store Developer Account
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pay one-time $5.00 registration fee
3. Complete developer account setup

### 2. Upload Extension
1. Click "Add new item"
2. Upload your ZIP file
3. Fill in store listing information
4. Add screenshots and promotional images
5. Set pricing (Free)
6. Choose visibility (Public)

### 3. Submit for Review
1. Review all information
2. Submit for review
3. Wait for Google's review process (typically 1-3 business days)
4. Address any feedback if needed

## 📸 Screenshot Requirements

### Create Professional Screenshots
1. **Install extension on a test Jira instance**
2. **Take screenshots showing:**
   - Extension popup with all features
   - Extension working on a Jira issue page
   - Story point calculation in action
   - Time format examples

### Screenshot Dimensions
- **Small:** 1280x800 px
- **Large:** 1280x800 px  
- **Promotional:** 440x280 px

## 🔍 Post-Publishing

### 1. Monitor Performance
- Track installs and ratings
- Monitor user feedback
- Address any reported issues

### 2. Update Extension
- Fix bugs based on user feedback
- Add new features
- Update version number in manifest.json
- Re-upload to Chrome Web Store

### 3. Marketing
- Share on social media
- Post in relevant forums
- Create demo videos
- Write blog posts

## 📋 Version Update Process

### 1. Update Version Number
```json
// In manifest.json
{
  "version": "1.1.0"
}
```

### 2. Create Changelog
```markdown
## Version 1.1.0
- Added new feature X
- Fixed bug Y
- Improved performance Z
```

### 3. Re-upload
- Create new ZIP file
- Upload to Chrome Web Store
- Update store listing if needed

## 🚨 Common Issues & Solutions

### Extension Not Loading
- Check manifest.json syntax
- Verify all required files are present
- Check Chrome console for errors

### Rejection Reasons
- **Privacy policy missing:** Add privacy policy to store listing
- **Screenshots unclear:** Use high-quality, clear screenshots
- **Description too short:** Provide detailed, compelling description
- **Functionality unclear:** Show clear use cases and examples

## 📞 Support & Resources

### Chrome Web Store Help
- [Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Developer Support](https://support.google.com/chrome_webstore/)

### Extension Development
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

## 🎉 Success Tips

1. **Quality First:** Ensure your extension works flawlessly
2. **Clear Communication:** Write compelling descriptions and use clear screenshots
3. **User Experience:** Focus on solving real user problems
4. **Support:** Be responsive to user feedback and issues
5. **Updates:** Keep your extension updated with improvements

## 📊 Expected Timeline

- **Development & Testing:** 1-2 days
- **Store Listing Preparation:** 1 day
- **Chrome Web Store Review:** 1-3 business days
- **Total Time to Live:** 3-6 days

---

**Good luck with your extension launch! 🚀**

Your Jira Story Point Calculator is a valuable tool that will help many teams improve their agile planning process. The combination of automatic calculations, Jira time format support, and priority bonuses makes it a comprehensive solution for story point estimation.

