import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) throw new ForbiddenException('Not authenticated');

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user?.is_admin) throw new ForbiddenException('Admin access required');

    return true;
  }
}
