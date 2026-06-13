import { IsString, IsNumber, IsOptional, IsInt, Min } from "class-validator";
export class CreateLayoutLabelDto {
  @IsNumber()
  x: number;
  @IsNumber()
  y: number;
  @IsString()
  text: string;
  @IsOptional()
  @IsInt()
  @Min(8)
  fontSize?: number;
}
