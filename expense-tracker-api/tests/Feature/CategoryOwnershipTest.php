<?php

namespace Tests\Feature;

use App\Models\User;
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

    public function test_users_can_manage_even_default_categories_without_affecting_other_accounts(): void
    {
        $ana = User::factory()->create();
        $bia = User::factory()->create();
        DefaultCategories::createFor($ana);
        DefaultCategories::createFor($bia);

        $anaCategory = $ana->categories()->firstOrFail();
        $biaCategory = $bia->categories()->where('name', $anaCategory->name)->firstOrFail();

        $this->actingAs($ana, 'sanctum')
            ->putJson("/api/categories/{$anaCategory->id}", [
                'name' => 'Mercado',
                'color' => '#123ABC',
            ])->assertOk()->assertJsonPath('color', '#123ABC');

        $this->assertSame($biaCategory->name, $biaCategory->fresh()->name);
        $this->deleteJson("/api/categories/{$anaCategory->id}")->assertNoContent();
        $this->assertModelExists($biaCategory);
    }

    public function test_a_user_cannot_view_edit_or_delete_another_users_category(): void
    {
        $ana = User::factory()->create();
        $bia = User::factory()->create();
        DefaultCategories::createFor($ana);
        DefaultCategories::createFor($bia);
        $foreignCategory = $bia->categories()->firstOrFail();

        $this->actingAs($ana, 'sanctum');
        $this->getJson('/api/categories')->assertOk()->assertJsonMissing(['id' => $foreignCategory->id]);
        $this->getJson("/api/categories/{$foreignCategory->id}")->assertForbidden();
        $this->putJson("/api/categories/{$foreignCategory->id}", ['name' => 'Changed'])->assertForbidden();
        $this->deleteJson("/api/categories/{$foreignCategory->id}")->assertForbidden();
        $this->assertModelExists($foreignCategory);
    }

    public function test_new_category_gets_palette_color_and_color_can_be_changed(): void
    {
        $user = User::factory()->create();
        DefaultCategories::createFor($user);
        $this->actingAs($user, 'sanctum');

        $created = $this->postJson('/api/categories', ['name' => 'Pets'])
            ->assertCreated()
            ->assertJsonPath('color', DefaultCategories::colorAt(count(DefaultCategories::definitions())))
            ->json();

        $this->putJson("/api/categories/{$created['id']}", ['color' => '#abcdef'])
            ->assertOk()->assertJsonPath('color', '#abcdef');

        $this->postJson('/api/categories', ['name' => 'Invalid', 'color' => 'red'])->assertUnprocessable();
    }

    public function test_category_with_expenses_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        DefaultCategories::createFor($user);
        $category = $user->categories()->firstOrFail();
        $this->actingAs($user, 'sanctum');

        $this->postJson('/api/expenses', [
            'category_id' => $category->id,
            'amount' => '12.50',
            'description' => 'Lunch',
            'expense_date' => '2026-09-27',
        ])->assertCreated();

        $this->deleteJson("/api/categories/{$category->id}")
            ->assertStatus(409)->assertJsonPath('message', 'category_in_use');
        $this->assertModelExists($category);
    }
}
