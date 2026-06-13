import { IsNumber, IsOptional } from "class-validator";

export class MoveBoxDto {
  @IsOptional()
  @IsNumber()
  posX?: number | null;

  @IsOptional()
  @IsNumber()
  posY?: number | null;

  @IsOptional()
  @IsNumber()
  posZ?: number | null;
}
