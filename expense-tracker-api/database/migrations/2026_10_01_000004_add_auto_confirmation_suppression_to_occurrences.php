<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recurring_occurrences', function (Blueprint $table) {
            $table->boolean('auto_confirm_suppressed')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('recurring_occurrences', function (Blueprint $table) {
            $table->dropColumn('auto_confirm_suppressed');
        });
    }
};
