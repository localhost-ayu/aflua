<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Support\DefaultCategories;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        User::query()->each(fn (User $user) => DefaultCategories::createFor($user));
    }
}
