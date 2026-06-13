import { IsString, IsNumber, IsPositive, IsOptional } from "class-validator";
export class CreateBoxDto {
  @IsString()
  name: string;
  @IsNumber()
  @IsPositive()
  sizeW: number;
  @IsNumber()
  @IsPositive()
  sizeD: number;
  @IsNumber()
  @IsPositive()
  sizeH: number;
  @IsOptional()
  @IsString()
  color?: string;
}
