<?php

namespace Tests\Feature;

use App\Support\DefaultCategories;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LegacyCategoryMigrationTest extends TestCase
{
    public function test_it_preserves_expenses_while_assigning_categories_to_each_user(): void
    {
        $previousConnection = DB::getDefaultConnection();
        config()->set('database.connections.category_legacy', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'foreign_key_constraints' => true,
        ]);
        DB::setDefaultConnection('category_legacy');

        try {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
            });
            Schema::create('categories', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('color', 7);
                $table->string('icon', 50)->nullable();
                $table->timestamps();
            });
            Schema::create('expenses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('category_id')->constrained()->restrictOnDelete();
                $table->decimal('amount', 10, 2);
                $table->string('description');
                $table->date('expense_date');
                $table->timestamps();
            });

            DB::table('users')->insert([['id' => 1], ['id' => 2]]);
            $legacyCategoryId = DB::table('categories')->insertGetId([
                'name' => 'Moradia',
                'color' => '#FFCE56',
                'icon' => 'home',
            ]);
            foreach ([1, 2] as $userId) {
                DB::table('expenses')->insert([
                    'user_id' => $userId,
                    'category_id' => $legacyCategoryId,
                    'amount' => '100.00',
                    'description' => 'Rent',
                    'expense_date' => '2026-09-01',
                ]);
            }

            $migration = require database_path('migrations/2026_09_27_000001_assign_categories_to_users.php');
            $migration->up();

            $categories = DB::table('categories')->orderBy('user_id')->get();
            $this->assertCount(2, $categories);
            $this->assertSame(DefaultCategories::colorForName('Moradia', 0), $categories[0]->color);
            foreach ([1, 2] as $userId) {
                $expense = DB::table('expenses')->where('user_id', $userId)->first();
                $category = DB::table('categories')->find($expense->category_id);
                $this->assertSame($userId, $category->user_id);
            }

            $this->expectException(QueryException::class);
            DB::table('categories')->insert(['name' => 'No owner', 'color' => '#123456']);
        } finally {
            DB::setDefaultConnection($previousConnection);
            DB::purge('category_legacy');
        }
    }
}
