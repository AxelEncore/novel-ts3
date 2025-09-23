import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbAdapter } from './database-adapter';

const databaseAdapter = dbAdapter;

interface AuthResult {
  success: boolean;
  user?: {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
  error?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Получаем токен из cookies или заголовка Authorization
    const cookieToken = request.cookies.get('auth-token')?.value || 
                       request.cookies.get('auth-token-client')?.value;
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    const token = cookieToken || headerToken;
    
    console.log('=== AUTH DEBUG START ===');
    console.log('Cookie token:', cookieToken ? cookieToken.substring(0, 30) + '...' : 'null');
    console.log('Header token:', headerToken ? headerToken.substring(0, 30) + '...' : 'null');
    console.log('Final token:', token ? token.substring(0, 30) + '...' : 'null');
    console.log('All cookies:', request.cookies.getAll().map(c => c.name));
    console.log('Auth header:', authHeader);
    console.log('=== AUTH DEBUG CONTINUE ===');
    if (!token) {
      console.log('❌ No auth token found in cookies or headers');
      return {
        success: false,
        error: 'Токен не найден'
      };
    }

    // Проверка JWT токена
    let decoded: any;
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ JWT decoded successfully:', { userId: decoded.userId, email: decoded.email });
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      return { success: false, error: 'Недействительный токен' };
    }

    // Проверяем сессию в базе данных
    console.log('🔍 Checking session in database...');
    try {
      await databaseAdapter.initialize();
    } catch (dbInitError: any) {
      console.error('❌ Database init failed:', dbInitError);
      // Dev fallback: allow JWT-only auth when explicitly enabled
      if (process.env.AUTH_JWT_ONLY === 'true') {
        console.warn('⚠️ AUTH_JWT_ONLY enabled - proceeding with JWT-only auth without DB session check');
        return {
          success: true,
          user: {
            userId: String((decoded as any).userId),
            email: (decoded as any).email || 'unknown@example.com',
            role: (decoded as any).role || 'user',
            name: (decoded as any).name || ((decoded as any).email?.split?.('@')?.[0] || 'User')
          }
        };
      }
      throw dbInitError;
    }

    try {
        // Ищем сессию через адаптер
         const session = await databaseAdapter.getSessionByToken(token);
         
         console.log('Session query result:', session ? {
           user_id: session.user_id,
           expires_at: session.expires_at,
           created_at: session.created_at,
           is_expired: new Date(session.expires_at) < new Date()
         } : 'null');
         
         if (!session || new Date(session.expires_at) < new Date()) {
           console.log('❌ Session not found or expired');
           return { success: false, error: 'Сессия не найдена или истекла' };
         }

         console.log('✅ Valid session found:', { userId: session.user_id, expiresAt: session.expires_at });

         // Verify that the JWT userId matches the session user_id
         if (decoded.userId !== session.user_id) {
           console.log('❌ JWT userId does not match session user_id');
           return { success: false, error: 'Несоответствие данных токена и сессии' };
         }

       // Получаем пользователя через адаптер
       const user = await databaseAdapter.getUserById(session.user_id);

      if (!user) {
        return { success: false, error: 'Пользователь не найден' };
      }

      // Проверяем статус одобрения пользователя
      console.log('User data:', user);
      console.log('User approval_status:', user.approval_status, 'type:', typeof user.approval_status);
      console.log('User isApproved:', user.isApproved, 'type:', typeof user.isApproved);
      console.log('User role:', user.role);
      
      // Используем approval_status для PostgreSQL или isApproved для других БД
      const isApproved = user.approval_status !== undefined ? user.approval_status === 'approved' : 
                        user.isApproved !== undefined ? Boolean(user.isApproved) : true;
      console.log('Final isApproved:', isApproved);
      
      if (!isApproved && user.role !== 'admin') {
        console.log('User not approved and not admin');
        return {
          success: false,
          error: 'Пользователь не одобрен'
        };
      }

      return {
        success: true,
        user: {
          userId: String(user.id),
          email: user.email,
          role: user.role,
          name: user.name
        }
      };
    } catch (error) {
      console.error('Auth error:', error);
      return { success: false, error: 'Ошибка аутентификации' };
    }

  } catch (error) {
    console.error('Ошибка проверки аутентификации:', error);
    return {
      success: false,
      error: 'Внутренняя ошибка сервера'
    };
  }
}

// Проверка прав доступа к проекту
export async function verifyProjectAccess(
  userId: string, 
  projectId: string, 
  requiredRole?: 'owner' | 'admin' | 'member'
): Promise<{ hasAccess: boolean; userRole?: string }> {
  try {
    await databaseAdapter.initialize();

    // Получаем проекты через адаптер
     const projects = await databaseAdapter.getAllProjects();
     const project = projects.find(p => p.id === projectId);

     if (!project) {
       return { hasAccess: false };
     }

     // Проверяем, является ли пользователь владельцем
     if (project.created_by === userId) {
       return { hasAccess: true, userRole: 'owner' };
     }

     // Получаем участников проекта через getUserProjects
     const userProjects = await databaseAdapter.getUserProjects(userId);
     const hasAccess = userProjects.some((p: any) => p.id === projectId);

    if (!hasAccess) {
       return { hasAccess: false };
     }

     // Для упрощения, считаем что у пользователя есть доступ как участник
     const userRole = 'member';

     // Проверка требуемой роли
    if (requiredRole) {
      const roleHierarchy = { owner: 3, admin: 2, member: 1 };
      const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole];
      
      if (userRoleLevel < requiredRoleLevel) {
        return { hasAccess: false, userRole };
      }
    }

    return { hasAccess: true, userRole };

  } catch (error) {
    console.error('Ошибка проверки доступа к проекту:', error);
    return { hasAccess: false };
  }
}

// Middleware для проверки роли администратора
export async function requireAdmin(request: NextRequest) {
  const authResult = await verifyAuth(request);
  
  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  if (authResult.user!.role !== 'admin') {
    return { success: false, error: 'Требуются права администратора' };
  }

  return { success: true, user: authResult.user };
}