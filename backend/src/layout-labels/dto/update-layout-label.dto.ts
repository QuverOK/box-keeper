import { IsString, IsNumber, IsOptional, IsInt, Min } from "class-validator";

export class UpdateLayoutLabelDto {
  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsInt()
  @Min(8)
  fontSize?: number;
}
