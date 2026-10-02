<?php

namespace App\Http\Controllers;

use App\Models\RecurringRule;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class RecurringRuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->recurringRules()->with('category')->latest('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules($request));
        $firstDate = CarbonImmutable::parse($data['starts_on']);

        $rule = DB::transaction(function () use ($request, $data, $firstDate) {
            $rule = $request->user()->recurringRules()->create($data);
            $entry = $rule->type === 'expense'
                ? $request->user()->expenses()->create([
                    'category_id' => $rule->category_id,
                    'description' => $rule->description,
                    'amount' => $rule->amount,
                    'expense_date' => $data['starts_on'],
                ])
                : $request->user()->incomes()->create([
                    'description' => $rule->description,
                    'amount' => $rule->amount,
                    'received_at' => $data['starts_on'],
                ]);

            $rule->occurrences()->create([
                'year' => $firstDate->year,
                'month' => $firstDate->month,
                'status' => 'confirmed',
                $rule->type === 'expense' ? 'linked_expense_id' : 'linked_income_id' => $entry->id,
            ]);

            return $rule;
        });

        return response()->json($rule->load('category', 'occurrences'), 201);
    }

    public function update(Request $request, RecurringRule $recurringRule): JsonResponse
    {
        Gate::authorize('update', $recurringRule);
        $data = $request->validate($this->rules($request, $recurringRule));
        $recurringRule->update($data);

        return response()->json($recurringRule->load('category'));
    }

    private function rules(Request $request, ?RecurringRule $rule = null): array
    {
        $required = $rule ? 'sometimes' : 'required';
        $type = $rule?->type ?? $request->input('type');

        return [
            'type' => $rule ? ['prohibited'] : ['required', Rule::in(['expense', 'income'])],
            'description' => [$required, 'string', 'max:255'],
            'amount' => [$required, 'numeric', 'min:0.01', 'max:99999999.99', 'decimal:0,2'],
            'day_of_month' => [$required, 'integer', 'between:1,31'],
            'category_id' => $type === 'expense'
                ? [$rule ? 'sometimes' : 'required', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)]
                : ['prohibited'],
            'starts_on' => $rule ? ['prohibited'] : ['required', 'date_format:Y-m-d'],
            'ends_on' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:'.($rule ? $rule->starts_on->toDateString() : 'starts_on')],
            'active' => $rule ? ['sometimes', 'boolean'] : ['prohibited'],
            'auto_confirm' => ['sometimes', 'boolean'],
        ];
    }
}
