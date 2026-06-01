<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');     // ← se o usuário for deletado, apaga as despesas
            $table->foreignId('category_id')
                  ->constrained()
                  ->onDelete('restrict');    // ← não deixa deletar categoria com despesas vinculadas
            $table->decimal('amount', 10, 2); // Ex: 99999999.99 — precisão para dinheiro
            $table->string('description');
            $table->date('expense_date');     // ← separado do created_at — o usuário informa a data real
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};