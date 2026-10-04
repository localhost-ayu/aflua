<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Income;
use App\Models\RecurringOccurrence;
use App\Services\RecurringOccurrenceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request, RecurringOccurrenceService $recurrences): JsonResponse
    {
        $period = $request->validate([
            'month' => ['sometimes', 'integer', 'between:1,12'],
            'year' => ['sometimes', 'integer', 'between:1,9999'],
        ]);
        $userId = $request->user()->id;
        $now = now();

        // Usa o mês/ano do request se enviado, senão usa o atual
        $month = (int) ($period['month'] ?? $now->month);
        $year = (int) ($period['year'] ?? $now->year);

        // 1. Total do mês selecionado
        $totalThisMonth = Expense::where('user_id', $userId)
            ->whereMonth('expense_date', $month)
            ->whereYear('expense_date', $year)
            ->sum('amount');

        $totalIncome = Income::where('user_id', $userId)
            ->whereMonth('received_at', $month)
            ->whereYear('received_at', $year)
            ->sum('amount');

        $expenseCents = $this->amountInCents($totalThisMonth);
        $incomeCents = $this->amountInCents($totalIncome);
        $realizedCents = $incomeCents - $expenseCents;

        $pending = RecurringOccurrence::query()
            ->where('year', $year)
            ->where('month', $month)
            ->where('status', 'pending')
            ->whereHas('rule', fn ($query) => $query->where('user_id', $userId)->where('active', true))
            ->with('rule.category:id,name,color')
            ->get()
            ->filter(function ($occurrence) use ($recurrences, $year, $month) {
                $dueDate = $recurrences->effectiveDate($occurrence->rule, $year, $month);

                // The manually created first cycle can use a different day from future cycles.
                return $dueDate->startOfMonth()->greaterThanOrEqualTo($occurrence->rule->starts_on->toImmutable()->startOfMonth())
                    && (! $occurrence->rule->ends_on || $dueDate->lessThanOrEqualTo($occurrence->rule->ends_on));
            })
            ->map(fn ($occurrence) => [
                'id' => $occurrence->id,
                'rule_id' => $occurrence->recurring_rule_id,
                'type' => $occurrence->rule->type,
                'description' => $occurrence->rule->description,
                'amount' => $occurrence->rule->amount,
                'due_date' => $recurrences->effectiveDate($occurrence->rule, $year, $month)->toDateString(),
                'category' => $occurrence->rule->category,
            ])
            ->sortBy('due_date')
            ->values();

        $pendingIncomes = $pending->where('type', 'income')->values();
        $pendingExpenses = $pending->where('type', 'expense')->values();
        $pendingIncomeCents = $pendingIncomes->sum(fn ($item) => $this->amountInCents($item['amount']));
        $pendingExpenseCents = $pendingExpenses->sum(fn ($item) => $this->amountInCents($item['amount']));

        // 2. Gastos por categoria no mês selecionado
        $byCategory = Expense::where('user_id', $userId)
            ->whereMonth('expense_date', $month)
            ->whereYear('expense_date', $year)
            ->select('category_id', DB::raw('SUM(amount) as total'))
            ->with('category:id,name,color')
            ->groupBy('category_id')
            ->orderBy('total', 'desc')
            ->get()
            ->map(fn ($item) => [
                'category' => $item->category->name,
                'color' => $item->category->color,
                'total' => (float) $item->total,
            ]);

        $lastSixMonths = $this->history($userId, $year, $month);

        return response()->json([
            'month' => $month,
            'year' => $year,
            'total_this_month' => $expenseCents / 100,
            'total_income' => $incomeCents / 100,
            'net_balance' => $realizedCents / 100,
            'realized_balance' => $realizedCents / 100,
            'projected_balance' => ($realizedCents + $pendingIncomeCents - $pendingExpenseCents) / 100,
            'pending_income' => $pendingIncomeCents / 100,
            'pending_expense' => $pendingExpenseCents / 100,
            'pending_incomes' => $pendingIncomes,
            'pending_expenses' => $pendingExpenses,
            'by_category' => $byCategory,
            'last_six_months' => $lastSixMonths,
        ]);
    }

    private function history(int $userId, int $year, int $month): array
    {
        $end = CarbonImmutable::create($year, $month, 1)->endOfMonth();
        $start = $end->startOfMonth()->subMonths(5);
        $expenses = Expense::where('user_id', $userId)
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->get(['amount', 'expense_date'])
            ->groupBy(fn ($entry) => $entry->expense_date->format('Y-n'));
        $incomes = Income::where('user_id', $userId)
            ->whereBetween('received_at', [$start->toDateString(), $end->toDateString()])
            ->get(['amount', 'received_at'])
            ->groupBy(fn ($entry) => $entry->received_at->format('Y-n'));
        $history = [];

        for ($offset = 0; $offset < 6; $offset++) {
            $date = $start->addMonths($offset);
            $key = $date->format('Y-n');
            $expenseCents = ($expenses->get($key) ?? collect())->sum(fn ($entry) => $this->amountInCents($entry->amount));
            $incomeCents = ($incomes->get($key) ?? collect())->sum(fn ($entry) => $this->amountInCents($entry->amount));
            $history[] = [
                'year' => $date->year,
                'month' => $date->month,
                'total' => $expenseCents / 100,
                'total_expenses' => $expenseCents / 100,
                'total_income' => $incomeCents / 100,
                'realized_balance' => ($incomeCents - $expenseCents) / 100,
            ];
        }

        return $history;
    }

    private function amountInCents(string|int|float $amount): int
    {
        $decimal = is_string($amount) ? $amount : number_format($amount, 2, '.', '');
        [$units, $fraction] = array_pad(explode('.', $decimal, 2), 2, '0');

        return (int) $units * 100 + (int) str_pad($fraction, 2, '0');
    }
}
