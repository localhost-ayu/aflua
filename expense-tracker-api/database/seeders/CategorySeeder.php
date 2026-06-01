<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Alimentação',  'color' => '#FF6384', 'icon' => 'utensils'],
            ['name' => 'Transporte',   'color' => '#36A2EB', 'icon' => 'car'],
            ['name' => 'Moradia',      'color' => '#FFCE56', 'icon' => 'home'],
            ['name' => 'Saúde',        'color' => '#4BC0C0', 'icon' => 'heart'],
            ['name' => 'Lazer',        'color' => '#9966FF', 'icon' => 'gamepad'],
            ['name' => 'Outros',       'color' => '#FF9F40', 'icon' => 'ellipsis'],
        ];

        DB::table('categories')->insert($categories);
    }
}