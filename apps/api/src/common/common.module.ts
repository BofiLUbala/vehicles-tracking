import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Regroupe les protections transverses (config throttling). Les guards globaux
 * (Throttler, JwtAuthGuard, RolesGuard) sont enregistrés dans AppModule, dans cet ordre précis,
 * car JwtAuthGuard doit peupler req.user avant que RolesGuard ne puisse le lire.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
  exports: [ThrottlerModule],
})
export class CommonModule {}
