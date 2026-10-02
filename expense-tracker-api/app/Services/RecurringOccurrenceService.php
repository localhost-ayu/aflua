<?php

namespace App\Services;

use App\Models\RecurringOccurrence;
use App\Models\RecurringRule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RecurringOccurrenceService
{
    public function effectiveDate(RecurringRule $rule, int $year, int $month): CarbonImmutable
    {
        $firstDay = CarbonImmutable::create($year, $month, 1);

        return $firstDay->day(min($rule->day_of_month, $firstDay->daysInMonth));
    }

    public function prepareForUser(User $user, int $year, int $month): void
    {
        foreach ($user->recurringRules()->where('active', true)->get() as $rule) {
            $this->prepareRule($rule, $year, $month);
        }
    }

    public function prepareRule(RecurringRule $rule, int $year, int $month): ?RecurringOccurrence
    {
        $periodStart = CarbonImmutable::create($year, $month, 1);
        $firstAutomaticPeriod = $rule->starts_on->toImmutable()->startOfMonth();
        $createdPeriod = $rule->created_at->toImmutable()->startOfMonth();
        $effectiveDate = $this->effectiveDate($rule, $year, $month);

        if (! $rule->active
            || $periodStart->lessThanOrEqualTo($firstAutomaticPeriod)
            || $periodStart->lessThanOrEqualTo($createdPeriod)
            || ($rule->ends_on && $effectiveDate->greaterThan($rule->ends_on))) {
            return null;
        }

        return $rule->occurrences()->firstOrCreate(
            ['year' => $year, 'month' => $month],
            ['status' => 'pending'],
        );
    }

    public function confirm(RecurringOccurrence $occurrence, ?string $amount = null, bool $automatic = false): RecurringOccurrence
    {
        return DB::transaction(function () use ($occurrence, $amount, $automatic) {
            $locked = RecurringOccurrence::query()->lockForUpdate()->findOrFail($occurrence->id);
            abort_unless($locked->status === 'pending', 409, 'occurrence_not_pending');

            $rule = $locked->rule;
            abort_unless($rule->active, 409, 'rule_inactive');
            $date = $this->effectiveDate($rule, $locked->year, $locked->month)->toDateString();
            $entryAmount = $amount ?? $rule->amount;

            if ($rule->type === 'expense') {
                $entry = $rule->user->expenses()->create([
                    'category_id' => $rule->category_id,
                    'description' => $rule->description,
                    'amount' => $entryAmount,
                    'expense_date' => $date,
                ]);
                $locked->linked_expense_id = $entry->id;
            } else {
                $entry = $rule->user->incomes()->create([
                    'description' => $rule->description,
                    'amount' => $entryAmount,
                    'received_at' => $date,
                ]);
                $locked->linked_income_id = $entry->id;
            }

            $locked->status = 'confirmed';
            $locked->auto_confirmed_at = $automatic ? now() : null;
            $locked->save();

            return $locked->load(['rule.category', 'expense', 'income']);
        });
    }

    public function skip(RecurringOccurrence $occurrence): RecurringOccurrence
    {
        return DB::transaction(function () use ($occurrence) {
            $locked = RecurringOccurrence::query()->lockForUpdate()->findOrFail($occurrence->id);
            abort_unless($locked->status === 'pending', 409, 'occurrence_not_pending');
            $locked->update(['status' => 'skipped']);

            return $locked->load('rule.category');
        });
    }

    public function adjust(RecurringOccurrence $occurrence, string $amount): RecurringOccurrence
    {
        return DB::transaction(function () use ($occurrence, $amount) {
            $locked = RecurringOccurrence::query()->lockForUpdate()->findOrFail($occurrence->id);
            abort_unless($locked->status === 'confirmed', 409, 'occurrence_not_confirmed');
            $entry = $locked->rule->type === 'expense' ? $locked->expense : $locked->income;
            abort_unless($entry, 409, 'linked_entry_missing');
            $entry->update(['amount' => $amount]);

            return $locked->load(['rule.category', 'expense', 'income']);
        });
    }

    public function undoAutomatic(RecurringOccurrence $occurrence): RecurringOccurrence
    {
        return DB::transaction(function () use ($occurrence) {
            $locked = RecurringOccurrence::query()->lockForUpdate()->findOrFail($occurrence->id);
            abort_unless($locked->status === 'confirmed' && $locked->auto_confirmed_at, 409, 'not_auto_confirmed');
            $entry = $locked->rule->type === 'expense' ? $locked->expense : $locked->income;
            abort_unless($entry, 409, 'linked_entry_missing');

            $locked->update([
                'status' => 'pending',
                'linked_expense_id' => null,
                'linked_income_id' => null,
                'auto_confirmed_at' => null,
                'auto_confirm_suppressed' => true,
            ]);
            $entry->delete();

            return $locked->load('rule.category');
        });
    }

    public function processDue(CarbonImmutable $today): int
    {
        $confirmed = 0;

        foreach (RecurringRule::query()->where('active', true)->get() as $rule) {
            $occurrence = $this->prepareRule($rule, $today->year, $today->month);

            if ($occurrence && $rule->auto_confirm && $occurrence->status === 'pending'
                && ! $occurrence->auto_confirm_suppressed
                && $this->effectiveDate($rule, $today->year, $today->month)->lessThanOrEqualTo($today)) {
                try {
                    $this->confirm($occurrence, automatic: true);
                    $confirmed++;
                } catch (HttpException $exception) {
                    if ($exception->getStatusCode() !== 409) {
                        throw $exception;
                    }
                }
            }
        }

        return $confirmed;
    }
}
