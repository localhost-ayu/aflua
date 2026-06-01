<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table){
            $table->id();
            $table->string('name'); //nome da categoria
            $table->string('color', 7); //hex pra cor do gráfico
            $table->string('icon', 50)->nullable(); //opcional, pra ui
            $table->timestamps();

        });
    }
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
