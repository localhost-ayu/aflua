<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Income;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $period = $request->validate([
            'month' => ['sometimes', 'integer', 'between:1,12'],
            'year' => ['sometimes', 'integer', 'between:1,9999'],
        ]);
        $userId = $request->user()->id;
        $now    = now();

        // Usa o mês/ano do request se enviado, senão usa o atual
        $month = (int) ($period['month'] ?? $now->month);
        $year  = (int) ($period['year'] ?? $now->year);

        // 1. Total do mês selecionado
        $totalThisMonth = Expense::where('user_id', $userId)
            ->whereMonth('expense_date', $month)
            ->whereYear('expense_date', $year)
            ->sum('amount');

        $totalIncome = Income::where('user_id', $userId)
            ->whereMonth('received_at', $month)
            ->whereYear('received_at', $year)
            ->sum('amount');

        $expenseCents = (int) round($totalThisMonth * 100);
        $incomeCents = (int) round($totalIncome * 100);

        // 2. Gastos por categoria no mês selecionado
        $byCategory = Expense::where('user_id', $userId)
            ->whereMonth('expense_date', $month)
            ->whereYear('expense_date', $year)
            ->select('category_id', DB::raw('SUM(amount) as total'))
            ->with('category:id,name,color')
            ->groupBy('category_id')
            ->orderBy('total', 'desc')
            ->get()
            ->map(fn($item) => [
                'category' => $item->category->name,
                'color'    => $item->category->color,
                'total'    => (float) $item->total,
            ]);

        // 3. Últimos 6 meses (sempre fixo, independe do filtro)
        $lastSixMonths = Expense::where('user_id', $userId)
            ->where('expense_date', '>=', $now->copy()->subMonths(5)->startOfMonth())
            ->orderBy('expense_date')
            ->get()
            ->groupBy(fn ($expense) => $expense->expense_date->format('Y-n'))
            ->map(function ($expenses) {
                $date = $expenses->first()->expense_date;

                return [
                    'label' => $this->monthLabel($date->month, $date->year),
                    'total' => $expenses->sum(fn ($expense) => (int) round($expense->amount * 100)) / 100,
                ];
            })
            ->values();

        return response()->json([
            'total_this_month' => $expenseCents / 100,
            'total_income'     => $incomeCents / 100,
            'net_balance'      => ($incomeCents - $expenseCents) / 100,
            'by_category'      => $byCategory,
            'last_six_months'  => $lastSixMonths,
        ]);
    }

    private function monthLabel(int $month, int $year): string
    {
        $months = [
            1  => 'Jan', 2  => 'Fev', 3  => 'Mar',
            4  => 'Abr', 5  => 'Mai', 6  => 'Jun',
            7  => 'Jul', 8  => 'Ago', 9  => 'Set',
            10 => 'Out', 11 => 'Nov', 12 => 'Dez',
        ];

        return $months[$month] . '/' . substr($year, 2);
    }
}
