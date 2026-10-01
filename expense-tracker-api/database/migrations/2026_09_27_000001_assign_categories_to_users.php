<?php

use App\Models\User;
use App\Support\DefaultCategories;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $userIds = DB::table('users')->orderBy('id')->pluck('id');
        $legacyCategories = DB::table('categories')->orderBy('id')->get();

        // A fresh installation has no users. Legacy global categories have no owner
        // and no expenses in that case, so they must not survive the migration.
        if ($userIds->isEmpty()) {
            DB::table('categories')->delete();
        }

        Schema::table('categories', function (Blueprint $table) use ($userIds) {
            $column = $table->foreignId('user_id');

            // Existing rows temporarily belong to the first user while each
            // remaining user's copies and expense references are migrated.
            if ($userIds->isNotEmpty()) {
                $column->default($userIds->first());
            }

            $column->constrained()->cascadeOnDelete();
        });

        if ($legacyCategories->isEmpty()) {
            User::query()->each(fn (User $user) => DefaultCategories::createFor($user));
        } else {
            foreach ($legacyCategories as $index => $category) {
                DB::table('categories')->where('id', $category->id)->update([
                    'color' => DefaultCategories::colorForName($category->name, $index),
                ]);
            }

            foreach ($userIds->skip(1) as $userId) {
                foreach ($legacyCategories as $index => $category) {
                    $newCategoryId = DB::table('categories')->insertGetId([
                        'user_id' => $userId,
                        'name' => $category->name,
                        'color' => DefaultCategories::colorForName($category->name, $index),
                        'icon' => $category->icon,
                        'created_at' => $category->created_at,
                        'updated_at' => $category->updated_at,
                    ]);

                    DB::table('expenses')
                        ->where('user_id', $userId)
                        ->where('category_id', $category->id)
                        ->update(['category_id' => $newCategoryId]);
                }
            }
        }

        // Drop the temporary default: every newly created category must name
        // its owner explicitly, even when this migration upgraded existing data.
        if ($userIds->isNotEmpty()) {
            Schema::table('categories', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->change();
            });
        }
    }

    public function down(): void
    {
        throw new LogicException('Category ownership cannot be rolled back without losing independent user edits.');
    }
};
