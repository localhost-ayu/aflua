<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurringOccurrence extends Model
{
    protected $fillable = [
        'year', 'month', 'status', 'linked_expense_id', 'linked_income_id', 'auto_confirmed_at',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'auto_confirmed_at' => 'datetime',
    ];

    public function rule(): BelongsTo
    {
        return $this->belongsTo(RecurringRule::class, 'recurring_rule_id');
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class, 'linked_expense_id');
    }

    public function income(): BelongsTo
    {
        return $this->belongsTo(Income::class, 'linked_income_id');
    }
}
