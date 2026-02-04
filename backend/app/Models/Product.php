<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'category_id',
        'vendor_id',
        'name',
        'slug',
        'sku',
        'barcode',
        'description',
        'cost',
        'markup_percentage',
        'price',
        'sale_price',
        'tax_class',
        'vendor',
        'image_url',
        'card_color',
        'hex_code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'cost' => 'decimal:2',
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($product) {
            // Auto-calculate price if cost and markup are present
            if ($product->cost !== null && $product->markup_percentage !== null) {
                // Calculation: Cost + (Cost * Markup / 100)
                $markupAmount = $product->cost * ($product->markup_percentage / 100);
                $product->price = round($product->cost + $markupAmount, 2);
            }

            // Auto-generate SKU if missing and category is set
            if (empty($product->sku) && $product->category_id) {
                $category = Category::find($product->category_id);
                if ($category) {
                    $prefix = $category->sku_prefix ?? Str::upper(substr($category->slug, 0, 3));
                    // Simple SKU generation: PREFIX-RANDOM(4 digits) to avoid complex sequential logic for now
                    // In a simpler app: PREFIX-0001
                    // Let's rely on a random suffix to minimize collisions for demo purposes
                    $product->sku = $prefix . '-' . strtoupper(Str::random(6));
                }
            }
        });
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function inventory()
    {
        return $this->hasOne(Inventory::class);
    }

    // Accessor for Image URL to handle fallbacks
    public function getImageUrlAttribute($value)
    {
        if ($value) {
            return $value;
        }

        // Return a generic placeholder or categorize one
        // Ideally this maps to real assets, but for now we use a reliable placeholder service or static
        // Based on category slug if relation is loaded
        if ($this->relationLoaded('category') && $this->category) {
            // Simple mapping based on slug keywords
            $slug = $this->category->slug;
            if (str_contains($slug, 'cleaning'))
                return 'https://placehold.co/400x400/e0f7fa/006064?text=Cleaning';
            if (str_contains($slug, 'electronics'))
                return 'https://placehold.co/400x400/e8eaf6/1a237e?text=Electronics';
            if (str_contains($slug, 'school'))
                return 'https://placehold.co/400x400/e3f2fd/0d47a1?text=School';
            if (str_contains($slug, 'office'))
                return 'https://placehold.co/400x400/eceff1/263238?text=Office';
            if (str_contains($slug, 'art'))
                return 'https://placehold.co/400x400/f3e5f5/4a148c?text=Art';
        }

        return 'https://placehold.co/400x400/f5f5f5/9e9e9e?text=No+Image';
    }
}
