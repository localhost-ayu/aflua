<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Services\EntryRecurrenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()
                         ->expenses()
                         ->with('category', 'recurringOccurrence.rule'); // eager loading — evita N+1

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
        $expense->load('category', 'recurringOccurrence.rule');

        return response()->json($expense, 201);
    }

    public function show(Request $request, Expense $expense): JsonResponse
    {
        if ($request->user()->id !== $expense->user_id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $expense->load('category', 'recurringOccurrence.rule');

        return response()->json($expense);
    }

    public function update(Request $request, Expense $expense, EntryRecurrenceService $recurrences): JsonResponse
    {
        if ($request->user()->id !== $expense->user_id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $validated = $request->validate([
            'category_id'  => ['sometimes', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)],
            'amount'       => 'sometimes|numeric|min:0.01|max:99999999.99|decimal:0,2',
            'description'  => 'sometimes|string|max:255',
            'expense_date' => 'sometimes|date',
            'recurrence' => ['sometimes', 'array'],
            'recurrence.enabled' => ['required_with:recurrence', 'boolean'],
            'recurrence.day_of_month' => ['required_if:recurrence.enabled,true', 'integer', 'between:1,31'],
            'recurrence.auto_confirm' => ['sometimes', 'boolean'],
        ]);

        $recurrence = $validated['recurrence'] ?? null;
        unset($validated['recurrence']);
        $recurrences->update($expense, $validated, $recurrence);
        $expense->load('category', 'recurringOccurrence.rule');

        return response()->json($expense);
    }

    public function destroy(Request $request, Expense $expense, EntryRecurrenceService $recurrences): JsonResponse
    {
        if ($request->user()->id !== $expense->user_id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $data = $request->validate(['occurrence_action' => ['sometimes', Rule::in(['pending', 'skipped'])]]);
        $recurrences->delete($expense, $data['occurrence_action'] ?? 'skipped');

        return response()->json(null, 204);
    }
}
