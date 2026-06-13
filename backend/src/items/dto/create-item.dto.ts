import { IsString, IsOptional } from "class-validator";
export class CreateItemDto {
  @IsString()
  name: string;
  @IsString()
  category: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  photo?: string;
}
