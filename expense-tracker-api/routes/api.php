<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\IncomeController;
use App\Http\Controllers\RecurringOccurrenceController;
use App\Http\Controllers\RecurringRuleController;
use Illuminate\Support\Facades\Route;

// Rotas públicas
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Rotas protegidas — exigem token Sanctum válido
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    Route::apiResource('/categories', CategoryController::class);

    Route::apiResource('/expenses', ExpenseController::class);

    Route::apiResource('/incomes', IncomeController::class);

    Route::get('/recurring-rules', [RecurringRuleController::class, 'index']);
    Route::post('/recurring-rules', [RecurringRuleController::class, 'store']);
    Route::patch('/recurring-rules/{recurringRule}', [RecurringRuleController::class, 'update']);

    Route::get('/recurring-occurrences', [RecurringOccurrenceController::class, 'index']);
    Route::post('/recurring-occurrences/prepare', [RecurringOccurrenceController::class, 'prepare']);
    Route::post('/recurring-occurrences/{occurrence}/confirm', [RecurringOccurrenceController::class, 'confirm']);
    Route::post('/recurring-occurrences/{occurrence}/skip', [RecurringOccurrenceController::class, 'skip']);
    Route::patch('/recurring-occurrences/{occurrence}/amount', [RecurringOccurrenceController::class, 'adjust']);
    Route::post('/recurring-occurrences/{occurrence}/undo', [RecurringOccurrenceController::class, 'undo']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
});
