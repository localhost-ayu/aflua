<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\RecurringOccurrenceService;
use Carbon\CarbonImmutable;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('recurrences:process', function (RecurringOccurrenceService $service) {
    $confirmed = $service->processDue(CarbonImmutable::today());
    $this->info("Auto-confirmed {$confirmed} recurring occurrences.");
})->purpose('Prepare and auto-confirm due recurring occurrences');

Schedule::command('recurrences:process')->dailyAt('00:10')->withoutOverlapping();
