---


# Tiffy Cooks – Schema Plan for Personalized Feed + Ads

## 🎯 Goals

- Build a hyper-personalized, scrollable homepage feed (like Instagram/TikTok)
- Dynamically choose to show: a recipe post, collection, or targeted ad
- Support personalized Google Ad Manager 360 ads using key-values and segments
- Integrate tightly with WordPress as a headless CMS
- Use Cloudflare Pipelines + Workers to orchestrate data and serve the frontend
- Support advanced content discovery and search (tags, cuisine, scroll behavior, etc.)

---

## 🧠 Architecture Summary

- **Frontend**: Custom homepage via Cloudflare Pages + Workers
- **CMS**: WordPress (with REST or WPGraphQL)
- **Feed + Logic**: Cloudflare Pipelines
- **Analytics**: Event tracking with page views, scrolls, click actions
- **Ads**: Google Ad Manager 360 with KVPs, contextual + segment targeting

---

## 🔖 Schema Strategy

- All content is a **Schema.org `Article`**
- If a post includes a recipe, embed a full **Schema.org `Recipe`** in `mainEntity`
- Ads and feed content use **modular schemas** for personalization and targeting
- Users tracked anonymously or via login with rich preference + behavior context
- Scrolls, sessions, and media actions are tracked for TikTok-level feed learning

---

## 📦 Full JSON Schema Plan

### 1. `post.json` (Schema.org `Article` + optional `Recipe`)

```json
{
  "$id": "post.json",
  "type": "object",
  "properties": {
    "@type": { "type": "string", "const": "Article" },
    "id": { "type": "string" },
    "wp_post_id": { "type": "string" },
    "slug": { "type": "string" },
    "headline": { "type": "string" },
    "excerpt": { "type": "string" },
    "articleBody": { "type": "string" },
    "author": { "$ref": "author.json" },
    "publish_date": { "type": "string", "format": "date-time" },
    "categories": { "type": "array", "items": { "type": "string" } },
    "tags": { "type": "array", "items": { "type": "string" } },
    "featured_image": { "type": "string", "format": "uri" },
    "locale": { "type": "string", "example": "en-US" },
    "chat_context": {
      "type": "string",
      "description": "A short summary of this content for AI to use in chat context windows."
    },
    "rag_chunks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "embedding": { "type": "array", "items": { "type": "number" } },
          "source": { "type": "string" },
          "order": { "type": "integer" }
        }
      }
    },
    "ai_tags": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["easy_substitutions", "uses_leftovers", "kid_friendly", "freezer_friendly", "5_ingredients", "high_protein", "low_sodium"]
      }
    },
    "post_type": {
      "type": "string",
      "enum": ["article", "recipe", "collection", "sponsored"]
    },
    "video": {
      "type": "object",
      "properties": {
        "url": { "type": "string", "format": "uri" },
        "duration": { "type": "number" }
      }
    },
    "ad_context": {
      "type": "object",
      "properties": {
        "page_topic": { "type": "string" },
        "season": { "type": "string" },
        "sponsored": { "type": "boolean" }
      }
    },
    "mainEntity": {
      "type": "object",
      "properties": {
        "@type": { "type": "string", "const": "Recipe" },
        "name": { "type": "string" },
        "recipeIngredient": { "type": "array", "items": { "type": "string" } },
        "recipeInstructions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "@type": { "type": "string", "const": "HowToStep" },
              "text": { "type": "string" },
              "image": { "type": "string", "format": "uri" }
            }
          }
        },
        "cookTime": { "type": "string" },
        "prepTime": { "type": "string" },
        "totalTime": { "type": "string" },
        "recipeYield": { "type": "string" },
        "recipeCuisine": { "type": "array", "items": { "type": "string" } },
        "recipeCategory": { "type": "array", "items": { "type": "string" } },
        "cookingMethod": { "type": "string" },
        "suitableForDiet": { "type": "string" },
        "estimatedCost": { "type": "string" },
        "nutrition": {
          "type": "object",
          "properties": {
            "@type": { "type": "string", "const": "NutritionInformation" },
            "servingSize": { "type": "string" },
            "calories": { "type": "string" },
            "fatContent": { "type": "string" },
            "saturatedFatContent": { "type": "string" },
            "transFatContent": { "type": "string" },
            "cholesterolContent": { "type": "string" },
            "sodiumContent": { "type": "string" },
            "carbohydrateContent": { "type": "string" },
            "fiberContent": { "type": "string" },
            "sugarContent": { "type": "string" },
            "proteinContent": { "type": "string" }
          }
        }
      },
      "required": ["@type", "name", "recipeIngredient", "recipeInstructions"]
    }
  },
  "required": ["@type", "id", "slug", "headline", "articleBody"]
}
```

---

Absolutely — here's the **full JSON Schema definition** for each of the remaining items you listed, fully expanded and production-ready.

---

### **2. `review.json`**

```json
{
  "$id": "review.json",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "post_id": { "type": "string" },
    "user_id": { "type": "string" },
    "rating": { "type": "number" },
    "comment": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" },
    "helpful_count": { "type": "integer" },
    "verified_cooked": { "type": "boolean" },
    "photo_url": { "type": "string", "format": "uri" }
  },
  "required": ["id", "post_id", "user_id", "rating"]
}
```

---

### **3. `author.json`**

```json
{
  "$id": "author.json",
  "type": "object",
  "properties": {
    "@type": { "type": "string", "const": "Person" },
    "id": { "type": "string" },
    "name": { "type": "string" },
    "slug": { "type": "string" },
    "bio": { "type": "string" },
    "profileImage": { "type": "string", "format": "uri" },
    "social": {
      "type": "object",
      "properties": {
        "instagram": { "type": "string", "format": "uri" },
        "youtube": { "type": "string", "format": "uri" },
        "tiktok": { "type": "string", "format": "uri" }
      }
    },
    "followers": { "type": "integer" },
    "totalPosts": { "type": "integer" },
    "topTags": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["@type", "id", "name"]
}
```

---

### **4. `user.json`** (with `engagement_metrics`)

```json
{
  "$id": "user.json",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "is_authenticated": { "type": "boolean" },
    "is_paid_user": { "type": "boolean" },
    "subscription_tier": { 
      "type": "string", 
      "enum": ["free", "premium", "pro", "enterprise"],
      "default": "free"
    },
    "subscription_features": {
      "type": "object",
      "properties": {
        "ad_free": { "type": "boolean" },
        "premium_content": { "type": "boolean" },
        "offline_access": { "type": "boolean" },
        "custom_meal_plans": { "type": "boolean" }
      }
    },
    "device_type": { "type": "string" },
    "locale": { "type": "string", "example": "en-US" },
    "user_segments": { "type": "array", "items": { "type": "string" } },
    "consent_tracking": { "type": "boolean" },
    "consent_personalization": { "type": "boolean" },
    "preferences": {
      "type": "object",
      "properties": {
        "cuisine": { "type": "array", "items": { "type": "string" } },
        "diet": { "type": "array", "items": { "type": "string" } },
        "disliked_tags": { "type": "array", "items": { "type": "string" } },
        "liked_posts": { "type": "array", "items": { "type": "string" } }
      }
    },
    "history": {
      "type": "object",
      "properties": {
        "viewed": { "type": "array", "items": { "type": "string" } },
        "skipped": { "type": "array", "items": { "type": "string" } },
        "time_spent": {
          "type": "object",
          "additionalProperties": { "type": "number" }
        }
      }
    },
    "engagement_metrics": {
      "type": "object",
      "properties": {
        "avg_dwell_time": { "type": "number" },
        "scroll_depth_avg": { "type": "number" },
        "video_completion_rate": { "type": "number" }
      }
    }
  },
  "required": ["id"]
}
```

---

### **5. `feed_item.json`** (with `ad_targeting_context`)

```json
{
  "$id": "feed_item.json",
  "type": "object",
  "properties": {
    "type": { "type": "string", "enum": ["recipe", "ad", "collection", "tip"] },
    "id": { "type": "string" },
    "score": { "type": "number" },
    "presentation_style": { "type": "string" },
    "show_comments_preview": { "type": "boolean" },
    "media_type": { "type": "string", "enum": ["image", "video", "carousel"] },
    "duration_estimate": { "type": "number" },
    "locale": { "type": "string", "example": "en-US" },
    "ad_targeting_context": {
      "type": "object",
      "properties": {
        "tags": { "type": "array", "items": { "type": "string" } },
        "category": { "type": "string" },
        "cuisine": { "type": "string" },
        "video": { "type": "boolean" },
        "season": { "type": "string" },
        "content_type": { "type": "string" }
      }
    }
  },
  "required": ["type", "id"]
}
```

---

### **6. `ad.json`** (with `user_segment`, `context_signals`)

```json
{
  "$id": "ad.json",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "priority_score": { "type": "number" },
    "target_tags": { "type": "array", "items": { "type": "string" } },
    "target_countries": { "type": "array", "items": { "type": "string" } },
    "max_impressions": { "type": "integer" },
    "cta_text": { "type": "string" },
    "user_segment": { "type": "string" },
    "context_signals": {
      "type": "object",
      "properties": {
        "tag": { "type": "string" },
        "cuisine": { "type": "string" },
        "device_type": { "type": "string" },
        "season": { "type": "string" },
        "page_topic": { "type": "string" }
      }
    }
  },
  "required": ["id", "priority_score"]
}
```

---

### **7. `search_entry.json`**

```json
{
  "$id": "search_entry.json",
  "type": "object",
  "properties": {
    "post_id": { "type": "string" },
    "title": { "type": "string" },
    "excerpt": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "categories": { "type": "array", "items": { "type": "string" } },
    "ingredients": { "type": "array", "items": { "type": "string" } },
    "author": { "type": "string" },
    "comments_text": { "type": "string" },
    "vector_embedding": { "type": "array", "items": { "type": "number" } },
    "chat_context": {
      "type": "string",
      "description": "A short summary of this content for AI to use in chat context windows."
    },
    "rag_chunks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "embedding": { "type": "array", "items": { "type": "number" } },
          "source": { "type": "string" },
          "order": { "type": "integer" }
        }
      }
    },
    "ai_tags": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["easy_substitutions", "uses_leftovers", "kid_friendly", "freezer_friendly", "5_ingredients", "high_protein", "low_sodium"]
      }
    }
  },
  "required": ["post_id", "title"]
}
```

---

### **8. `category.json`**

```json
{
  "$id": "category.json",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "type": { "type": "string", "enum": ["category", "tag"] },
    "name": { "type": "string" },
    "slug": { "type": "string" },
    "description": { "type": "string" },
    "popularity_score": { "type": "number" },
    "parent_topic": { "type": "string" },
    "related_categories": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["id", "name", "type"]
}
```

---

### **9. `event_log.json`**

```json
{
  "$id": "event_log.json",
  "type": "object",
  "properties": {
    "uuid": { "type": "string", "format": "uuid" },
    "site_id": { "type": "string" },
    "user_id": { "type": "string" },
    "event": { "type": "string" },
    "event_data": {
      "type": "object",
      "properties": {
        "tag": { "type": "string" },
        "id": { "type": ["string", "null"] },
        "classes": { "type": ["string", "null"] },
        "text": { "type": ["string", "null"] },
        "sectionHeading": { "type": ["string", "null"] }
      }
    },
    "url": { "type": "string", "format": "uri" },
    "referrer": { "type": "string", "format": "uri" },
    "timestamp": { "type": "number" },
    "title": { "type": "string" },
    "device": {
      "type": "object",
      "properties": {
        "browser": { "type": "string" },
        "mobile": { "type": "boolean" },
        "screen": { "type": "string" },
        "viewport": { "type": "string" },
        "colorDepth": { "type": "integer" },
        "timezone_offset": { "type": "integer" }
      }
    },
    "user_agent": { "type": "string" }
  },
  "required": ["uuid", "site_id", "user_id", "event", "url", "timestamp"]
}
```

---

### **10. `page_view.json`**

```json
{
  "$id": "page_view.json",
  "type": "object",
  "properties": {
    "uuid": { "type": "string", "format": "uuid" },
    "event": { "type": "string", "enum": ["pageview", "pageclose"] },
    "site_id": { "type": "string" },
    "user_id": { "type": "string" },
    "url": { "type": "string", "format": "uri" },
    "referrer": { "type": "string", "format": "uri" },
    "title": { "type": "string" },
    "timestamp": { "type": "number" },
    "duration": { "type": "number" },
    "viewport": { "type": "string" },
    "screen": { "type": "string" },
    "device_type": { "type": "string" },
    "browser": { "type": "string" },
    "user_agent": { "type": "string" },
    "timezone_offset": { "type": "integer" },
    "source_detail": { "type": "string" }
  },
  "required": ["uuid", "event", "site_id", "user_id", "url", "timestamp"]
}
```

---

### **11. `click_action.json`**

```json
{
  "$id": "click_action.json",
  "type": "object",
  "properties": {
    "uuid": { "type": "string", "format": "uuid" },
    "event": { "type": "string", "const": "generic_click" },
    "site_id": { "type": "string" },
    "user_id": { "type": "string" },
    "session_id": { "type": "string" },
    "post_id": { "type": ["string", "null"] },
    "timestamp": { "type": "number" },
    "url": { "type": "string", "format": "uri" },
    "referrer": { "type": "string", "format": "uri" },
    "element": {
      "type": "object",
      "properties": {
        "tag": { "type": "string" },
        "classes": { "type": ["string", "null"] },
        "text": { "type": ["string", "null"] },
        "id": { "type": ["string", "null"] },
        "section": { "type": ["string", "null"] }
      }
    },
    "action_context": {
      "type": "string",
      "enum": ["cta", "recipe_card", "ad_slot", "modal", "nav", "footer", "other"]
    },
    "interaction_type": {
      "type": "string",
      "enum": ["click", "tap", "hover", "scroll"]
    },
    "device": {
      "type": "object",
      "properties": {
        "browser": { "type": "string" },
        "mobile": { "type": "boolean" },
        "screen": { "type": "string" },
        "viewport": { "type": "string" }
      }
    }
  },
  "required": ["uuid", "event", "site_id", "user_id", "timestamp", "url", "element", "interaction_type"]
}
```

---

### **12. `session.json`**

```json
{
  "$id": "session.json",
  "type": "object",
  "properties": {
    "uuid": { "type": "string", "format": "uuid" },
    "session_id": { "type": "string" },
    "user_id": { "type": "string" },
    "started_at": { "type": "number" },
    "ended_at": { "type": "number" },
    "entry_page": { "type": "string" },
    "exit_page": { "type": "string" },
    "device_type": { "type": "string" },
    "source": { "type": "string" },
    "source_detail": { "type": "string" },
    "engagement_score": { "type": "number" }
  },
  "required": ["uuid", "session_id", "user_id", "started_at"]
}
```

---

### **13. `scroll_event.json`**

```json
{
  "$id": "scroll_event.json",
  "type": "object",
  "properties": {
    "uuid": { "type": "string", "format": "uuid" },
    "user_id": { "type": "string" },
    "session_id": { "type": "string" },
    "post_id": { "type": "string" },
    "scroll_position": { "type": "number" },
    "paused": { "type": "boolean" },
    "duration_visible": { "type": "number" },
    "dwell_time": { "type": "number" }
  },
  "required": ["uuid", "user_id", "session_id", "post_id"]
}
```

---

### **14. `media_interaction.json`**

```json
{
  "$id": "media_interaction.json",
  "type": "object",
  "properties": {
    "uuid": { "type": "string", "format": "uuid" },
    "user_id": { "type": "string" },
    "post_id": { "type": "string" },
    "session_id": { "type": "string" },
    "type": { "type": "string", "enum": ["video", "carousel", "step_instruction"] },
    "action": { "type": "string", "enum": ["play", "pause", "seek", "complete", "next_step"] },
    "timestamp": { "type": "number" }
  },
  "required": ["uuid", "user_id", "post_id", "type", "action", "timestamp"]
}
```

---

### **15. `chat_message.json`**

```json
{
  "$id": "chat_message.json",
  "type": "object",
  "properties": {
    "uuid": { "type": "string", "format": "uuid" },
    "session_id": { "type": "string" },
    "user_id": { "type": "string" },
    "role": { "type": "string", "enum": ["user", "assistant", "system"] },
    "message": { "type": "string" },
    "timestamp": { "type": "number" },
    "referenced_post_ids": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["uuid", "session_id", "role", "message", "timestamp"]
}
```

---

✅ All schemas are detailed, modular, and can be versioned in your repo under `/schemas` or `/types`.

---

## 🧩 Bonus Integration Plan

- WordPress REST or GraphQL will power content ingestion
- Cloudflare Pipeline will:
  - Normalize content into this schema
  - Score content/ad relevance
  - Build `googletag.pubads().setTargeting(...)` dynamically
- Feed API will return ranked list of `feed_item`s using `post` or `ad` data
- Frontend will use schema to render card UI, handle scroll, click, and impression tracking

---

## 📊 ML Training Parameters

### Content Prediction Features

```json
{
  "content_engagement_metrics": {
    "type": "object",
    "properties": {
      "was_clicked": { "type": "boolean" },
      "time_on_page": { "type": "number" },
      "scroll_depth": { "type": "number" },
      "video_completion_rate": { "type": "number" },
      "comment_count": { "type": "integer" },
      "save_count": { "type": "integer" },
      "share_count": { "type": "integer" }
    }
  },
  "content_features": {
    "type": "object",
    "properties": {
      "categories": { "type": "array", "items": { "type": "string" } },
      "tags": { "type": "array", "items": { "type": "string" } },
      "publish_date": { "type": "string", "format": "date-time" },
      "content_length": { "type": "integer" },
      "has_video": { "type": "boolean" },
      "recipe_difficulty": { "type": "string", "enum": ["easy", "medium", "hard"] },
      "total_time": { "type": "integer" },
      "ingredient_count": { "type": "integer" }
    }
  }
}
```

These parameters will be used for training ML models to predict content engagement and personalize the user experience.

---
