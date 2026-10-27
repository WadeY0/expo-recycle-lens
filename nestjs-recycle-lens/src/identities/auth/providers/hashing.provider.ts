import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class HashingProvider {
  public abstract hashPassword(data: string | Buffer): Promise<string>;

  public abstract comparePassword(
    data: string | Buffer,
    encrypted: string,
  ): Promise<boolean>;
}
