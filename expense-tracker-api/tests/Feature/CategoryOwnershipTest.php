<?php

namespace Tests\Feature;

use App\Support\DefaultCategories;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CategoryOwnershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_clones_independent_default_categories_for_each_user(): void
    {
        $first = $this->postJson('/api/register', [
            'name' => 'Ana',
            'email' => 'ana@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()->json();

        $second = $this->postJson('/api/register', [
            'name' => 'Bia',
            'email' => 'bia@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()->json();

        $firstCategories = $this->withToken($first['token'])->getJson('/api/categories')->assertOk()->json();
        $secondCategories = DB::table('categories')->where('user_id', $second['user']['id'])->get()->map(fn ($category) => (array) $category)->all();

        $this->assertCount(count(DefaultCategories::definitions()), $firstCategories);
        $this->assertCount(count(DefaultCategories::definitions()), $secondCategories);
        $this->assertEqualsCanonicalizing(
            array_column($firstCategories, 'name'),
            array_column($secondCategories, 'name'),
        );
        $this->assertEmpty(array_intersect(
            array_column($firstCategories, 'id'),
            array_column($secondCategories, 'id'),
        ));
        $this->assertSame(DefaultCategories::colorAt(0), DefaultCategories::colorAt(count(DefaultCategories::COLORS)));
        $this->assertNotSame(DefaultCategories::colorAt(0), DefaultCategories::colorAt(1));

        $this->postJson('/api/expenses', [
            'category_id' => $secondCategories[0]['id'],
            'amount' => '12.50',
            'description' => 'Wrong owner',
            'expense_date' => '2026-09-27',
        ])->assertUnprocessable();
    }

}
