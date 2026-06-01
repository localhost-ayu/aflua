<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $now    = now();

        // Usa o mês/ano do request se enviado, senão usa o atual
        $month = $request->filled('month') ? (int) $request->month : $now->month;
        $year  = $request->filled('year')  ? (int) $request->year  : $now->year;

        // 1. Total do mês selecionado
        $totalThisMonth = Expense::where('user_id', $userId)
            ->whereMonth('expense_date', $month)
            ->whereYear('expense_date', $year)
            ->sum('amount');

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
            ->select(
                DB::raw('YEAR(expense_date) as year'),
                DB::raw('MONTH(expense_date) as month'),
                DB::raw('SUM(amount) as total')
            )
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(fn($item) => [
                'label' => $this->monthLabel($item->month, $item->year),
                'total' => (float) $item->total,
            ]);

        return response()->json([
            'total_this_month' => (float) $totalThisMonth,
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