# Tiffy Cooks WordPress Implementation Plan

## 🔧 Implementation Steps

### 1. Header Code Implementation

Add this code to your header plugin (e.g., "Insert Headers and Footers" or similar):

```html
<!-- TiffyCooks Data Layer Setup -->
<script>
window.tiffyDataLayer = window.tiffyDataLayer || [];

// Base data layer configuration
const tiffyConfig = {
    siteId: 'tiffycooks',
    environment: 'production',
    version: '1.0.0'
};

// Initialize data layer with config
tiffyDataLayer.push(tiffyConfig);

// Helper function to generate UUIDs
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Get or create session ID
function getSessionId() {
    let sessionId = sessionStorage.getItem('tiffy_session_id');
    if (!sessionId) {
        sessionId = generateUUID();
        sessionStorage.setItem('tiffy_session_id', sessionId);
    }
    return sessionId;
}

// Get or create visitor ID
function getVisitorId() {
    let visitorId = localStorage.getItem('tiffy_visitor_id');
    if (!visitorId) {
        visitorId = generateUUID();
        localStorage.setItem('tiffy_visitor_id', visitorId);
    }
    return visitorId;
}

// Initialize core data
const coreData = {
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer,
    viewport: {
        width: window.innerWidth,
        height: window.innerHeight
    }
};

// Push core data to data layer
tiffyDataLayer.push(coreData);
</script>

<!-- Page-Specific Data Layer -->
<script>
// WordPress data extraction
const pageData = {
    type: '<?php echo get_post_type(); ?>',
    pageId: '<?php echo get_the_ID(); ?>',
    categories: <?php echo json_encode(wp_get_post_categories(get_the_ID(), ['fields' => 'names'])); ?>,
    tags: <?php echo json_encode(wp_get_post_tags(get_the_ID(), ['fields' => 'names'])); ?>,
    author: '<?php echo get_the_author_meta('display_name'); ?>',
    publishDate: '<?php echo get_the_date('c'); ?>',
    modifiedDate: '<?php echo get_the_modified_date('c'); ?>'
};

// Push page data to data layer
tiffyDataLayer.push(pageData);

// Recipe-specific data (only on recipe pages)
<?php if (get_post_type() === 'recipe'): ?>
const recipeData = {
    type: 'recipe',
    name: '<?php echo get_the_title(); ?>',
    // Add your recipe meta fields here
    cookTime: '<?php echo get_post_meta(get_the_ID(), 'cook_time', true); ?>',
    prepTime: '<?php echo get_post_meta(get_the_ID(), 'prep_time', true); ?>',
    totalTime: '<?php echo get_post_meta(get_the_ID(), 'total_time', true); ?>',
    cuisine: '<?php echo get_post_meta(get_the_ID(), 'cuisine', true); ?>'
};

tiffyDataLayer.push(recipeData);
<?php endif; ?>
</script>
```

### 2. Footer Code Implementation

Add this code to your footer plugin:

```html
<!-- TiffyCooks Event Tracking -->
<script>
// Scroll depth tracking
let maxScroll = 0;
document.addEventListener('scroll', function() {
    const percent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;
    if (percent > maxScroll) {
        maxScroll = Math.round(percent);
        if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
            tiffyDataLayer.push({
                event: 'scroll_milestone',
                scroll_depth: maxScroll,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// Click tracking for important elements
document.addEventListener('click', function(e) {
    // Recipe action buttons
    if (e.target.matches('.recipe-save-btn, .recipe-print-btn, .recipe-share-btn')) {
        tiffyDataLayer.push({
            event: 'recipe_action',
            action_type: e.target.className,
            recipe_id: pageData.pageId,
            timestamp: new Date().toISOString()
        });
    }
    
    // Video interactions
    if (e.target.matches('.recipe-video')) {
        tiffyDataLayer.push({
            event: 'video_interaction',
            action: 'play',
            video_id: e.target.dataset.videoId,
            timestamp: new Date().toISOString()
        });
    }
});

// Page unload tracking
window.addEventListener('beforeunload', function() {
    // Calculate time on page
    const timeOnPage = (new Date() - new Date(coreData.timestamp)) / 1000;
    
    tiffyDataLayer.push({
        event: 'page_exit',
        time_on_page: timeOnPage,
        max_scroll_depth: maxScroll,
        timestamp: new Date().toISOString()
    });
});

// Debug mode (remove in production)
if (location.hostname === 'localhost' || location.hostname === 'staging.tiffycooks.com') {
    window.tiffyDataLayer.push = function(obj) {
        console.log('Data Layer Push:', obj);
        Array.prototype.push.call(this, obj);
    };
}
</script>

<!-- Data Layer to GTM Bridge (if using GTM) -->
<script>
window.dataLayer = window.dataLayer || [];
tiffyDataLayer.forEach(function(obj) {
    dataLayer.push(obj);
});

// Forward future pushes to GTM
const originalPush = tiffyDataLayer.push;
tiffyDataLayer.push = function(obj) {
    dataLayer.push(obj);
    originalPush.call(this, obj);
};
</script>
```

## 🔍 Key Elements to Update

1. **Recipe Meta Fields**: Update these based on your actual meta field names:
   ```php
   'cook_time' => get_post_meta(...),
   'prep_time' => get_post_meta(...),
   'total_time' => get_post_meta(...),
   'cuisine' => get_post_meta(...)
   ```

2. **CSS Selectors**: Update these based on your theme's actual classes:
   ```javascript
   '.recipe-save-btn'
   '.recipe-print-btn'
   '.recipe-share-btn'
   '.recipe-video'
   ```

## 📋 Implementation Checklist

1. [ ] Back up your site
2. [ ] Add header code via plugin
3. [ ] Add footer code via plugin
4. [ ] Update recipe meta field names
5. [ ] Update CSS selectors
6. [ ] Test in staging/development first
7. [ ] Verify data in browser console
8. [ ] Check GTM integration (if using)

## 🚨 Important Notes

1. **Testing**: Always test in staging first
2. **Performance**: The code is already optimized but monitor site speed
3. **Backup**: Keep a backup of your original header/footer code
4. **Debug**: Use the debug mode on staging to verify data
5. **GTM**: If using Google Tag Manager, ensure the bridge code is included

## 🔄 Next Steps

1. Review your recipe post type's meta field names
2. Identify the CSS classes for important elements
3. Set up a staging environment for testing
4. Implement the code in stages:
   - Core data layer first
   - Page data second
   - Event tracking last
5. Monitor for any issues

Need help with any specific part of the implementation?

## 🔍 Finding Your Meta Field Names

### Method 1: WordPress Admin Inspector
1. Go to any recipe post in your WordPress admin
2. Right-click and "Inspect Element" on any field
3. Look for `name="your_field_name"` or `id="your_field_name"`
4. Common locations:
   - Custom fields section
   - Recipe block fields
   - Advanced Custom Fields (if using)

### Method 2: Database Check
Run this SQL in phpMyAdmin or your database tool:
```sql
SELECT DISTINCT meta_key 
FROM wp_postmeta 
WHERE post_id IN (
    SELECT ID 
    FROM wp_posts 
    WHERE post_type = 'recipe'
)
ORDER BY meta_key;
```

### Method 3: Debug Output
Add this temporary code to your single recipe template via the theme editor:
```php
<?php
if (current_user_can('administrator')) {
    echo '<div style="display:none">';
    echo '<pre>';
    $post_meta = get_post_meta(get_the_ID());
    print_r($post_meta);
    echo '</pre>';
    echo '</div>';
}
?>
```

## 📦 Getting Your Theme on Git

### 1. Initial Setup

```bash
# On your local machine
mkdir tiffycooks-theme
cd tiffycooks-theme

# Initialize Git
git init

# Create .gitignore
cat > .gitignore << EOL
.DS_Store
node_modules/
.env
wp-config.php
*.log
.htaccess
EOL
```

### 2. Download Theme Files

Options to get your theme files:

1. **Via FTP**:
   ```bash
   # Using FTP client (FileZilla, Cyberduck, etc.)
   # Connect to your host
   # Navigate to: /wp-content/themes/your-theme-name/
   # Download all files to your local tiffycooks-theme directory
   ```

2. **Via WordPress Admin**:
   - Go to Appearance → Editor
   - Copy each file's content
   - Create matching files locally

3. **Via cPanel File Manager**:
   - Navigate to /wp-content/themes/your-theme-name/
   - Download as ZIP
   - Extract locally

### 3. Create GitHub Repository

1. Go to GitHub.com
2. Click "New Repository"
3. Name it "tiffycooks-theme"
4. Keep it private
5. Don't initialize with README

### 4. Push to GitHub

```bash
# In your local tiffycooks-theme directory
git add .
git commit -m "Initial commit of Tiffy Cooks theme"

# Add GitHub remote
git remote add origin https://github.com/yourusername/tiffycooks-theme.git
git branch -M main
git push -u origin main
```

### 5. Ongoing Development

```bash
# When making changes
git add .
git commit -m "Description of changes"
git push

# When working on new features
git checkout -b feature-name
# Make changes
git add .
git commit -m "Feature description"
git push -u origin feature-name
```

## 🔐 Security Considerations

1. **Keep Private**:
   - API keys
   - Database credentials
   - WordPress salts
   - Admin usernames/passwords

2. **Include in .gitignore**:
   - wp-config.php
   - .env files
   - Debug logs
   - Local development files

3. **Sensitive Data**:
   - Remove any hardcoded API keys
   - Use environment variables
   - Check commits for sensitive data before pushing

## 📋 Next Steps

1. [ ] Download current theme files
2. [ ] Create GitHub repository
3. [ ] Set up local development environment
4. [ ] Push initial code
5. [ ] Document meta field names found
6. [ ] Update data layer implementation with correct field names

Need help with any of these steps?
