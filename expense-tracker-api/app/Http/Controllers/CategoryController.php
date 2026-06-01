<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    // Apenas listagem, categorias são pré-definidas, o usuário não cria nem edita
    public function index(): JsonResponse
    {
        $categories = Category::orderBy('name')->get();

        return response()->json($categories);
    }
}