<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecurringRule extends Model
{
    protected $fillable = [
        'type', 'description', 'amount', 'day_of_month', 'category_id',
        'starts_on', 'ends_on', 'active', 'auto_confirm',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'day_of_month' => 'integer',
        'starts_on' => 'date',
        'ends_on' => 'date',
        'active' => 'boolean',
        'auto_confirm' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function occurrences(): HasMany
    {
        return $this->hasMany(RecurringOccurrence::class);
    }
}
