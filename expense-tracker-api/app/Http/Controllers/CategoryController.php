<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Support\DefaultCategories;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $categories = $request->user()->categories()->orderBy('id')->get();

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        if (! isset($validated['color'])) {
            $categories = $request->user()->categories()->orderBy('id')->get();
            $index = $categories->count();
            $color = DefaultCategories::colorAt($index);

            if ($categories->last()?->color === $color) {
                $color = DefaultCategories::colorAt($index + 1);
            }

            $validated['color'] = $color;
        }

        return response()->json($request->user()->categories()->create($validated), 201);
    }

    public function show(Request $request, Category $category): JsonResponse
    {
        Gate::authorize('view', $category);

        return response()->json($category);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        Gate::authorize('update', $category);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'color' => ['sometimes', 'required', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        $category->update($validated);

        return response()->json($category);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        Gate::authorize('delete', $category);

        if ($category->expenses()->exists()) {
            return response()->json(['message' => 'category_in_use'], 409);
        }

        $category->delete();

        return response()->json(null, 204);
    }
}
