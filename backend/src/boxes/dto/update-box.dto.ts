import { IsString, IsNumber, IsPositive, IsOptional } from "class-validator";

export class UpdateBoxDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sizeW?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sizeD?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sizeH?: number;
}
