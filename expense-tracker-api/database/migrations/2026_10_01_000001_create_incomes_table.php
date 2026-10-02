<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incomes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->date('received_at');
            $table->timestamps();

            $table->index(['user_id', 'received_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incomes');
    }
};
