<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\RecurringOccurrence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()
                         ->expenses()
                         ->with('category'); // eager loading — evita N+1

        // Filtro por categoria
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $hasMonth = $request->filled('month');
        $hasYear  = $request->filled('year');

        if ($hasMonth) {
            $query->whereMonth('expense_date', (int) $request->month);
        }

        if ($hasYear) {
            $query->whereYear('expense_date', (int) $request->year);
        }

        if (!$hasMonth && !$hasYear) {
            // Sem filtro de período — não aplica nada
        }

        $expenses = $query->orderBy('expense_date', 'desc')->get();

        return response()->json($expenses);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id'  => ['required', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)],
            'amount'       => 'required|numeric|min:0.01',
            'description'  => 'required|string|max:255',
            'expense_date' => 'required|date',
        ]);

        $expense = $request->user()->expenses()->create($validated);

        // Carrega a categoria para retornar o objeto completo
        $expense->load('category');

        return response()->json($expense, 201);
    }

    public function show(Request $request, Expense $expense): JsonResponse
    {
        if ($request->user()->id !== $expense->user_id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $expense->load('category');

        return response()->json($expense);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        if ($request->user()->id !== $expense->user_id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $validated = $request->validate([
            'category_id'  => ['sometimes', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)],
            'amount'       => 'sometimes|numeric|min:0.01',
            'description'  => 'sometimes|string|max:255',
            'expense_date' => 'sometimes|date',
        ]);

        $expense->update($validated);
        $expense->load('category');

        return response()->json($expense);
    }

    public function destroy(Request $request, Expense $expense): JsonResponse
    {
        if ($request->user()->id !== $expense->user_id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if (RecurringOccurrence::where('linked_expense_id', $expense->id)->exists()) {
            return response()->json(['message' => 'recurring_entry_in_use'], 409);
        }

        $expense->delete();

        return response()->json(null, 204);
    }
}
