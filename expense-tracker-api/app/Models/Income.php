<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Income extends Model
{
    protected $fillable = [
        'description',
        'amount',
        'received_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'received_at' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
