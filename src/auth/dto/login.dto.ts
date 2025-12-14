import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO Login
 * login peut être un téléphone ou un email
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Le login (téléphone ou email) est requis' })
  login!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password!: string;
}
