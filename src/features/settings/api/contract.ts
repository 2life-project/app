/**
 * Профиль. Форма снята с живого ответа: в спеке этот объект выведен из кода
 * и приходит пустым.
 */
export type Profile = {
  userId: string;
  id: string;
  name: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  weightKg: number | null;
  /** Цели, которые человек ставит сам: сервер их хранит, а не вычисляет. */
  waterGoalMl: number | null;
  calorieGoal: number | null;
  proteinGoal: number | null;
  fatGoal: number | null;
  carbGoal: number | null;
  /** Профиль ещё не заполняли — сервер отдал значения по умолчанию. */
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
};
