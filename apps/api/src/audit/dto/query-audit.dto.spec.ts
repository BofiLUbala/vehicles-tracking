import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryAuditDto } from './query-audit.dto';

describe('QueryAuditDto', () => {
  it('convertit les paramètres de pagination URL en nombres entiers', async () => {
    const dto = plainToInstance(QueryAuditDto, { limit: '50', offset: '0' });

    expect(dto.limit).toBe(50);
    expect(dto.offset).toBe(0);
    expect(await validate(dto)).toHaveLength(0);
  });
});
