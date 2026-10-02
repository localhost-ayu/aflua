<?php

namespace App\Services;

use App\Models\RecurringRule;
use Illuminate\Support\Facades\DB;

class RecurringRuleDeletionService
{
    public function delete(RecurringRule $rule, bool $deleteEntries): void
    {
        DB::transaction(function () use ($rule, $deleteEntries) {
            $locked = RecurringRule::query()->lockForUpdate()->findOrFail($rule->id);
            $occurrences = $locked->occurrences()->lockForUpdate()->get();
            $expenseIds = $occurrences->pluck('linked_expense_id')->filter()->all();
            $incomeIds = $occurrences->pluck('linked_income_id')->filter()->all();

            $locked->occurrences()->delete();

            if ($deleteEntries) {
                $locked->user->expenses()->whereKey($expenseIds)->delete();
                $locked->user->incomes()->whereKey($incomeIds)->delete();
            }

            $locked->delete();
        }, 3);
    }
}
