# WordPress Data Layer Implementation Plan

## 🎯 Goals

- Implement consistent data layer across all page types
- Support ML-ready feature extraction
- Maintain UUID consistency for tracking
- Enable third-party integrations (FB Pixel, GA4)
- Optimize for performance

## 📋 Implementation by Page Type

### 1. Recipe Detail Page
```javascript
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  "@type": "Recipe",
  "page_type": "recipe_detail",
  "post_id": "${post.ID}",
  "categories": ${categories},
  "tags": ${tags},
  "author": "${author}",
  "publish_date": "${publish_date}",
  "recipe": {
    "name": "${recipe.name}",
    "cookTime": "${recipe.cookTime}",
    "difficulty": "${recipe.difficulty}",
    "cuisine": "${recipe.cuisine}"
  },
  "user": {
    "id": "${user.id}",
    "type": "${user.type}",
    "subscription_tier": "${user.subscription_tier}"
  }
});
```

### 2. Blog Post Page
```javascript
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  "@type": "Article",
  "page_type": "blog_post",
  "post_id": "${post.ID}",
  "categories": ${categories},
  "tags": ${tags},
  "author": "${author}",
  "publish_date": "${publish_date}",
  "featured_image": "${featured_image}",
  "user": {
    "id": "${user.id}",
    "type": "${user.type}"
  }
});
```

### 3. Category/Archive Page
```javascript
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  "@type": "CollectionPage",
  "page_type": "category",
  "category_name": "${category.name}",
  "total_posts": ${category.total_posts},
  "posts_per_page": ${posts_per_page},
  "current_page": ${current_page},
  "user": {
    "id": "${user.id}",
    "type": "${user.type}"
  }
});
```

### 4. Homepage
```javascript
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  "@type": "WebPage",
  "page_type": "home",
  "featured_categories": ${featured_categories},
  "trending_recipes": ${trending_recipes},
  "user": {
    "id": "${user.id}",
    "type": "${user.type}",
    "preferences": ${user.preferences}
  }
});
```

## 🔧 WordPress Implementation

### Core Data Layer Injection
```php
function inject_custom_datalayer() {
    if (!is_singular()) return;

    global $post;
    $post_id = $post->ID;
    
    // Base data available for all pages
    $base_data = [
        'post_id' => $post_id,
        'categories' => wp_get_post_categories($post_id, ['fields' => 'names']),
        'tags' => wp_get_post_tags($post_id, ['fields' => 'names']),
        'author' => get_the_author_meta('display_name', $post->post_author),
        'publish_date' => get_the_date('c', $post_id),
        'uuid' => generate_unique_post_uuid($post_id)
    ];

    // Page-specific data
    if (is_singular('recipe')) {
        $data = array_merge($base_data, get_recipe_specific_data($post_id));
    } elseif (is_singular('post')) {
        $data = array_merge($base_data, get_post_specific_data($post_id));
    } elseif (is_archive()) {
        $data = get_archive_data();
    } else {
        $data = get_default_page_data();
    }

    // Add user data if available
    if (is_user_logged_in()) {
        $data['user'] = get_user_data_for_datalayer();
    }

    echo '<script>
        window.dataLayer = window.dataLayer || [];
        dataLayer.push(' . json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ');
    </script>';
}
add_action('wp_head', 'inject_custom_datalayer');
```

### Helper Functions

```php
function get_recipe_specific_data($post_id) {
    // Get recipe meta data
    $recipe_data = get_post_meta($post_id, 'recipe_details', true);
    
    return [
        'recipe' => [
            'name' => get_the_title($post_id),
            'cookTime' => $recipe_data['cook_time'] ?? '',
            'prepTime' => $recipe_data['prep_time'] ?? '',
            'difficulty' => $recipe_data['difficulty'] ?? '',
            'cuisine' => $recipe_data['cuisine'] ?? '',
            'ingredients' => get_recipe_ingredients($post_id),
            'instructions' => get_recipe_instructions($post_id)
        ]
    ];
}

function get_user_data_for_datalayer() {
    $user = wp_get_current_user();
    
    return [
        'id' => $user->ID,
        'type' => get_user_meta($user->ID, 'user_type', true) ?? 'free',
        'subscription_tier' => get_user_subscription_tier($user->ID),
        'preferences' => get_user_preferences($user->ID)
    ];
}

function generate_unique_post_uuid($post_id) {
    $uuid = get_post_meta($post_id, '_post_uuid', true);
    
    if (!$uuid) {
        $uuid = wp_generate_uuid4();
        update_post_meta($post_id, '_post_uuid', $uuid);
    }
    
    return $uuid;
}
```

## 🔄 Integration Points

### 1. Facebook Pixel
```javascript
dataLayer.push(function() {
    fbq('track', 'PageView', {
        content_type: this.page_type,
        content_ids: [this.post_id],
        content_category: this.categories.join(',')
    });
});
```

### 2. Google Analytics 4
```javascript
dataLayer.push(function() {
    gtag('event', 'page_view', {
        page_type: this.page_type,
        post_id: this.post_id,
        user_type: this.user?.type
    });
});
```

## 🚀 Performance Optimization

1. **Async Loading**
```php
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_script('datalayer-handler', 'path/to/script.js', [], '1.0', true);
});
```

2. **Caching Strategy**
```php
function cache_datalayer_base() {
    $cache_key = 'datalayer_base_' . get_the_ID();
    $cached_data = wp_cache_get($cache_key);
    
    if (false === $cached_data) {
        $cached_data = generate_base_datalayer();
        wp_cache_set($cache_key, $cached_data, '', 3600);
    }
    
    return $cached_data;
}
```

## 📊 Testing & Validation

1. **Data Layer Inspector**
```javascript
function validateDataLayer() {
    return {
        hasRequiredFields: function() {
            return window.dataLayer.every(item => 
                item.post_id && 
                item.page_type && 
                item.uuid
            );
        },
        
        validateSchema: function() {
            // Schema validation logic
        }
    };
}
```

2. **Debug Mode**
```php
if (defined('WP_DEBUG') && WP_DEBUG) {
    add_action('wp_footer', 'debug_datalayer');
}

function debug_datalayer() {
    echo '<script>console.table(window.dataLayer);</script>';
}
```
