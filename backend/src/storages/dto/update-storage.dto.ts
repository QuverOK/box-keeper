import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  Max,
} from "class-validator";
export class UpdateStorageDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(30)
  roomWidth?: number;
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(30)
  roomDepth?: number;
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(5)
  roomHeight?: number;
}
