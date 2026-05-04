import { AuthService } from '@/src/domains/auth/services/auth.service';
import { UnauthorizedError, ForbiddenError } from '@/src/shared/errors/app-errors';

type Role = 'ADMIN' | 'FINANCE' | 'SUPPORT' | 'USER';

export async function requireRole(...roles: Role[]) {
  const user = await AuthService.getSessionUser();
  if (!user) throw new UnauthorizedError();
  
  // Fetch role from DB (or store in session)
  const { default: prisma } = await import('@/src/shared/database/prisma');
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (!record || !roles.includes(record.role as Role)) {
    throw new ForbiddenError('Insufficient privileges');
  }
  return user;
}