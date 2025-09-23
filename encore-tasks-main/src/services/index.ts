import { api } from '@/lib/api';
import { ProjectService } from './ProjectService';

// Создаем и экспортируем экземпляр сервиса проектов
export const projectService = new ProjectService(api);

// Экспортируем также класс для возможности создания новых экземпляров
export { ProjectService } from './ProjectService';
export { api } from '@/lib/api';