// models/Category.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema, model } = mongoose;

const CategorySchema = new Schema(
  {
    // ─────────────────────────────
    // Identidad básica
    // ─────────────────────────────
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true // 🔥 clave para SEO + performance
    },

    description: {
      type: String,
      trim: true
    },

    // ─────────────────────────────
    // SEO ON-PAGE
    // ─────────────────────────────
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 70
    },

    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160
    },

    seoIndexable: {
      type: Boolean,
      default: true
    },

    canonicalUrl: {
      type: String,
      trim: true
    },

    // ─────────────────────────────
    // Open Graph / Social SEO
    // ─────────────────────────────
    ogTitle: {
      type: String,
      trim: true,
      maxlength: 70
    },

    ogDescription: {
      type: String,
      trim: true,
      maxlength: 160
    },

    ogImage: {
      type: String // URL absoluta recomendada
    },

    // ─────────────────────────────
    // Schema.org
    // ─────────────────────────────
    schemaType: {
      type: String,
      default: 'CollectionPage'
    },

    // ─────────────────────────────
    // Estado editorial (MUY SEO)
    // ─────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
      index: true
    },

    // ─────────────────────────────
    // UX / Visual
    // ─────────────────────────────
    image: {
      type: String
    },

    color: {
      type: String,
      default: '#007bff'
    },

    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true // createdAt + updatedAt automáticos
  }
);

// ─────────────────────────────
// Generación automática de slug
// ─────────────────────────────
CategorySchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true
    });
  }
  next();
});

export default model('Category', CategorySchema);
