<?php

namespace App\Http\Controllers;

use App\Models\Income;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class IncomeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'month' => ['sometimes', 'integer', 'between:1,12'],
            'year' => ['sometimes', 'integer', 'between:1,9999'],
        ]);

        $query = $request->user()->incomes();

        if (isset($filters['month'])) {
            $query->whereMonth('received_at', $filters['month']);
        }

        if (isset($filters['year'])) {
            $query->whereYear('received_at', $filters['year']);
        }

        return response()->json($query->orderByDesc('received_at')->orderByDesc('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $income = $request->user()->incomes()->create($request->validate($this->rules()));

        return response()->json($income, 201);
    }

    public function show(Income $income): JsonResponse
    {
        Gate::authorize('view', $income);

        return response()->json($income);
    }

    public function update(Request $request, Income $income): JsonResponse
    {
        Gate::authorize('update', $income);
        $income->update($request->validate($this->rules(true)));

        return response()->json($income);
    }

    public function destroy(Income $income): JsonResponse
    {
        Gate::authorize('delete', $income);
        $income->delete();

        return response()->json(null, 204);
    }

    private function rules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'description' => [$required, 'string', 'max:255'],
            'amount' => [$required, 'numeric', 'min:0.01', 'max:99999999.99', 'decimal:0,2'],
            'received_at' => [$required, 'date_format:Y-m-d'],
        ];
    }
}
