import { IsString, IsNumber, IsPositive, Max } from "class-validator";
export class CreateStorageDto {
    @IsString()
    name: string;
    @IsNumber()
    @IsPositive()
    @Max(30)
    roomWidth: number;
    @IsNumber()
    @IsPositive()
    @Max(30)
    roomDepth: number;
    @IsNumber()
    @IsPositive()
    @Max(5)
    roomHeight: number;
}
