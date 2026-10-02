<?php

namespace App\Http\Controllers;

use App\Models\RecurringOccurrence;
use App\Services\RecurringOccurrenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RecurringOccurrenceController extends Controller
{
    public function index(Request $request, RecurringOccurrenceService $service): JsonResponse
    {
        $period = $this->period($request);

        $occurrences = RecurringOccurrence::query()
            ->whereHas('rule', fn ($query) => $query->where('user_id', $request->user()->id))
            ->where('year', $period['year'])
            ->where('month', $period['month'])
            ->where(fn ($query) => $query->where('status', '!=', 'pending')
                ->orWhereHas('rule', fn ($rules) => $rules->where('active', true)))
            ->with(['rule.category', 'expense', 'income'])
            ->orderBy('id')
            ->get()
            ->filter(fn ($occurrence) => $occurrence->status !== 'pending'
                || ! $occurrence->rule->ends_on
                || $service->effectiveDate($occurrence->rule, $occurrence->year, $occurrence->month)
                    ->lessThanOrEqualTo($occurrence->rule->ends_on))
            ->values();

        return response()->json($occurrences);
    }

    public function prepare(Request $request, RecurringOccurrenceService $service): JsonResponse
    {
        $period = $this->period($request);
        $service->prepareForUser($request->user(), $period['year'], $period['month']);

        return $this->index($request, $service);
    }

    public function confirm(Request $request, RecurringOccurrence $occurrence, RecurringOccurrenceService $service): JsonResponse
    {
        $this->authorizeOccurrence($occurrence);
        $data = $request->validate([
            'amount' => ['sometimes', 'required', 'numeric', 'min:0.01', 'max:99999999.99', 'decimal:0,2'],
        ]);

        return response()->json($service->confirm($occurrence, $data['amount'] ?? null));
    }

    public function skip(RecurringOccurrence $occurrence, RecurringOccurrenceService $service): JsonResponse
    {
        $this->authorizeOccurrence($occurrence);

        return response()->json($service->skip($occurrence));
    }

    public function adjust(Request $request, RecurringOccurrence $occurrence, RecurringOccurrenceService $service): JsonResponse
    {
        $this->authorizeOccurrence($occurrence);
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:99999999.99', 'decimal:0,2'],
        ]);

        return response()->json($service->adjust($occurrence, $data['amount']));
    }

    public function undo(RecurringOccurrence $occurrence, RecurringOccurrenceService $service): JsonResponse
    {
        $this->authorizeOccurrence($occurrence);

        return response()->json($service->undoAutomatic($occurrence));
    }

    private function authorizeOccurrence(RecurringOccurrence $occurrence): void
    {
        Gate::authorize('view', $occurrence->rule);
    }

    private function period(Request $request): array
    {
        $data = $request->validate([
            'month' => ['required', 'integer', 'between:1,12'],
            'year' => ['required', 'integer', 'between:1,9999'],
        ]);

        return ['month' => (int) $data['month'], 'year' => (int) $data['year']];
    }
}
