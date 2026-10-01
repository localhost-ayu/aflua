<?php

namespace App\Support;

use App\Models\User;

final class DefaultCategories
{
    public const COLORS = [
        '#B66A5C',
        '#5F8D76',
        '#C59B4F',
        '#7771A2',
        '#5D8FA0',
        '#A9776E',
    ];

    private const CATEGORIES = [
        ['name' => 'Alimentação', 'icon' => 'utensils'],
        ['name' => 'Transporte', 'icon' => 'car'],
        ['name' => 'Moradia', 'icon' => 'home'],
        ['name' => 'Saúde', 'icon' => 'heart'],
        ['name' => 'Lazer', 'icon' => 'gamepad'],
        ['name' => 'Outros', 'icon' => 'ellipsis'],
    ];

    public static function definitions(): array
    {
        return array_map(
            fn (array $category, int $index) => [
                ...$category,
                'color' => self::colorAt($index),
            ],
            self::CATEGORIES,
            array_keys(self::CATEGORIES),
        );
    }

    public static function colorAt(int $index): string
    {
        return self::COLORS[$index % count(self::COLORS)];
    }

    public static function colorForName(string $name, int $fallbackIndex): string
    {
        foreach (self::CATEGORIES as $index => $category) {
            if ($category['name'] === $name) {
                return self::colorAt($index);
            }
        }

        return self::colorAt($fallbackIndex);
    }

    public static function createFor(User $user): void
    {
        if ($user->categories()->exists()) {
            return;
        }

        $user->categories()->createMany(self::definitions());
    }
}
