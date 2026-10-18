// app/Support/DefaultCategories.php: as categorias que todo usuário novo recebe

export const DEFAULT_CATEGORY_COLORS = ['#B66A5C', '#5F8D76', '#C59B4F', '#7771A2', '#5D8FA0', '#A9776E']

export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: 'utensils' },
  { name: 'Transporte', icon: 'car' },
  { name: 'Moradia', icon: 'home' },
  { name: 'Saúde', icon: 'heart' },
  { name: 'Lazer', icon: 'gamepad' },
  { name: 'Outros', icon: 'ellipsis' },
].map((category, index) => ({ ...category, color: DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length] }))
