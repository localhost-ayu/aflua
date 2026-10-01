<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Income;
use App\Models\RecurringOccurrence;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EntryRecurrenceService
{
    public function update(Expense|Income $entry, array $attributes, ?array $recurrence): Expense|Income
    {
        return DB::transaction(function () use ($entry, $attributes, $recurrence) {
            $occurrence = $entry->recurringOccurrence()->lockForUpdate()->first();
            $enabled = $recurrence['enabled'] ?? null;
            $dateField = $entry instanceof Expense ? 'expense_date' : 'received_at';
            $date = CarbonImmutable::parse($attributes[$dateField] ?? $entry->{$dateField});

            if ($occurrence && $enabled !== false
                && ($occurrence->year !== $date->year || $occurrence->month !== $date->month)) {
                throw ValidationException::withMessages([
                    $dateField => ['A recurring entry must remain in its original month.'],
                ]);
            }

            if ($occurrence && $enabled === false) {
                $occurrence->rule()->update(['active' => false]);
                $this->detach($occurrence);
            }

            $entry->update($attributes);

            if ($recurrence && $enabled === true) {
                $this->enable($entry, $occurrence, $recurrence, $date);
            }

            return $entry->load('recurringOccurrence.rule');
        });
    }

    public function delete(Expense|Income $entry, string $occurrenceAction = 'skipped'): void
    {
        DB::transaction(function () use ($entry, $occurrenceAction) {
            $occurrence = $entry->recurringOccurrence()->lockForUpdate()->first();

            if ($occurrence) {
                $this->detach($occurrence, $occurrenceAction);
            }

            $entry->delete();
        });
    }

    private function enable(Expense|Income $entry, ?RecurringOccurrence $occurrence, array $recurrence, CarbonImmutable $date): void
    {
        $details = [
            'description' => $entry->description,
            'amount' => $entry->amount,
            'day_of_month' => $recurrence['day_of_month'],
            'category_id' => $entry instanceof Expense ? $entry->category_id : null,
            'auto_confirm' => $recurrence['auto_confirm'] ?? true,
            'active' => true,
        ];

        if ($occurrence) {
            $occurrence->rule()->update($details);

            return;
        }

        $rule = $entry->user->recurringRules()->create([
            ...$details,
            'type' => $entry instanceof Expense ? 'expense' : 'income',
            'starts_on' => $date->toDateString(),
        ]);

        $rule->occurrences()->create([
            'year' => $date->year,
            'month' => $date->month,
            'status' => 'confirmed',
            $entry instanceof Expense ? 'linked_expense_id' : 'linked_income_id' => $entry->id,
        ]);
    }

    private function detach(RecurringOccurrence $occurrence, string $status = 'skipped'): void
    {
        $occurrence->update([
            'status' => $status,
            'linked_expense_id' => null,
            'linked_income_id' => null,
            'auto_confirmed_at' => null,
            'auto_confirm_suppressed' => true,
        ]);
    }
}
